//! 应用装配：启动模式（GUI / headless）、按需主窗口、插件、托盘、系统事件、
//! 媒体与皮肤协议、状态初始化与命令注册。
//!
//! 启动模式：
//! - 默认：启动屏 + 主窗口（按皮肤解析加载目标），关闭仅隐藏到托盘。
//! - `--headless`：零窗口全功能运行（壁纸/播放列表/下载/系统事件照常），
//!   任意时刻经单实例回调、托盘、深链或控制管道 `ui.show` 按需创建主窗口。

mod cli;
mod commands;
mod control;
mod events;
mod internal_player;
#[cfg(windows)]
mod mouse_hook;
mod logger;
mod media_protocol;
mod mpv_download;
mod paths;
mod skin;
mod skin_watch;
mod state;
mod system_events;
mod tray;
mod urls;

use parking_lot::Mutex;
use state::AppState;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use tauri::Manager;
use wallpaper_core::{AppDirs, ConfigStore, DownloadManager, WallpaperApi};

pub const DEEP_LINK_SCHEME: &str = "livewallpaper4";
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

const HUB_COMPAT_SCRIPT: &str = include_str!("hub_compat.js");

/// Hub 兼容层里 ALLOWED_ORIGINS 的 Rust 侧镜像，用于判定新窗口请求是否来自社区页。
const HUB_ORIGINS: &[&str] = &[
    "https://wallpaper.giantapp.cn",
    "https://www.giantapp.cc",
    "https://livewallpaper.giantapp.cn",
    "http://localhost:3000",
    "http://localhost:3001",
];

static HUB_WINDOW_SEQ: AtomicU32 = AtomicU32::new(1);

pub(crate) fn next_hub_window_seq() -> u32 {
    HUB_WINDOW_SEQ.fetch_add(1, Ordering::Relaxed)
}

pub fn run() {
    let args: Vec<String> = std::env::args().skip(1).collect();

    // CLI 动词（status/play/volume/ui/...）：发给运行中的实例后即退出
    if let cli::CliOutcome::Handled = cli::dispatch(&args) {
        return;
    }
    let headless = cli::is_headless(&args);

    let dirs = AppDirs::resolve();
    if let Err(e) = dirs.ensure() {
        eprintln!("init data dir failed: {e}");
    }
    logger::init(&dirs);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 二次启动：深链参数转发 + 唤起主窗口（headless 实例则按需创建）
            log::info!("single-instance args: {args:?}");
            if let Some(target) = extract_deep_link(&args) {
                log::info!("deep link target: {target}");
                show_main_window(app, None);
                publish_event(app, "navigate", serde_json::json!({ "target": target }));
            } else {
                show_main_window(app, None);
            }
        }))
        .register_uri_scheme_protocol("media", |ctx, request| media_protocol::handle(ctx, request))
        .register_uri_scheme_protocol("skin", |ctx, request| skin::handle(ctx, request))
        .setup(move |app| setup(app, dirs.clone(), headless))
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::set_config,
            commands::get_wallpapers,
            commands::get_playing_status,
            commands::get_screens,
            commands::show_wallpaper,
            commands::pause_wallpaper,
            commands::resume_wallpaper,
            commands::stop_wallpaper,
            commands::play_next_in_playlist,
            commands::play_prev_in_playlist,
            commands::set_volume,
            commands::get_wallpaper_time,
            commands::set_progress,
            commands::get_screen_coverage,
            commands::get_version,
            commands::get_real_theme_mode,
            commands::upload_to_tmp,
            commands::create_wallpaper_new,
            commands::update_wallpaper_new,
            commands::delete_wallpaper,
            commands::set_wallpaper_setting,
            commands::download_wallpaper,
            commands::cancel_download_wallpaper,
            commands::get_download_status,
            commands::get_download_item_status,
            commands::get_download_history,
            commands::clear_download_history,
            commands::remove_download_history_item,
            commands::open_url,
            commands::explore,
            commands::open_store_review,
            commands::open_log_folder,
            commands::show_folder_dialog,
            commands::show_shell,
            commands::hide_loading,
            commands::set_window_state,
            commands::open_community_window,
            commands::exit_app,
            commands::get_mpv_status,
            commands::download_mpv,
            commands::cancel_download_mpv,
            commands::list_skins,
            commands::set_active_skin,
            commands::open_skins_folder,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_app, event| {
        // headless 零窗口保活：窗口全部关闭触发的退出请求一律阻止
        // （托盘退出走 app.exit(0)，code = Some，不受影响）
        if let tauri::RunEvent::ExitRequested { code, api, .. } = event {
            if headless && code.is_none() {
                api.prevent_exit();
            }
        }
    });
}

