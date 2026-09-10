//! 内嵌 WebView 播放器 / Web 壁纸窗口控制器。
//! v3 中这是独立的播放器进程；v4 改为应用内 WebView 窗口，SetParent 到
//! WorkerW 嵌入桌面。零外部进程依赖，天然支持 web 壁纸。
//!
//! 内嵌视频播放器通过 [`WebViewPlayerFactory`] / [`WebViewPlayer`] 接入
//! wallpaper-core 的统一播放器接口（`PlayerFactory` / `PlayerEngine`），
//! 与 mpv 等外部引擎平级，由屏幕管理器统一调度。

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use wallpaper_core::host::EngineHost;
use wallpaper_core::models::{TimePos, VideoPlayer};
use wallpaper_core::player::{MediaSource, PlayerConfig, PlayerEngine, PlayerFactory};
use wallpaper_core::system::workerw;

const PLAYER_PREFIX: &str = "player-";
const WEB_PREFIX: &str = "web-";

/// 内嵌 WebView 播放器的引擎 kind 标识。
pub const WEBVIEW_KIND: &str = "webview";

#[derive(Default)]
struct WindowInfo {
    ready: Arc<AtomicBool>,
    time: parking_lot::Mutex<Option<TimePos>>,
}

pub struct InternalPlayerController {
    app: tauri::AppHandle,
    windows: parking_lot::Mutex<HashMap<String, Arc<WindowInfo>>>,
    /// 本控制器提供的播放器工厂（构造时初始化，供 EngineHost 返回）。
    factories: std::sync::OnceLock<Vec<Arc<dyn PlayerFactory>>>,
}

static INSTANCE: std::sync::OnceLock<Arc<InternalPlayerController>> = std::sync::OnceLock::new();

