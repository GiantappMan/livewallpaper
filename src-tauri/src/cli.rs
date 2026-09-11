//! 命令行入口：动词式控制 + `--headless` 启动模式。
//!
//! ```text
//! giantapp-wallpaper.exe --headless        # 无窗口运行全功能引擎
//! giantapp-wallpaper.exe status            # 查看播放状态（连接运行中的实例）
//! giantapp-wallpaper.exe play 2            # 按列表序号播放
//! giantapp-wallpaper.exe volume 50
//! giantapp-wallpaper.exe ui                # 唤起主窗口（无实例时直接启动应用）
//! giantapp-wallpaper.exe help
//! ```
//!
//! 动词经本地控制管道（[`crate::control`]）发给已运行的实例；执行完即退出。
//! 深链参数（`livewallpaper4://...`）与未知首参不属于动词，按正常启动处理。

use serde_json::{json, Value};
use std::time::Duration;

const USAGE: &str = "\
GiantappWallpaper 命令行

启动:
  (无参数)                  启动图形界面
  --headless                无窗口运行（壁纸/播放列表/下载全功能，可随时用 ui 唤起界面）

控制（连接运行中的实例）:
  status                    查看播放状态
  list                      列出壁纸库
  play <序号>               播放指定壁纸（全部屏幕）
  pause | resume | stop     暂停 / 恢复 / 停止（所有屏幕）
  next | prev               播放列表下一项 / 上一项
  volume <0-100>            设置音量
  ui                        唤起主窗口（无运行实例时启动应用）
  quit                      退出应用（按配置保留壁纸）
";

pub enum CliOutcome {
    /// 参数已被处理（动词执行完 / help），进程直接退出。
    Handled,
    /// 继续正常启动应用（无动词，或 `ui` 且无运行实例）。
    LaunchApp,
}

/// 解析并执行 CLI 动词。返回 Handled 时调用方应立即 return。
pub fn dispatch(args: &[String]) -> CliOutcome {
    let Some(first) = args.first().map(|s| s.as_str()) else {
        return CliOutcome::LaunchApp;
    };
    // 深链 / 未知参数 -> 正常启动（单实例插件会转发给已运行实例）
    if first.starts_with(crate::DEEP_LINK_SCHEME) {
        return CliOutcome::LaunchApp;
    }
    match first {
        "--headless" => CliOutcome::LaunchApp,
        "-h" | "--help" | "help" => {
            print!("{USAGE}");
            CliOutcome::Handled
        }
        "status" | "list" | "pause" | "resume" | "stop" | "next" | "prev" => {
            let method = match first {
                "status" => "get_playing_status",
                "list" => "get_wallpapers",
                "pause" => "pause_wallpaper",
                "resume" => "resume_wallpaper",
                "stop" => "stop_wallpaper",
                "next" => "play_next_in_playlist",
                _ => "play_prev_in_playlist",
            };
            exec_verb(method, json!({}));
            CliOutcome::Handled
        }
        "volume" => match args.get(1).and_then(|v| v.parse::<u32>().ok()) {
            Some(volume) => {
                exec_verb("set_volume", json!({ "volume": volume.min(100) }));
                CliOutcome::Handled
            }
            None => {
                eprintln!("用法: volume <0-100>");
                std::process::exit(2);
            }
        },
        "play" => {
            let index = match args.get(1).and_then(|v| v.parse::<usize>().ok()) {
                Some(i) => i,
                None => {
                    eprintln!("用法: play <序号>（先用 list 查看）");
                    std::process::exit(2);
                }
            };
            play_by_index(index);
            CliOutcome::Handled
        }
        "ui" => match call_pipe("ui.show", json!({})) {
            Ok(_) => CliOutcome::Handled,
            // 没有运行中的实例：直接启动应用（即“打开主界面”）
            Err(e) => {
                log::info!("ui: no running instance ({e}), launching app");
                CliOutcome::LaunchApp
            }
        },
        "quit" => {
            exec_verb("app.quit", json!({}));
            CliOutcome::Handled
        }
        // 未知参数：不拦截，正常启动（保持深链 / 旧脚本兼容）
        _ => CliOutcome::LaunchApp,
    }
}

pub fn is_headless(args: &[String]) -> bool {
    args.iter().any(|a| a == "--headless")
}

fn exec_verb(method: &str, params: Value) {
    match call_pipe(method, params) {
        Ok(result) => {
            println!("{}", pretty_or_raw(method, &result));
        }
        Err(e) => {
            eprintln!("无运行中的 GiantappWallpaper 实例（{e}）");
            eprintln!("先运行 giantapp-wallpaper.exe 或 giantapp-wallpaper.exe --headless");
            std::process::exit(1);
        }
    }
}