/// 从命令行参数中提取深链目标。
fn extract_deep_link(args: &[String]) -> Option<String> {
    args.iter()
        .find(|a| a.starts_with(&format!("{DEEP_LINK_SCHEME}://")))
        .map(|a| a.trim_start_matches(&format!("{DEEP_LINK_SCHEME}://")).to_string())
}

/// 经 EventHub 发布事件（state 未就绪时退化为直接 emit）。
pub(crate) fn publish_event(
    app: &tauri::AppHandle,
    name: &str,
    payload: impl serde::Serialize,
) {
    use tauri::Emitter;
    let value = serde_json::to_value(&payload).unwrap_or(serde_json::Value::Null);
    match app.try_state::<AppState>() {
        Some(st) => st.hub.publish(name, value),
        None => {
            let _ = app.emit(name, value);
        }
    }
}

/// 创建主窗口（按当前皮肤解析加载目标）。可见性交由调用方控制。
pub(crate) fn build_main_window(
    app: &tauri::AppHandle,
) -> tauri::Result<tauri::WebviewWindow<tauri::Wry>> {
    let dirs = app
        .try_state::<AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve);
    let skin_id = skin::configured_skin_id(&dirs);
    let target = skin::main_window_target(&dirs, &skin_id);
    log::info!("main window target: skin={skin_id:?}");

    let handle = app.clone();
    let mut builder = tauri::WebviewWindowBuilder::new(app, "main", target.url)
        .title("巨应壁纸")
        .inner_size(1024.0, 680.0)
        .min_inner_size(800.0, 482.0)
        .center()
        .visible(false)
        // 去掉系统标题栏，由前端自绘（见 components/title-bar.tsx）
        .decorations(false)
        .initialization_script(HUB_COMPAT_SCRIPT);
    for script in target.extra_init_scripts {
        builder = builder.initialization_script(script);
    }
    // 启动屏兜底：app 型皮肤可能不调 hide_loading，页面加载完成后延时强制收尾，
    // 避免启动屏/主窗口永远卡在隐藏状态。正常路径下启动屏早已关闭，这里是空操作。
    let splash_fallback = app.clone();
    builder = builder.on_page_load(move |_, payload| {
        if payload.event() != tauri::webview::PageLoadEvent::Finished {
            return;
        }
        let app = splash_fallback.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(5));
            if app.get_webview_window("splashscreen").is_some() {
                log::info!("splash fallback: hide_loading not called after main window load, closing");
                finish_loading(&app);
            }
        });
    });
    builder
        // 社区页卡片“打开”等 target=_blank 请求默认被 WebView 拒绝，
        // 在这里接管：Hub 详情页开应用内新窗口，其余交给系统浏览器
        .on_new_window(move |url, features| handle_new_window_request(&handle, url, features))
        .build()
}

/// 主窗口公共行为：尺寸恢复 + 关闭隐藏到托盘 + 尺寸记录。
pub(crate) fn attach_main_window_handlers(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    {
        let st: tauri::State<AppState> = app.state();
        let restore = st.load_window_restore();
        if restore.width >= 800.0 && restore.height >= 482.0 {
            restore.apply(&window);
        }
    }
    {
        let handle = app.clone();
        window.on_window_event(move |event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // 点 X 只隐藏，留在托盘（与 v3 一致）
                api.prevent_close();
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            _ => {
                // 尺寸/最大化变化时记录（退出时持久化）
                if matches!(
                    event,
                    tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(true)
                ) {
                    if let Some(w) = handle.get_webview_window("main") {
                        let st: tauri::State<AppState> = handle.state();
                        let mut restorer = st.window_restorer.lock();
                        let captured = crate::state::WindowRestore::capture(&w);
                        if captured.width > 0.0 {
                            *restorer = captured;
                        }
                        if w.is_maximized().unwrap_or(false) {
                            restorer.maximized = true;
                        }
                    }
                }
            }
        });
    }
}

