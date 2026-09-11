//! 本地控制管道：`\\.\pipe\giantapp-wallpaper4`，JSON-lines 协议。
//! 所有启动模式（GUI / headless）都会启动，headless 化的核心控制面：
//! - 请求：`{"id":1,"method":"pause_wallpaper","params":{...}}`
//! - 响应：`{"id":1,"result":...}` 或 `{"id":1,"error":"..."}`
//! - 事件（主动推送）：`{"event":"playing-status-changed","data":...}`
//!
//! CLI（[`crate::cli`]）与外部脚本经由此通道驱动全部功能性命令；
//! 纯 GUI 的命令（文件夹选择对话框等）不在此暴露。

use crate::events::EventHub;
use serde_json::{json, Value};
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, BufWriter};
use tokio::net::windows::named_pipe::ServerOptions;
use tokio::sync::broadcast;

pub const PIPE_NAME: &str = r"\\.\pipe\giantapp-wallpaper4";

/// 启动管道服务循环（setup 时调用一次）。
pub fn start(app: tauri::AppHandle, hub: EventHub) {
    tauri::async_runtime::spawn(async move {
        if let Err(e) = serve(app, hub).await {
            log::error!("control pipe server exited: {e:#}");
        }
    });
}

async fn serve(app: tauri::AppHandle, hub: EventHub) -> anyhow::Result<()> {
    let mut server = ServerOptions::new()
        .first_pipe_instance(true)
        .create(PIPE_NAME)?;
    log::info!("control pipe listening: {PIPE_NAME}");

    loop {
        server.connect().await?;
        let client = server;
        server = ServerOptions::new().create(PIPE_NAME)?;
        let app = app.clone();
        let hub = hub.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_conn(client, app, hub).await {
                log::debug!("control connection closed: {e:#}");
            }
        });
    }
}

async fn handle_conn(
    pipe: tokio::net::windows::named_pipe::NamedPipeServer,
    app: tauri::AppHandle,
    hub: EventHub,
) -> anyhow::Result<()> {
    let (read_half, write_half) = tokio::io::split(pipe);
    let mut lines = BufReader::new(read_half).lines();
    let mut writer = BufWriter::new(write_half);
    let mut events = hub.subscribe();

    loop {
        tokio::select! {
            line = lines.next_line() => {
                let Some(line) = line? else { return Ok(()) };
                if line.trim().is_empty() {
                    continue;
                }
                let response = dispatch(&app, &line).await;
                writer.write_all(response.as_bytes()).await?;
                writer.write_all(b"\n").await?;
                writer.flush().await?;
            }
            ev = events.recv() => {
                match ev {
                    Ok(ev) => {
                        let payload = json!({ "event": ev.name, "data": ev.payload });
                        writer.write_all(payload.to_string().as_bytes()).await?;
                        writer.write_all(b"\n").await?;
                        writer.flush().await?;
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        log::debug!("control client lagged {n} events");
                    }
                    Err(broadcast::error::RecvError::Closed) => return Ok(()),
                }
            }
        }
    }
}

/// 处理一行请求 -> 一行响应。
async fn dispatch(app: &tauri::AppHandle, line: &str) -> String {
    let req: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(e) => return err_reply(None, format!("bad request: {e}")),
    };
    let id = req.get("id").cloned();
    let method = req.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let params = req.get("params").cloned().unwrap_or(Value::Null);

    match call(app, method, &params).await {
        Ok(value) => json!({ "id": id, "result": value }).to_string(),
        Err(e) => err_reply(id, e),
    }
}

fn err_reply(id: Option<Value>, error: String) -> String {
    json!({ "id": id, "error": error }).to_string()
}

fn screen_index(params: &Value) -> Option<i32> {
    params
        .get("screenIndex")
        .or_else(|| params.get("screen_index"))
        .and_then(|v| v.as_i64())
        .map(|v| v as i32)
}

fn normalize_screen_index(v: Option<i32>) -> Option<u32> {
    v.filter(|i| *i >= 0).map(|i| i as u32)
}