impl InternalPlayerController {
    pub fn new(app: tauri::AppHandle) -> Arc<Self> {
        let controller = Arc::new(Self {
            app,
            windows: parking_lot::Mutex::new(HashMap::new()),
            factories: std::sync::OnceLock::new(),
        });
        let _ = controller.factories.set(vec![Arc::new(WebViewPlayerFactory {
            controller: controller.clone(),
        })]);
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

    // ---- 内嵌视频播放器窗口（由 WebViewPlayer 引擎驱动）----

    /// 打开（或复用）播放器窗口并加载媒体。不挂载不显示——
    /// 由引擎的 attach_to_desktop 统一处理；复用窗口时保持原状实现无缝换源。
    fn player_open(&self, screen: u32, url: &str, volume: u32, panscan: bool) -> Result<(), String> {
        let label = Self::label_player(screen);
        log::info!("player_open: screen {screen} url={url} volume={volume} panscan={panscan}");
        // 窗口本身以不可见方式创建：复用时保持原状（已挂载可见则无缝换源），
        // 全新窗口则等 attach_to_desktop 挂载成功后再显示
        self.ensure_window(&label, WebviewUrl::App("player.html".into()))?;
        self.emit_cmd(
            &label,
            "load",
            serde_json::json!({ "src": url, "volume": volume, "panscan": panscan }),
        );
        Ok(())
    }

    /// 把播放器窗口挂载到桌面并显示。
    fn player_attach(&self, screen: u32) -> Result<(), String> {
        let label = Self::label_player(screen);
        let window = self
            .app
            .get_webview_window(&label)
            .ok_or("播放器窗口不存在")?;
        self.attach(&window, screen)?;
        let _ = window.show();
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

    fn player_set_panscan(&self, screen: u32, panscan: bool) -> Result<(), String> {
        self.emit_cmd(
            &Self::label_player(screen),
            "panscan",
            serde_json::json!({ "panscan": panscan }),
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

// ---------------------------------------------------------------------------
// 统一播放器接口实现：内嵌 WebView 播放器引擎
// ---------------------------------------------------------------------------

/// 一个已打开的内嵌 WebView 播放器实例（对应一块屏幕）。
/// 缓存最近的音量/铺满设置，供复用换源时随 load 一起下发。
struct WebViewPlayer {
    controller: Arc<InternalPlayerController>,
    screen: u32,
    volume: AtomicU32,
    panscan: AtomicBool,
}

fn err_msg(e: String) -> anyhow::Error {
    anyhow::anyhow!(e)
}

#[async_trait::async_trait]
impl PlayerEngine for WebViewPlayer {
    fn kind(&self) -> &'static str {
        WEBVIEW_KIND
    }

    /// 复用窗口换源：重发 load 命令（携带缓存的音量/铺满，避免换源闪断）。
    async fn load(&self, source: &MediaSource) -> anyhow::Result<()> {
        let url = source
            .url
            .clone()
            .ok_or_else(|| anyhow::anyhow!("内嵌播放器需要媒体 URL"))?;
        self.controller
            .player_open(
                self.screen,
                &url,
                self.volume.load(Ordering::SeqCst),
                self.panscan.load(Ordering::SeqCst),
            )
            .map_err(err_msg)
    }

    async fn attach_to_desktop(&self) -> anyhow::Result<()> {
        self.controller.player_attach(self.screen).map_err(err_msg)
    }

    async fn set_paused(&self, paused: bool) -> anyhow::Result<()> {
        self.controller
            .player_set_paused(self.screen, paused)
            .map_err(err_msg)
    }

    async fn set_volume(&self, volume: u32) -> anyhow::Result<()> {
        self.volume.store(volume, Ordering::SeqCst);
        self.controller
            .player_set_volume(self.screen, volume)
            .map_err(err_msg)
    }

    async fn set_panscan(&self, value: f64) -> anyhow::Result<()> {
        let panscan = value > 0.5;
        self.panscan.store(panscan, Ordering::SeqCst);
        self.controller
            .player_set_panscan(self.screen, panscan)
            .map_err(err_msg)
    }

    async fn seek_percent(&self, percent: f64) -> anyhow::Result<()> {
        self.controller
            .player_seek_percent(self.screen, percent)
            .map_err(err_msg)
    }

    async fn time_pos(&self) -> (f64, f64) {
        match self.controller.player_time(self.screen) {
            Some(t) => (t.duration, t.position),
            None => (-1.0, -1.0),
        }
    }

    async fn is_alive(&self) -> bool {
        self.controller.player_is_alive(self.screen)
    }

    /// WebView 窗口随应用退出而销毁，无需跨启动接管。
    async fn shutdown(&self) {
        let _ = self.controller.player_close(self.screen);
    }
}

/// 内嵌 WebView 播放器工厂。
pub struct WebViewPlayerFactory {
    controller: Arc<InternalPlayerController>,
}

#[async_trait::async_trait]
impl PlayerFactory for WebViewPlayerFactory {
    fn kind(&self) -> &'static str {
        WEBVIEW_KIND
    }

    fn serves(&self) -> &'static [VideoPlayer] {
        &[VideoPlayer::System]
    }

    fn is_available(&self) -> bool {
        true // 应用内 WebView，无外部依赖
    }

    async fn create(
        &self,
        source: &MediaSource,
        config: &PlayerConfig,
    ) -> anyhow::Result<Arc<dyn PlayerEngine>> {
        let url = source
            .url
            .clone()
            .ok_or_else(|| anyhow::anyhow!("内嵌播放器需要媒体 URL"))?;
        self.controller
            .player_open(config.screen, &url, config.volume, config.panscan)
            .map_err(err_msg)?;
        Ok(Arc::new(WebViewPlayer {
            controller: self.controller.clone(),
            screen: config.screen,
            volume: AtomicU32::new(config.volume),
            panscan: AtomicBool::new(config.panscan),
        }))
    }

    async fn restore(
        &self,
        _data: &serde_json::Value,
        _screen: u32,
    ) -> anyhow::Result<Arc<dyn PlayerEngine>> {
        Err(anyhow::anyhow!("内嵌播放器不支持跨启动接管"))
    }
}

// ---------------------------------------------------------------------------
// EngineHost：web 壁纸窗口 + 资源路径 + 播放器工厂注入
// ---------------------------------------------------------------------------

impl EngineHost for InternalPlayerController {
    fn player_factories(&self) -> Vec<Arc<dyn PlayerFactory>> {
        self.factories.get().cloned().unwrap_or_default()
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