/// 唤起主窗口：存在则显示聚焦，不存在（headless / 已销毁）则按需创建。
pub(crate) fn show_main_window(app: &tauri::AppHandle, route: Option<&str>) {
    let window = match app.get_webview_window("main") {
        Some(window) => window,
        None => match build_main_window(app) {
            Ok(window) => {
                attach_main_window_handlers(app);
                window
            }
            Err(e) => {
                log::error!("create main window failed: {e}");
                return;
            }
        },
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    if let Some(route) = route {
        publish_event(app, "navigate", serde_json::json!({ "path": route }));
    }
}

/// 主窗口就绪收尾：关闭启动屏；除非配置了启动时隐藏，否则显示主窗口。
/// `hide_loading` 命令与 page load 兜底共用。
pub(crate) fn finish_loading(app: &tauri::AppHandle) {
    let hide = app
        .try_state::<AppState>()
        .map(|st| st.config.lock().general.hide_window)
        .unwrap_or(false);
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if !hide {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// 皮肤切换后让主窗口加载新皮肤。
///
/// 优先 `navigate`：销毁重建主窗口在 Windows 上会连带崩掉整个事件循环——
/// 切皮肤的 invoke 还挂在被销毁的 webview 上，进程秒死（日志止于
/// "a webview with label `main` already exists"，无 panic 输出）。navigate
/// 让同一个 webview 直接跳转到新皮肤 URL，无销毁、无闪烁、切换瞬时。
///
/// 仅当 navigate 不可用（style 型皮肤需要建窗时注入 init script、主窗口
/// 不存在需按需创建）或 navigate 失败时，才走兜底的销毁重建；兜底也必须
/// 在独立线程延后执行，给 IPC 收尾留时间，并在销毁后轮询等 label 真正注销。
pub(crate) fn recreate_main_window(app: &tauri::AppHandle) {
    let dirs = app
        .try_state::<AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve);
    let skin_id = skin::configured_skin_id(&dirs);
    let target = skin::main_window_target(&dirs, &skin_id);
    if let Some(window) = app.get_webview_window("main") {
        if target.extra_init_scripts.is_empty() {
            if let Some(url) = main_window_navigate_url(app, &target) {
                match window.navigate(url) {
                    Ok(()) => {
                        log::info!("main window navigated: skin={skin_id:?}");
                        return;
                    }
                    Err(e) => log::warn!("navigate main window failed, fallback to rebuild: {e}"),
                }
            }
        }
    }
    rebuild_main_window_async(app.clone());
}

/// 由加载目标算出可导航的具体 URL（`WebviewUrl::App` 的解析 tauri 未公开，
/// 按 devUrl / frontendDist / tauri 协议的形态自行推导）。
fn main_window_navigate_url(
    app: &tauri::AppHandle,
    target: &skin::MainWindowTarget,
) -> Option<tauri::Url> {
    let path = match &target.url {
        tauri::WebviewUrl::External(url) => return Some(url.clone()),
        tauri::WebviewUrl::App(path) => path.to_string_lossy().into_owned(),
        _ => return None,
    };
    let config = app.config();
    let base = if let Some(dev_url) = &config.build.dev_url {
        dev_url.clone()
    } else {
        match &config.build.frontend_dist {
            Some(tauri::utils::config::FrontendDist::Url(url)) => url.clone(),
            // frontendDist 为目录时走 tauri 协议（本项目未开 use_https_scheme）
            _ if cfg!(windows) => tauri::Url::parse("http://tauri.localhost/").ok()?,
            _ => tauri::Url::parse("tauri://localhost/").ok()?,
        }
    };
    base.join(&path).ok()
}

/// 兜底的销毁重建：独立线程延后执行（等当前 invoke 收尾），销毁后轮询等
/// 旧窗口真正注销（label 释放）再重建。
fn rebuild_main_window_async(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        crate::persist_window_state(&app);
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.destroy();
        }
        for _ in 0..30 {
            if app.get_webview_window("main").is_none() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        for attempt in 1..=5 {
            match build_main_window(&app) {
                Ok(window) => {
                    attach_main_window_handlers(&app);
                    let _ = window.show();
                    let _ = window.set_focus();
                    return;
                }
                Err(e) => {
                    log::warn!("recreate main window (attempt {attempt}) failed: {e}");
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }
        }
        log::error!("recreate main window failed after retries");
    });
}

fn build_splashscreen(app: &tauri::App) -> tauri::Result<tauri::WebviewWindow<tauri::Wry>> {
    tauri::WebviewWindowBuilder::new(
        app,
        "splashscreen",
        tauri::WebviewUrl::App("splash.html".into()),
    )
    .title("GiantappWallpaper")
    .inner_size(360.0, 240.0)
    .resizable(false)
    .decorations(false)
    .center()
    .skip_taskbar(true)
    .build()
}

fn setup(
    app: &mut tauri::App,
    dirs: AppDirs,
    headless: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    log::info!(
        "GiantappWallpaper v{APP_VERSION} starting (mode: {})",
        if headless { "headless" } else { "gui" }
    );

    // 事件枢纽：Tauri emit 与控制管道共用一条事件流
    let hub = events::EventHub::new();
    events::forward_to_tauri(&hub, app.handle().clone());

    // 窗口（headless 零窗口；GUI 启动屏 + 隐藏主窗口，加载完成后 hide_loading 显示）
    if !headless {
        build_splashscreen(app)?;
        build_main_window(app.handle())?;
    }

    // 注册深链协议（幂等）
    if let Ok(exe) = std::env::current_exe() {
        if let Err(e) = wallpaper_core::system::registry::register_uri_scheme(DEEP_LINK_SCHEME, &exe) {
            log::warn!("register uri scheme failed: {e}");
        }
    }

    // 配置
    let config = Arc::new(Mutex::new(ConfigStore::load(dirs.clone())));

    // 引擎宿主（内嵌播放器控制器；headless 下 webview 壁纸窗口仍按需隐藏创建）
    let player = internal_player::InternalPlayerController::new(app.handle().clone());

    // 引擎
    let host: Arc<dyn wallpaper_core::EngineHost> = player.clone();
    let api = {
        let host = host.clone();
        let dirs = dirs.clone();
        tauri::async_runtime::block_on(async move { WallpaperApi::init(host, dirs).await })
    };

    // 应用状态
    let downloads = {
        let hub_for_downloads = hub.clone();
        let emit: wallpaper_core::DownloadEventCallback = Arc::new(move |status| {
            hub_for_downloads.publish("download-status-changed", &status);
        });
        let history_path = dirs.config_file("download-history");
        Arc::new(DownloadManager::new(emit, Some(history_path)))
    };

    let launched_hidden = config.lock().general.hide_window;
    app.manage(AppState {
        api: api.clone(),
        dirs: dirs.clone(),
        config: config.clone(),
        downloads,
        player,
        window_restorer: Mutex::new(state::WindowRestore::default()),
        hub: hub.clone(),
        headless,
    });

    // 引擎状态变化 -> 广播 + 快照
    {
        use std::sync::Weak;
        let hub_for_change = hub.clone();
        let api_weak: Weak<WallpaperApi> = Arc::downgrade(&api);
        api.set_on_change(Box::new(move || {
            hub_for_change.publish("playing-status-changed", ());
            if let Some(api) = api_weak.upgrade() {
                tauri::async_runtime::spawn(async move {
                    api.save_snapshot().await;
                });
            }
        }));
    }

    // 系统事件
    system_events::start(hub.clone(), api.clone());

    // 皮肤目录热监听：当前皮肤文件变化 -> refresh-page 整页刷新（热更新开发）
    skin_watch::start(app.handle().clone());

    // 恢复快照（含 v3 导入）
    {
        let api = api.clone();
        tauri::async_runtime::spawn(async move {
            let legacy = api.import_v3_snapshot();
            api.restore_from_snapshot(legacy).await;
            api.notify_change();
        });
    }

    // 主窗口行为（GUI 启动 / headless 按需创建时都要挂）
    if !headless {
        attach_main_window_handlers(app.handle());
    }

    // 首次启动的深链参数（livewallpaper4://...）：headless 下同时唤起界面
    if let Some(target) = extract_deep_link(&std::env::args().collect::<Vec<_>>()) {
        if headless {
            show_main_window(app.handle(), None);
        }
        publish_event(app.handle(), "navigate", serde_json::json!({ "target": target }));
    }

    // 托盘（GUI / headless 均保留，提供退出与唤起入口）
    tray::create(app.handle())?;

    // 启动显示策略
    if !headless && !launched_hidden {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
        }
    }

    // 本地控制管道：CLI / 外部脚本的控制面（所有模式）
    control::start(app.handle().clone(), hub.clone());

    log::info!("setup done");
    Ok(())
}