async fn call(app: &tauri::AppHandle, method: &str, params: &Value) -> Result<Value, String> {
    use std::ops::Deref;

    // 特殊控制方法（不依赖 AppState）
    match method {
        "app_info" => {
            let state = app.try_state::<crate::state::AppState>();
            let (headless, skin) = state
                .map(|s| {
                    (
                        s.headless,
                        crate::skin::active_skin_summary(&s.dirs),
                    )
                })
                .unwrap_or((false, String::new()));
            return Ok(json!({
                "name": "GiantappWallpaper",
                "version": crate::APP_VERSION,
                "headless": headless,
                "skin": skin,
                "pid": std::process::id(),
            }));
        }
        "ui.show" => {
            crate::show_main_window(app, None);
            return Ok(Value::Bool(true));
        }
        "app.quit" => {
            // 先让响应写回，再走正常退出清理
            let app = app.clone();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                crate::tray::quit(app);
            });
            return Ok(Value::Bool(true));
        }
        _ => {}
    }

    let st = app
        .try_state::<crate::state::AppState>()
        .ok_or("app state unavailable")?;
    let st = st.deref();

    match method {
        // ---- 壁纸 ----
        "get_playing_status" => Ok(serde_json::to_value(
            crate::commands::build_playing_status(app).await,
        )
        .unwrap_or_default()),
        "get_wallpapers" => {
            let list = crate::commands::get_wallpapers_inner(app).await?;
            Ok(serde_json::to_value(list).unwrap_or_default())
        }
        "get_screens" => Ok(serde_json::to_value(st.api.screens()).unwrap_or_default()),
        "show_wallpaper" => {
            let mut wallpaper: wallpaper_core::models::Wallpaper = serde_json::from_value(
                params
                    .get("wallpaper")
                    .cloned()
                    .ok_or("缺少 wallpaper")?,
            )
            .map_err(|e| format!("bad wallpaper: {e}"))?;
            crate::commands::resolve_wallpaper_urls(&st.dirs, &mut wallpaper);
            let screens = wallpaper.running_info.screen_indexes.clone();
            st.api.show_wallpaper(wallpaper, screens).await?;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "pause_wallpaper" => {
            st.api
                .pause_wallpaper(normalize_screen_index(screen_index(params)))
                .await;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "resume_wallpaper" => {
            st.api
                .resume_wallpaper(normalize_screen_index(screen_index(params)))
                .await;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "stop_wallpaper" => {
            st.api
                .stop_wallpaper(normalize_screen_index(screen_index(params)))
                .await;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "play_next_in_playlist" => {
            st.api
                .advance_playlist(1, normalize_screen_index(screen_index(params)))
                .await;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "play_prev_in_playlist" => {
            st.api
                .advance_playlist(-1, normalize_screen_index(screen_index(params)))
                .await;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "set_volume" => {
            let volume = params
                .get("volume")
                .and_then(|v| v.as_u64())
                .ok_or("缺少 volume")? as u32;
            st.api
                .set_volume(volume, screen_index(params).unwrap_or(-1))
                .await;
            st.api.save_snapshot().await;
            st.api.notify_change();
            Ok(Value::Bool(true))
        }
        "get_wallpaper_time" => {
            let t = st
                .api
                .wallpaper_time(normalize_screen_index(screen_index(params)))
                .await;
            Ok(serde_json::to_value(t).unwrap_or_default())
        }
        "set_progress" => {
            let progress = params
                .get("progress")
                .and_then(|v| v.as_f64())
                .ok_or("缺少 progress")?;
            st.api
                .set_progress(progress, normalize_screen_index(screen_index(params)))
                .await
                .map(|_| Value::Bool(true))
        }
        // ---- 配置 ----
        "get_config" => {
            let key = params
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("缺少 key")?;
            st.config.lock().get(key)
        }
        "set_config" => {
            let key = params
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("缺少 key")?
                .to_string();
            let value = params.get("value").cloned().ok_or("缺少 value")?;
            crate::commands::set_config_inner(app, &key, value)
                .await
                .map(|_| Value::Bool(true))
        }
        // ---- 下载 ----
        "get_download_status" => {
            Ok(serde_json::to_value(st.downloads.status_all().await).unwrap_or_default())
        }
        // ---- 其他 ----
        "get_mpv_status" => {
            Ok(serde_json::to_value(crate::commands::mpv_status_inner(st)).unwrap_or_default())
        }
        _ => Err(format!("unknown method: {method}")),
    }
}