/// status / list 输出人类可读摘要，其余输出原始 JSON。
fn pretty_or_raw(method: &str, result: &Value) -> String {
    match method {
        "get_wallpapers" => result
            .as_array()
            .map(|list| {
                if list.is_empty() {
                    return "(壁纸库为空)".to_string();
                }
                list.iter()
                    .enumerate()
                    .map(|(i, w)| {
                        format!(
                            "{:>3}: {} [{}] {}",
                            i,
                            w.get("meta").and_then(|m| m.get("title")).and_then(|t| t.as_str()).unwrap_or("(无标题)"),
                            w.get("meta").and_then(|m| m.get("type")).and_then(|t| t.as_u64()).unwrap_or(0),
                            w.get("filePath").and_then(|p| p.as_str()).unwrap_or("?")
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            })
            .unwrap_or_else(|| result.to_string()),
        "get_playing_status" => {
            let screens = result
                .get("screens")
                .and_then(|s| s.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            let playing = result
                .get("wallpapers")
                .and_then(|w| w.as_array())
                .map(|list| {
                    list.iter()
                        .filter_map(|w| {
                            Some(format!(
                                "screen {:?}: {}{}",
                                w.get("runningInfo").and_then(|r| r.get("screenIndexes")).and_then(|s| s.as_array()).map(|a| a.iter().filter_map(|v| v.as_u64()).collect::<Vec<_>>()).unwrap_or_default(),
                                w.get("meta").and_then(|m| m.get("title")).and_then(|t| t.as_str()).unwrap_or("?"),
                                if w.get("runningInfo").and_then(|r| r.get("isPaused")).and_then(|p| p.as_bool()).unwrap_or(false) { " (已暂停)" } else { "" }
                            ))
                        })
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            if playing.is_empty() {
                format!("屏幕数: {screens}，当前无播放中的壁纸")
            } else {
                format!("屏幕数: {screens}\n{}", playing.join("\n"))
            }
        }
        _ => serde_json::to_string_pretty(result).unwrap_or_else(|_| result.to_string()),
    }
}

fn play_by_index(index: usize) {
    let wallpapers = match call_pipe("get_wallpapers", json!({})) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("无运行中的 GiantappWallpaper 实例（{e}）");
            std::process::exit(1);
        }
    };
    let Some(wallpaper) = wallpapers.as_array().and_then(|list| list.get(index)) else {
        eprintln!("序号 {index} 不存在（用 list 查看，共 {} 项）", 
            wallpapers.as_array().map(|l| l.len()).unwrap_or(0));
        std::process::exit(2);
    };
    match call_pipe("show_wallpaper", json!({ "wallpaper": wallpaper })) {
        Ok(_) => println!("已开始播放第 {index} 项"),
        Err(e) => {
            eprintln!("播放失败: {e}");
            std::process::exit(1);
        }
    }
}

/// 连接控制管道执行一次请求（阻塞，带超时与短重试）。
fn call_pipe(method: &str, params: Value) -> Result<Value, String> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    rt.block_on(async move { call_pipe_async(method, params).await })
}

async fn call_pipe_async(method: &str, params: Value) -> Result<Value, String> {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    // 服务端在两次 accept 之间重建管道实例，短重试避开窗口期
    let mut pipe = None;
    for _ in 0..10 {
        match tokio::net::windows::named_pipe::ClientOptions::new()
            .open(crate::control::PIPE_NAME)
        {
            Ok(p) => {
                pipe = Some(p);
                break;
            }
            Err(_) => tokio::time::sleep(Duration::from_millis(100)).await,
        }
    }
    let mut pipe = pipe.ok_or("连接控制管道失败")?;

    let request = json!({ "id": 1, "method": method, "params": params });
    pipe.write_all(request.to_string().as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    pipe.write_all(b"\n").await.map_err(|e| e.to_string())?;
    pipe.flush().await.map_err(|e| e.to_string())?;

    let (reader, _) = tokio::io::split(pipe);
    let mut lines = BufReader::new(reader).lines();

    let deadline = tokio::time::sleep(Duration::from_secs(15));
    tokio::pin!(deadline);
    loop {
        tokio::select! {
            line = lines.next_line() => {
                let Some(line) = line.map_err(|e| e.to_string())? else {
                    return Err("管道已关闭".into());
                };
                let value: Value = serde_json::from_str(&line)
                    .map_err(|e| format!("bad response: {e}"))?;
                if value.get("event").is_some() {
                    continue; // 事件推送：跳过，等本次请求的响应
                }
                if let Some(error) = value.get("error").and_then(|e| e.as_str()) {
                    return Err(error.to_string());
                }
                return Ok(value.get("result").cloned().unwrap_or(Value::Null));
            }
            _ = &mut deadline => {
                return Err("等待响应超时".into());
            }
        }
    }
}