pub(crate) fn is_hub_origin(url: &tauri::Url) -> bool {
    HUB_ORIGINS.contains(&url.origin().ascii_serialization().as_str())
}

/// OAuth 授权页地址（GitHub / 微信扫码）。只匹配路径避免误伤普通分享链接。
fn is_oauth_url(url: &tauri::Url) -> bool {
    let (host, path) = (url.host_str().unwrap_or(""), url.path());
    match host {
        "github.com" => path.starts_with("/login") || path.starts_with("/sso") || path.starts_with("/session"),
        "open.weixin.qq.com" => path.starts_with("/connect"),
        _ => false,
    }
}

/// 新窗口请求入口（社区页“打开”即 target=_blank / window.open）。
/// Hub 页面 -> 应用内新窗口；其余 http(s) -> 系统浏览器；其他一律拒绝。
fn handle_new_window_request(
    app: &tauri::AppHandle,
    url: tauri::Url,
    features: tauri::webview::NewWindowFeatures,
) -> tauri::webview::NewWindowResponse<tauri::Wry> {
    if is_hub_origin(&url) {
        let label = format!("hub-detail-{}", next_hub_window_seq());
        match build_hub_popup(app, &label, url, features) {
            Ok(_) => {}
            Err(e) => log::warn!("create hub detail window failed: {e}"),
        }
        // 无论创建成功与否都拒绝 WebView2 的默认新窗口流程：
        // Create/SetNewWindow 会让 WebView2 用目标 URL 导航我们创建的外壳页，
        // 外壳（本地 frame 的中继接收器）必须存活才能代远程页执行桥调用。
        return tauri::webview::NewWindowResponse::Deny;
    }

    // GitHub / 微信授权页：改用应用内顶层窗口承载。授权页禁止被 iframe 嵌套，
    // 转系统浏览器又会把登录会话留在浏览器的 Cookie 罐里；顶层窗口里完成的
    // 登录会话以第一方身份写入应用共享的 WebView2 Cookie 罐，社区页可直接复用。
    if is_oauth_url(&url) {
        let label = format!("oauth-{}", next_hub_window_seq());
        if let Err(e) = build_oauth_window(app, &label, url) {
            log::warn!("create oauth window failed: {e}");
        }
        return tauri::webview::NewWindowResponse::Deny;
    }

    // window.open('about:blank') 先占位、再由站点脚本设置地址的弹窗式授权
    // （GitHub 登录的常见写法）：此前一律 Deny，window.open 返回 null，
    // 站点脚本直接断掉，表现为“弹窗无法打开”。现在用 Create 把自己创建的
    // 空白窗口交给站点导航，OAuth 全程仍在可控窗口内（回调检测、Cookie
    // 回灌继续生效）；直接 Allow 会产生不受控的原生弹窗，无法回灌登录态。
    if url.as_str() == "about:blank" {
        let label = format!("oauth-{}", next_hub_window_seq());
        return match build_oauth_window(app, &label, "about:blank".parse().unwrap()) {
            Ok(window) => tauri::webview::NewWindowResponse::Create { window },
            Err(e) => {
                log::warn!("create blank oauth window failed: {e}");
                tauri::webview::NewWindowResponse::Deny
            }
        };
    }

    if matches!(url.scheme(), "http" | "https") {
        let url = url.to_string();
        std::thread::spawn(move || {
            if let Err(e) = wallpaper_core::system::open_url(&url) {
                log::warn!("open url in browser failed: {e}");
            }
        });
    }
    tauri::webview::NewWindowResponse::Deny
}

