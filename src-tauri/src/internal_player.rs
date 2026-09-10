//! 内嵌播放器 / Web 壁纸窗口控制器（EngineHost 实现）。
//! v3 中这是独立的播放器进程；v4 改为应用内 WebView 窗口，SetParent 到
//! WorkerW 嵌入桌面。零外部进程依赖，天然支持 web 壁纸。

use std::collections::HashMap;
use tauri::Listener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use wallpaper_core::host::EngineHost;
use wallpaper_core::models::TimePos;
use wallpaper_core::system::workerw;

const PLAYER_PREFIX: &str = "player-";
const WEB_PREFIX: &str = "web-";

#[derive(Default)]
struct WindowInfo {
    ready: Arc<AtomicBool>,
    time: parking_lot::Mutex<Option<TimePos>>,
}

pub struct InternalPlayerController {
    app: tauri::AppHandle,
    windows: parking_lot::Mutex<HashMap<String, Arc<WindowInfo>>>,
}

static INSTANCE: std::sync::OnceLock<Arc<InternalPlayerController>> = std::sync::OnceLock::new();

impl InternalPlayerController {
    pub fn new(app: tauri::AppHandle) -> Arc<Self> {
        let controller = Arc::new(Self {
            app,
            windows: parking_lot::Mutex::new(HashMap::new()),
        });
        let _ = INSTANCE.set(controller.clone());
        controller.listen_time_events();
        controller
    }

    fn listen_time_events(self: &Arc<Self>) {
        let app = self.app.clone();
        tauri::async_runtime::spawn(async move {
            let mut rx = subscribe_to(&app, "wp-time");
            while let Some(payload) = rx.recv().await {
                if let (Some(label), Some(duration), Some(position)) = (
                    payload.get("label").and_then(|v| v.as_str()),
                    payload.get("duration").and_then(|v| v.as_f64()),
                    payload.get("timePos").and_then(|v| v.as_f64()),
                ) {
                    if let Some(controller) = INSTANCE.get() {
                        if let Some(info) = controller.info_of(label) {
                            *info.time.lock() = Some(TimePos { duration, position });
                        }
                    }
                }
            }
        });
    }

    fn label_player(screen: u32) -> String {
        format!("{PLAYER_PREFIX}{screen}")
    }

    fn label_web(screen: u32) -> String {
        format!("{WEB_PREFIX}{screen}")
    }

    fn info_of(&self, label: &str) -> Option<Arc<WindowInfo>> {
        self.windows.lock().get(label).cloned()
    }

    /// 确保窗口存在且页面加载完成，返回窗口。
    fn ensure_window(&self, label: &str, url: WebviewUrl) -> Result<tauri::WebviewWindow, String> {
        let info = {
            let mut map = self.windows.lock();
            map.entry(label.to_string())
                .or_insert_with(|| {
                    Arc::new(WindowInfo {
                        ready: Arc::new(AtomicBool::new(false)),
                        time: parking_lot::Mutex::new(None),
                    })
                })
                .clone()
        };

        if let Some(window) = self.app.get_webview_window(label) {
            log::info!("[player:{label}] reuse existing window");
            return Ok(window);
        }
        log::info!("[player:{label}] creating window");

        info.ready.store(false, Ordering::SeqCst);
        let ready_flag = info.ready.clone();
        let window = WebviewWindowBuilder::new(&self.app, label, url)
            .visible(false)
            .decorations(false)
            .resizable(false)
            .skip_taskbar(true)
            .shadow(false)
            .on_page_load(move |_window, payload| {
                if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                    ready_flag.store(true, Ordering::SeqCst);
                }
            })
            .build()
            .map_err(|e| format!("创建窗口失败: {e}"))?;

        // 等待页面加载（最多 15s）
        let mut ready = false;
        for _ in 0..300 {
            if info.ready.load(Ordering::SeqCst) {
                ready = true;
                break;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        log::info!("[player:{label}] window ready={ready}");
        Ok(window)
    }

    fn attach(&self, window: &tauri::WebviewWindow, screen: u32) -> Result<(), String> {
        // WebView2 控制器异步创建，hwnd 可能稍后才可用：重试等待
        let mut hwnd_raw = None;
        for _ in 0..200 {
            match window.hwnd() {
                Ok(h) => {
                    hwnd_raw = Some(h.0 as isize);
                    break;
                }
                Err(_) => std::thread::sleep(Duration::from_millis(50)),
            }
        }
        let Some(hwnd_raw) = hwnd_raw else {
            return Err("获取窗口句柄超时".into());
        };
        // tauri(wry) 使用 windows 0.61，引擎使用 0.62，跨版本用原始句柄传递
        let hwnd = windows::Win32::Foundation::HWND(hwnd_raw as *mut _);
        if !workerw::send_handle_to_desktop_bottom(hwnd, screen) {
            return Err("挂载到桌面失败（WorkerW 不可用）".into());
        }
        Ok(())
    }

    fn emit_cmd(&self, label: &str, action: &str, extra: serde_json::Value) {
        use tauri::Emitter;
        let _ = self.app.emit_to(
            tauri::EventTarget::labeled(label),
            "wp-cmd",
            serde_json::json!({ "action": action }).merge(extra),
        );
    }
}

/// serde_json helper: merge two objects.
trait MergeValue {
    fn merge(self, other: serde_json::Value) -> serde_json::Value;
}

impl MergeValue for serde_json::Value {
    fn merge(self, other: serde_json::Value) -> serde_json::Value {
        match (self, other) {
            (serde_json::Value::Object(mut a), serde_json::Value::Object(b)) => {
                for (k, v) in b {
                    a.insert(k, v);
                }
                serde_json::Value::Object(a)
            }
            (a, serde_json::Value::Object(b)) if b.is_empty() => a,
            (_a, b) => b,
        }
    }
}

fn subscribe_to(
    app: &tauri::AppHandle,
    event: &str,
) -> tokio::sync::mpsc::UnboundedReceiver<serde_json::Value> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let event = event.to_string();
    let _ = app.listen_any(event, move |e: tauri::Event| {
        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(e.payload()) {
            let _ = tx.send(payload);
        }
    });
    rx
}

