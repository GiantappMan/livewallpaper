//! 内嵌 WebView 播放器 / Web 壁纸窗口控制器。
//! v3 中这是独立的播放器进程；v4 改为应用内 WebView 窗口，SetParent 到
//! WorkerW 嵌入桌面。零外部进程依赖，天然支持 web 壁纸。
//!
//! 两个引擎均接入 wallpaper-core 的统一播放器接口（`PlayerFactory` /
//! `PlayerEngine`），与 mpv 等外部引擎平级，由屏幕管理器统一调度：
//! - [`WebViewPlayerFactory`] / [`WebViewPlayer`]：内嵌视频播放器（kind `"webview"`）
//! - [`WebPlayerFactory`] / [`WebPlayer`]：web 壁纸播放器（kind `"web"`）

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use wallpaper_core::host::EngineHost;
use wallpaper_core::models::{TimePos, VideoPlayer};
use wallpaper_core::player::{MediaSource, PlayerConfig, PlayerEngine, PlayerFactory, WEB_KIND};
use wallpaper_core::system::workerw;

#[cfg(windows)]
use crate::mouse_hook;

const PLAYER_PREFIX: &str = "player-";
const WEB_PREFIX: &str = "web-";

/// 内嵌 WebView 播放器的引擎 kind 标识。
pub const WEBVIEW_KIND: &str = "webview";

#[derive(Default)]
struct WindowInfo {
    ready: Arc<AtomicBool>,
    time: parking_lot::Mutex<Option<TimePos>>,
    /// false = 独立窗口模式（显示为普通窗口，不嵌 WorkerW）。
    embed: AtomicBool,
    /// 最近一次 load 命令载荷（页面 wp-ready 握手时重发，消除启动竞态）。
    last_load: parking_lot::Mutex<Option<serde_json::Value>>,
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
        let _ = controller.factories.set(vec![
            Arc::new(WebViewPlayerFactory {
                controller: controller.clone(),
            }),
            Arc::new(WebPlayerFactory {
                controller: controller.clone(),
            }),
        ]);
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