/// 社区壁纸详情弹窗：加载本地外壳页 hub-detail.html 承载远程详情页。
/// 远程 origin 无权直接 invoke 应用命令（ACL），外壳页的接收器负责
/// 执行 hub_compat 中继过来的桥调用（与主窗口 hub iframe 同一机制）。
fn build_hub_popup(
    app: &tauri::AppHandle,
    label: &str,
    url: tauri::Url,
    features: tauri::webview::NewWindowFeatures,
) -> tauri::Result<tauri::WebviewWindow<tauri::Wry>> {
    use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
    use tauri::WebviewUrl;

    let handle = app.clone();
    // 请求未带位置时居中显示（center 标志在构建时总会覆盖显式位置，故互斥处理）
    let has_position = features.position().is_some();
    // 唯一 query 破缓存，确保外壳页始终为最新
    let shell = format!(
        "hub-detail.html?w={}#{}",
        label,
        utf8_percent_encode(url.as_str(), NON_ALPHANUMERIC)
    );
    let builder =
        tauri::WebviewWindowBuilder::new(app, label, WebviewUrl::App(shell.into()))
            .title("巨应壁纸")
            .inner_size(1100.0, 780.0)
            .min_inner_size(700.0, 500.0)
            // 立即显示：深色底 + 外壳页加载动画先出现，远程详情页在窗口内继续加载。
            // 之前 visible(false) + 页面 Finished 才 show，会等远程 iframe 整页
            // 加载完（HTML/JS/图片全下完）才弹窗，点击后体感数秒无响应。
            .visible(true)
            .background_color(tauri::utils::config::Color(20, 20, 20, 255))
            .window_features(features)
            .initialization_script(HUB_COMPAT_SCRIPT)
            .on_new_window(move |url, features| handle_new_window_request(&handle, url, features))
            .on_document_title_changed(|window, title| {
                let _ = window.set_title(&title);
            });

    if has_position {
        builder.build()
    } else {
        builder.center().build()
    }
}