impl EngineHost for InternalPlayerController {
    fn player_load(
        &self,
        screen: u32,
        media_url: &str,
        volume: u32,
        panscan: bool,
    ) -> Result<(), String> {
        let label = Self::label_player(screen);
        log::info!("player_load: screen {screen} url={media_url} volume={volume} panscan={panscan}");
        let window = self.ensure_window(&label, WebviewUrl::App("player.html".into()))?;
        self.attach(&window, screen)?;
        let _ = window.show();
        self.emit_cmd(
            &label,
            "load",
            serde_json::json!({ "src": media_url, "volume": volume, "panscan": panscan }),
        );
        Ok(())
    }

    fn player_set_paused(&self, screen: u32, paused: bool) -> Result<(), String> {
        self.emit_cmd(
            &Self::label_player(screen),
            "paused",
            serde_json::json!({ "paused": paused }),
        );
        Ok(())
    }

    fn player_set_volume(&self, screen: u32, volume: u32) -> Result<(), String> {
        self.emit_cmd(
            &Self::label_player(screen),
            "volume",
            serde_json::json!({ "volume": volume }),
        );
        Ok(())
    }

    fn player_seek_percent(&self, screen: u32, percent: f64) -> Result<(), String> {
        self.emit_cmd(
            &Self::label_player(screen),
            "seek",
            serde_json::json!({ "percent": percent }),
        );
        Ok(())
    }

    fn player_time(&self, screen: u32) -> Option<TimePos> {
        let info = self.info_of(&Self::label_player(screen))?;
        let time = *info.time.lock();
        time
    }

    fn player_is_alive(&self, screen: u32) -> bool {
        self.app.get_webview_window(&Self::label_player(screen)).is_some()
    }

    fn player_close(&self, screen: u32) -> Result<(), String> {
        let label = Self::label_player(screen);
        if let Some(window) = self.app.get_webview_window(&label) {
            let _ = window.destroy();
        }
        self.windows.lock().remove(&label);
        Ok(())
    }

    fn web_load(&self, screen: u32, url: &str, mouse_enabled: bool) -> Result<(), String> {
        let label = Self::label_web(screen);
        let parsed: tauri::Url = if url.starts_with("http://") || url.starts_with("https://") {
            url.parse().map_err(|e| format!("bad url: {e}"))?
        } else {
            // 本地 media 协议地址，直接作为 External 传入会失败；
            // media:// 已在 WebView2 注册为可导航 scheme，转 WebviewUrl::External 同样可行
            url.parse().map_err(|e| format!("bad url: {e}"))?
        };
        let window = self.ensure_window(&label, WebviewUrl::External(parsed))?;
        self.attach(&window, screen)?;
        let _ = window.show();
        if !mouse_enabled {
            let _ = window.set_ignore_cursor_events(true);
        }
        Ok(())
    }

    fn web_is_alive(&self, screen: u32) -> bool {
        self.app.get_webview_window(&Self::label_web(screen)).is_some()
    }

    fn web_close(&self, screen: u32) -> Result<(), String> {
        let label = Self::label_web(screen);
        if let Some(window) = self.app.get_webview_window(&label) {
            let _ = window.destroy();
        }
        self.windows.lock().remove(&label);
        Ok(())
    }

    fn mpv_path(&self) -> std::path::PathBuf {
        // 1) 可执行文件旁的 assets/players/mpv/mpv.exe（绿色版）
        if let Ok(exe) = std::env::current_exe() {
            let p = exe
                .parent()
                .unwrap()
                .join("assets/players/mpv/mpv.exe");
            if p.exists() {
                return p;
            }
        }
        // 2) 资源目录（安装版 resources）
        if let Ok(dir) = self.app.path().resource_dir() {
            let p = dir.join("assets/players/mpv/mpv.exe");
            if p.exists() {
                return p;
            }
        }
        // 3) 开发模式：源码树 src-tauri/assets
        let dev = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets/players/mpv/mpv.exe");
        if dev.exists() {
            return dev;
        }
        // 4) 数据目录（应用内自动下载的 mpv）
        let downloaded = crate::mpv_download::target_mpv_path(&wallpaper_core::AppDirs::resolve());
        if downloaded.exists() {
            return downloaded;
        }
        std::path::PathBuf::new()
    }

    fn default_cover(&self) -> std::path::PathBuf {
        if let Ok(dir) = self.app.path().resource_dir() {
            let p = dir.join("assets/default_cover.webp");
            if p.exists() {
                return p;
            }
        }
        if let Ok(exe) = std::env::current_exe() {
            let p = exe.parent().unwrap().join("assets/default_cover.webp");
            if p.exists() {
                return p;
            }
        }
        std::path::PathBuf::new()
    }
}