        // wp-ready 握手：页面的 listen 注册完成可能晚于 load 命令（窗口 ready
        // 即发送），页面上报就绪后把当前 load 命令重发一次。
        let app = self.app.clone();
        tauri::async_runtime::spawn(async move {
            let mut rx = subscribe_to(&app, "wp-ready");
            while let Some(payload) = rx.recv().await {
                if let Some(label) = payload.get("label").and_then(|v| v.as_str()) {
                    if let Some(controller) = INSTANCE.get() {
                        if let Some(info) = controller.info_of(label) {
                            let cmd = info.last_load.lock().clone();
                            if let Some(cmd) = cmd {
                                use tauri::Emitter;
                                let _ = app.emit_to(
                                    tauri::EventTarget::labeled(label),
                                    "wp-cmd",
                                    cmd,
                                );
                                log::info!("[player:{label}] replayed load on wp-ready");
                            }
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
                        embed: AtomicBool::new(true),
                        last_load: parking_lot::Mutex::new(None),
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
            // 壁纸视频自动播放是核心语义：解除"非用户手势不得出声播放"限制
            // （含 wry 默认追加的 disable-features，设置 additional args 会整组替换）
            .additional_browser_args(
                "--autoplay-policy=no-user-gesture-required \
                 --disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection",
            )
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
    fn player_open(&self, screen: u32, url: &str, volume: u32, panscan: bool, embed: bool) -> Result<(), String> {
        let label = Self::label_player(screen);
        log::info!("player_open: screen {screen} url={url} volume={volume} panscan={panscan} embed={embed}");
        // 窗口本身以不可见方式创建：复用时保持原状（已挂载可见则无缝换源），
        // 全新窗口则等 attach_to_desktop 挂载成功后再显示
        self.ensure_window(&label, WebviewUrl::App("player.html".into()))?;
        if let Some(info) = self.info_of(&label) {
            info.embed.store(embed, Ordering::SeqCst);
            *info.last_load.lock() = Some(
                serde_json::json!({ "action": "load", "src": url, "volume": volume, "panscan": panscan }),
            );
        }
        self.emit_cmd(
            &label,
            "load",
            serde_json::json!({ "src": url, "volume": volume, "panscan": panscan }),
        );
        Ok(())
    }

    /// 把播放器窗口挂载到桌面并显示。独立窗口模式不嵌 WorkerW，
    /// 改为常规尺寸居中显示。
    fn player_attach(&self, screen: u32) -> Result<(), String> {
        let label = Self::label_player(screen);
        let window = self
            .app
            .get_webview_window(&label)
            .ok_or("播放器窗口不存在")?;
        let embed = self
            .info_of(&label)
            .map(|i| i.embed.load(Ordering::SeqCst))
            .unwrap_or(true);
        if embed {
            self.attach(&window, screen)?;
        } else {
            let _ = window.set_size(tauri::LogicalSize::new(960.0, 540.0));
            let _ = window.center();
        }
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

    // ---- web 壁纸窗口（由 WebPlayer 引擎驱动）----

    /// 打开（或复用）web 壁纸窗口并加载 URL。不挂载不显示——
    /// 由引擎的 attach_to_desktop 统一处理。
    fn web_open(&self, screen: u32, url: &str, embed: bool) -> Result<(), String> {
        let label = Self::label_web(screen);
        log::info!("web_open: screen {screen} url={url} embed={embed}");
        // 本地 media 协议地址已注册为可导航 scheme，与 http(s) 一样直接解析
        let parsed: tauri::Url = url.parse().map_err(|e| format!("bad url: {e}"))?;
        self.ensure_window(&label, WebviewUrl::External(parsed))?;
        if let Some(info) = self.info_of(&label) {
            info.embed.store(embed, Ordering::SeqCst);
        }
        Ok(())
    }

    /// 把 web 窗口挂载到桌面并显示。独立窗口模式不嵌 WorkerW。
    fn web_attach(&self, screen: u32) -> Result<(), String> {
        let label = Self::label_web(screen);
        let window = self.app.get_webview_window(&label).ok_or("web 窗口不存在")?;
        let embed = self
            .info_of(&label)
            .map(|i| i.embed.load(Ordering::SeqCst))
            .unwrap_or(true);
        if embed {
            self.attach(&window, screen)?;
        } else {
            let _ = window.set_size(tauri::LogicalSize::new(960.0, 540.0));
            let _ = window.center();
        }
        let _ = window.show();
        Ok(())
    }

    /// 设置鼠标事件：enabled = 页面接收鼠标（否则穿透到桌面）。
    /// 独立窗口靠 `set_ignore_cursor_events` 原生收放输入；嵌入桌面的窗口
    /// 位于图标层之下收不到任何真实输入，由全局鼠标钩子转发（见 mouse_hook）。
    fn web_set_mouse(&self, screen: u32, enabled: bool) -> Result<(), String> {
        let label = Self::label_web(screen);
        if let Some(window) = self.app.get_webview_window(&label) {
            let _ = window.set_ignore_cursor_events(!enabled);
        }
        #[cfg(windows)]
        {
            let target = if enabled {
                self.web_hook_target(screen)
            } else {
                None
            };
            mouse_hook::set_target(screen, target);
        }
        #[cfg(not(windows))]
        let _ = (screen, enabled);
        Ok(())
    }

    /// web 窗口的交互转发目标：仅嵌入桌面且 WebView2 子窗口就绪时存在。
    #[cfg(windows)]
    fn web_hook_target(&self, screen: u32) -> Option<mouse_hook::MouseTarget> {
        let label = Self::label_web(screen);
        let embed = self
            .info_of(&label)
            .map(|i| i.embed.load(Ordering::SeqCst))
            .unwrap_or(true);
        if !embed {
            // 独立窗口（调试/预览）自己就能收输入，走钩子反而重复投递
            return None;
        }
        let window = self.app.get_webview_window(&label)?;
        // WebView2 子窗口异步创建：短暂等待重试
        for _ in 0..20 {
            if let Ok(h) = window.hwnd() {
                if let Some(child) = mouse_hook::find_webview_child(h.0 as isize) {
                    return Some(mouse_hook::MouseTarget {
                        screen,
                        monitor: mouse_hook::monitor_of_window(h.0 as isize),
                        hwnd: child,
                    });
                }
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        log::warn!("[player:{label}] 未找到 WebView2 子窗口，鼠标交互不可用");
        None
    }

    /// 已存活的窗口原地导航到新 URL（不销毁窗口，切换不闪屏）。
    fn web_navigate(&self, screen: u32, url: &str) -> Result<(), String> {
        let label = Self::label_web(screen);
        let window = self.app.get_webview_window(&label).ok_or("web 窗口不存在")?;
        let parsed: tauri::Url = url.parse().map_err(|e| format!("bad url: {e}"))?;
        window.navigate(parsed).map_err(|e| format!("导航失败: {e}"))
    }

    /// WebView2 级整体静音（ICoreWebView2_8.IsMuted）：页面现有及之后动态创建的
    /// 音频全部生效，且跨导航保持。多屏同放 web 壁纸时按音源屏设置消音。
    fn web_set_muted(&self, screen: u32, muted: bool) -> Result<(), String> {
        let label = Self::label_web(screen);
        let Some(window) = self.app.get_webview_window(&label) else {
            return Err(format!("{label} 窗口不存在"));
        };
        #[cfg(windows)]
        {
            window
                .with_webview(move |wv| set_platform_muted(&wv, muted))
                .map_err(|e| e.to_string())
        }
        #[cfg(not(windows))]
        {
            let _ = (window, muted);
            Ok(())
        }
    }

    /// 向 web 壁纸页面注入 JS（媒体元素暂停/恢复等 best-effort 控制）。
    fn web_eval(&self, screen: u32, js: &str) -> Result<(), String> {
        let label = Self::label_web(screen);
        let Some(window) = self.app.get_webview_window(&label) else {
            return Err(format!("{label} 窗口不存在"));
        };
        window.eval(js).map_err(|e| e.to_string())
    }

    /// 冻结 / 解冻界面：截取当前画面写入 tmp，再以全屏 <img> 盖在页面上，
    /// 界面"定格"在当前帧且仍然可见（不做隐藏、不销毁窗口）；解冻即移除图片。
    /// 声音由 `set_paused` 的整体静音负责。
    fn web_freeze_frame(&self, screen: u32, frozen: bool) -> Result<(), String> {
        let label = Self::label_web(screen);
        let Some(window) = self.app.get_webview_window(&label) else {
            return Err(format!("{label} 窗口不存在"));
        };
        if !frozen {
            return window.eval(FREEZE_REMOVE_JS).map_err(|e| e.to_string());
        }
        let tmp_dir = self
            .app
            .try_state::<crate::state::AppState>()
            .map(|s| s.dirs.tmp_dir())
            .unwrap_or_else(|| std::env::temp_dir());
        let name = format!("freeze-web-{screen}.png");
        let png_path = tmp_dir.join(&name);
        // 缓存穿透：同屏重复冻结时保证 <img> 重新拉取新帧
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let url = format!("{}?t={stamp}", crate::urls::tmp_name_to_media_url(&name));
        #[cfg(windows)]
        {
            let win = window.clone();
            window
                .with_webview(move |wv| capture_and_inject(&wv, png_path, url, win))
                .map_err(|e| e.to_string())
        }
        #[cfg(not(windows))]
        {
            let _ = (png_path, url);
            Ok(())
        }
    }

    fn web_is_alive(&self, screen: u32) -> bool {
        self.app.get_webview_window(&Self::label_web(screen)).is_some()
    }

    fn web_close(&self, screen: u32) -> Result<(), String> {
        let label = Self::label_web(screen);
        #[cfg(windows)]
        mouse_hook::set_target(screen, None);
        if let Some(window) = self.app.get_webview_window(&label) {
            let _ = window.destroy();
        }
        self.windows.lock().remove(&label);
        Ok(())
    }
}

/// Windows：经 WebView2 COM 把整个 WebView 静音/取消静音。
/// with_webview 的闭包在主线程执行，COM 调用安全。
#[cfg(windows)]
fn set_platform_muted(wv: &tauri::webview::PlatformWebview, muted: bool) {
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_8;
    use windows_core::Interface as _;
    unsafe {
        let Ok(core) = wv.controller().CoreWebView2() else {
            return;
        };
        let Ok(web) = core.cast::<ICoreWebView2_8>() else {
            log::debug!("ICoreWebView2_8 不可用（WebView2 Runtime 过旧），无法静音");
            return;
        };
        if let Err(e) = web.SetIsMuted(muted) {
            log::warn!("SetIsMuted({muted}) 失败: {e}");
        }
    }
}

/// Windows：截取 WebView 当前画面（CapturePreview -> 内存流 -> tmp PNG），
/// 完成回调里注入全屏定格 <img>。页面照常运行，视觉上停在截取的那一帧。
#[cfg(windows)]
fn capture_and_inject(
    wv: &tauri::webview::PlatformWebview,
    png_path: std::path::PathBuf,
    media_url: String,
    window: tauri::WebviewWindow,
) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG, ICoreWebView2CapturePreviewCompletedHandler,
    };
    use webview2_com::CapturePreviewCompletedHandler;
    use windows61::Win32::Foundation::HGLOBAL;
    use windows61::Win32::System::Com::{STATSTG, STREAM_SEEK_SET, STATFLAG_NONAME};
    use windows61::Win32::System::Com::StructuredStorage::CreateStreamOnHGlobal;

    unsafe {
        let Ok(core) = wv.controller().CoreWebView2() else {
            return;
        };
        let Ok(mem) = CreateStreamOnHGlobal(HGLOBAL::default(), true) else {
            return;
        };
        let mem_for_capture = mem.clone();
        let handler: ICoreWebView2CapturePreviewCompletedHandler =
            CapturePreviewCompletedHandler::create(Box::new(move |result| {
                if result.is_err() {
                    return Ok(());
                }
                // 注：闭包在 unsafe 上下文内定义，沿用其 unsafe 资格
                let _ = mem_for_capture.Seek(0, STREAM_SEEK_SET, None);
                let mut stat = STATSTG::default();
                if mem_for_capture.Stat(&mut stat, STATFLAG_NONAME).is_err() {
                    return Ok(());
                }
                let size = stat.cbSize as usize;
                if size == 0 || size > 64 * 1024 * 1024 {
                    return Ok(());
                }
                let mut buf = vec![0u8; size];
                let mut read = 0u32;
                let hr = mem_for_capture.Read(buf.as_mut_ptr().cast(), size as u32, Some(&mut read));
                if hr.is_err() || read as usize != size {
                    return Ok(());
                }
                if std::fs::write(&png_path, &buf).is_err() {
                    return Ok(());
                }
                let _ = window.eval(&freeze_image_js(&media_url));
                Ok(())
            }));
        let _ = core.CapturePreview(
            COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
            &mem,
            &handler,
        );
    }
}

/// 全屏定格图：盖住整个页面（含视频/动画/时钟），样式内联防皮肤样式干扰。
fn freeze_image_js(url: &str) -> String {
    format!(
        "(function(){{var d=document;if(!d.body)return;\
         var o=d.getElementById('__wp_freeze_frame');if(o)o.remove();\
         var i=d.createElement('img');i.id='__wp_freeze_frame';i.src='{url}';\
         i.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;object-fit:cover;z-index:2147483647;pointer-events:none;border:0;margin:0;padding:0;';\
         d.body.appendChild(i);}})()"
    )
}

const FREEZE_REMOVE_JS: &str =
    "(function(){var e=document.getElementById('__wp_freeze_frame');if(e)e.remove()})()";

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
struct WebViewPlayer {
    controller: Arc<InternalPlayerController>,
    screen: u32,
    embed_desktop: bool,
}

fn err_msg(e: String) -> anyhow::Error {
    anyhow::anyhow!(e)
}

#[async_trait::async_trait]
impl PlayerEngine for WebViewPlayer {
    fn kind(&self) -> &'static str {
        WEBVIEW_KIND
    }

    fn embed_desktop(&self) -> bool {
        self.embed_desktop
    }

    /// 复用窗口换源：重发 load 命令（参数随 config 下发，避免换源闪断）。
    async fn load(&self, source: &MediaSource, config: &PlayerConfig) -> anyhow::Result<()> {
        let url = source
            .url
            .clone()
            .ok_or_else(|| anyhow::anyhow!("内嵌播放器需要媒体 URL"))?;
        self.controller
            .player_open(
                self.screen,
                &url,
                config.volume,
                config.panscan,
                self.embed_desktop,
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
        self.controller
            .player_set_volume(self.screen, volume)
            .map_err(err_msg)
    }

    async fn set_panscan(&self, value: f64) -> anyhow::Result<()> {
        self.controller
            .player_set_panscan(self.screen, value > 0.5)
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
            .player_open(config.screen, &url, config.volume, config.panscan, config.embed_desktop)
            .map_err(err_msg)?;
        Ok(Arc::new(WebViewPlayer {
            controller: self.controller.clone(),
            screen: config.screen,
            embed_desktop: config.embed_desktop,
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
// 统一播放器接口实现：web 壁纸播放器引擎
// ---------------------------------------------------------------------------

/// 一个 web 壁纸播放器实例（对应一块屏幕的 web 壁纸窗口）。
struct WebPlayer {
    controller: Arc<InternalPlayerController>,
    screen: u32,
    /// 页面是否接收鼠标事件（换源导航时可能变化）。
    mouse_events: AtomicBool,
    /// 引擎音量 0-100。web 只能整体静音，非 0 不分级。
    volume: AtomicU32,
    /// 是否处于暂停态（决定 set_volume 时是否保持静音）。
    paused: AtomicBool,
    embed_desktop: bool,
}

/// 页面媒体控制（best-effort）：只覆盖 <video>/<audio> 元素；
/// WebAudio 等页面内合成音频无法从外部暂停，由暂停时的整体静音兜底。
const MEDIA_PAUSE_JS: &str = "try{document.querySelectorAll('video,audio').forEach(function(m){try{m.pause()}catch(e){}})}catch(e){}";
const MEDIA_RESUME_JS: &str = "try{document.querySelectorAll('video,audio').forEach(function(m){try{var p=m.play();if(p&&p.catch){p.catch(function(){})}}catch(e){}})}catch(e){}";

#[async_trait::async_trait]
impl PlayerEngine for WebPlayer {
    fn kind(&self) -> &'static str {
        WEB_KIND
    }

    fn embed_desktop(&self) -> bool {
        self.embed_desktop
    }

    /// 复用窗口原地导航到新 URL（不销毁窗口，切换不闪屏）。
    async fn load(&self, source: &MediaSource, config: &PlayerConfig) -> anyhow::Result<()> {
        let url = source
            .url
            .clone()
            .ok_or_else(|| anyhow::anyhow!("web 播放器需要 URL"))?;
        self.mouse_events.store(config.mouse_events, Ordering::SeqCst);
        self.controller
            .web_navigate(self.screen, &url)
            .map_err(err_msg)?;
        self.controller
            .web_set_mouse(self.screen, config.mouse_events)
            .map_err(err_msg)?;
        // 引擎音量跟随新配置；暂停态由管理器在播放后统一 apply_pause
        self.set_volume(config.volume).await
    }

    async fn attach_to_desktop(&self) -> anyhow::Result<()> {
        self.controller.web_attach(self.screen).map_err(err_msg)?;
        self.controller
            .web_set_mouse(self.screen, self.mouse_events.load(Ordering::SeqCst))
            .map_err(err_msg)
    }

    /// 暂停 = 注入 JS 暂停页面媒体元素 + 整体静音兜底（WebAudio / 动态创建的
    /// 音频）；恢复时按引擎音量还原静音态。遮挡暂停与手动暂停共用此路径。
    async fn set_paused(&self, paused: bool) -> anyhow::Result<()> {
        self.paused.store(paused, Ordering::SeqCst);
        if paused {
            let _ = self.controller.web_set_muted(self.screen, true);
            let _ = self.controller.web_eval(self.screen, MEDIA_PAUSE_JS);
        } else {
            let muted = self.volume.load(Ordering::SeqCst) == 0;
            let _ = self.controller.web_set_muted(self.screen, muted);
            let _ = self.controller.web_eval(self.screen, MEDIA_RESUME_JS);
        }
        Ok(())
    }

    /// 音量只区分静音与否（音源屏出声 / 非音源屏静音）。
    async fn set_volume(&self, volume: u32) -> anyhow::Result<()> {
        self.volume.store(volume.min(100), Ordering::SeqCst);
        let muted = volume == 0 || self.paused.load(Ordering::SeqCst);
        self.controller
            .web_set_muted(self.screen, muted)
            .map_err(err_msg)
    }

    /// 遮挡冻结：截取当前帧注入为全屏定格图——界面停在截图瞬间且仍然可见，
    /// 不隐藏窗口。只被遮挡暂停调用（手动暂停保持页面原样活跃）。
    async fn set_frozen(&self, frozen: bool) -> anyhow::Result<()> {
        self.controller
            .web_freeze_frame(self.screen, frozen)
            .map_err(err_msg)
    }

    async fn seek_percent(&self, _percent: f64) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("web 壁纸不支持跳转"))
    }

    async fn time_pos(&self) -> (f64, f64) {
        (-1.0, -1.0)
    }

    async fn is_alive(&self) -> bool {
        self.controller.web_is_alive(self.screen)
    }

    /// WebView 窗口随应用退出而销毁，无需跨启动接管。
    async fn shutdown(&self) {
        let _ = self.controller.web_close(self.screen);
    }
}

/// web 壁纸播放器工厂。
pub struct WebPlayerFactory {
    controller: Arc<InternalPlayerController>,
}

#[async_trait::async_trait]
impl PlayerFactory for WebPlayerFactory {
    fn kind(&self) -> &'static str {
        WEB_KIND
    }

    /// web 壁纸按 `WallpaperType::Web` 由管理器按 kind 路由，不占用 VideoPlayer 设置值。
    fn serves(&self) -> &'static [VideoPlayer] {
        &[]
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
            .ok_or_else(|| anyhow::anyhow!("web 播放器需要 URL"))?;
        self.controller
            .web_open(config.screen, &url, config.embed_desktop)
            .map_err(err_msg)?;
        let player = Arc::new(WebPlayer {
            controller: self.controller.clone(),
            screen: config.screen,
            mouse_events: AtomicBool::new(config.mouse_events),
            volume: AtomicU32::new(config.volume.min(100)),
            paused: AtomicBool::new(false),
            embed_desktop: config.embed_desktop,
        });
        // 新窗口默认出声：非音源屏 / 全局静音必须立刻静音（双屏同放防双音频）。
        // best-effort：失败不阻断播放，随后的 apply_pause / apply_settings 会重试。
        if let Err(e) = player.set_volume(config.volume).await {
            log::warn!("screen {} web 初始静音设置失败: {e}", config.screen);
        }
        Ok(player)
    }

    async fn restore(
        &self,
        _data: &serde_json::Value,
        _screen: u32,
    ) -> anyhow::Result<Arc<dyn PlayerEngine>> {
        Err(anyhow::anyhow!("web 播放器不支持跨启动接管"))
    }
}

// ---------------------------------------------------------------------------
// EngineHost：资源路径 + 播放器工厂注入
// ---------------------------------------------------------------------------

impl EngineHost for InternalPlayerController {
    fn player_factories(&self) -> Vec<Arc<dyn PlayerFactory>> {
        self.factories.get().cloned().unwrap_or_default()
    }

    /// 独立窗口模式的播放器窗口不参与遮挡检测（否则最大化播放器
    /// 会触发"遮挡智能暂停"把自己停住）。
    fn occlusion_exclusions(&self) -> Vec<isize> {
        let labels: Vec<String> = self.windows.lock().keys().cloned().collect();
        let mut out = Vec::new();
        for label in labels {
            if let Some(window) = self.app.get_webview_window(&label) {
                if let Ok(h) = window.hwnd() {
                    out.push(h.0 as isize);
                }
            }
        }
        out
    }

    fn mpv_path(&self) -> std::path::PathBuf {
        // 资源目录优先（安装版 resources 可能与 exe 不同级），其余走通用探测
        if let Ok(dir) = self.app.path().resource_dir() {
            let p = dir.join("assets/players/mpv/mpv.exe");
            if p.exists() {
                return p;
            }
        }
        crate::paths::resolve_mpv_path(&wallpaper_core::AppDirs::resolve())
    }

    fn default_cover(&self) -> std::path::PathBuf {
        if let Ok(dir) = self.app.path().resource_dir() {
            let p = dir.join("assets/default_cover.webp");
            if p.exists() {
                return p;
            }
        }
        crate::paths::resolve_default_cover()
    }
}