/// OAuth 登录窗口：顶层直接加载授权页（GitHub/微信）或 about:blank 空白页
/// （弹窗式授权，由站点脚本导航），顶层导航不受 X-Frame-Options 限制，登录
/// 产生的会话 Cookie 以第一方身份写入应用共享的 WebView2 Cookie 罐。
/// 跳去授权域后又回到社区域名视为登录完成，稍候自动关窗。无论哪种登录方式
/// （密码 / GitHub / 微信弹窗 / 扫码内嵌），会话同步统一在窗口销毁时做：
/// 先把站点 Cookie 原地改写为 SameSite=None（否则跨站 iframe 请求不携带
/// Lax Cookie，社区页看不到登录态），再广播 hub-session-changed，主窗口
/// 收到后重载社区页 iframe。
pub(crate) fn build_oauth_window(
    app: &tauri::AppHandle,
    label: &str,
    url: tauri::Url,
) -> tauri::Result<tauri::WebviewWindow<tauri::Wry>> {
    // 是否已离开过社区域名（= 走过一次外部授权页）。用于支持直接从社区域名
    // 打开的登录窗口：只有在“离开→回来”后关窗，避免刚打开就被误关。
    let went_external = Arc::new(AtomicBool::new(false));
    let flag = went_external.clone();

    log::info!("oauth window building: label={label} url={url}");
    let build_result = tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::External(url))
        .title("账号登录")
        .inner_size(1024.0, 720.0)
        .min_inner_size(420.0, 480.0)
        .center()
        .visible(true)
        .background_color(tauri::utils::config::Color(20, 20, 20, 255))
        .on_page_load(move |window, payload| {
            if payload.event() != tauri::webview::PageLoadEvent::Finished {
                return;
            }
            log::info!("oauth window page load finished: {}", payload.url());
            let on_hub = window.url().map(|u| is_hub_origin(&u)).unwrap_or(false);
            if !on_hub {
                flag.store(true, Ordering::Relaxed);
                return;
            }
            if !flag.swap(false, Ordering::Relaxed) {
                return;
            }
            // 授权后回到社区：稍候关窗。Cookie 改写与广播统一在 Destroyed 里做。
            // 延迟要给站点客户端侧的会话建立留足时间（如微信登录信号回到主
            // 窗口后还要发 signIn/update 请求），关早了会话 Cookie 尚未落盘。
            let win = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(2000));
                let _ = win.close();
            });
        })
        .build();
    if let Err(e) = &build_result {
        log::warn!("oauth window build failed: {e}");
    }
    let window = build_result?;

    // 窗口销毁时广播：服务端会话 Cookie 为 SameSite=None 后，跨站 iframe
    // 可直接携带会话，重载社区页即可看到最新登录态（覆盖密码/微信/GitHub
    // 登录以及手动关窗；自动关窗路径同样由 Destroyed 触发，无需重复广播）。
    let app_handle = window.app_handle().clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            let app = app_handle.clone();
            std::thread::spawn(move || {
                publish_event(&app, "hub-session-changed", ());
            });
        }
    });

    Ok(window)
}


/// 退出前持久化窗口状态（在 quit 中调用）。
pub fn persist_window_state(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let st: tauri::State<AppState> = app.state();
        let mut restorer = st.window_restorer.lock();
        let captured = state::WindowRestore::capture(&w);
        if captured.width > 0.0 {
            *restorer = captured;
        }
        if w.is_maximized().unwrap_or(false) {
            restorer.maximized = true;
        }
        st.save_window_restore(&restorer);
    }
}
