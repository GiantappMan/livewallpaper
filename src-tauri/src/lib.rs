//! 应用装配：插件、托盘、系统事件、媒体协议、状态初始化与命令注册。

mod commands;
mod internal_player;
mod logger;
mod media_protocol;
mod state;
mod system_events;
mod tray;
mod urls;

use parking_lot::Mutex;
use state::AppState;
use std::sync::atomic::{AtomicU32, Ordering};
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

pub fn run() {
    let dirs = AppDirs::resolve();
    if let Err(e) = dirs.ensure() {
        eprintln!("init data dir failed: {e}");
    }
    logger::init(&dirs);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 二次启动：深链参数转发 + 唤起主窗口
            log::info!("single-instance args: {args:?}");
            if let Some(target) = extract_deep_link(&args) {
                use tauri::Emitter;
                log::info!("deep link target: {target}");
                let _ = app.emit("navigate", serde_json::json!({ "target": target }));
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .register_uri_scheme_protocol("media", |ctx, request| media_protocol::handle(ctx, request))
        .setup(move |app| {
            setup(app, dirs.clone())
        })
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
            commands::exit_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app, _event| {});
}

/// 从命令行参数中提取深链目标。
fn extract_deep_link(args: &[String]) -> Option<String> {
    args.iter()
        .find(|a| a.starts_with(&format!("{DEEP_LINK_SCHEME}://")))
        .map(|a| a.trim_start_matches(&format!("{DEEP_LINK_SCHEME}://")).to_string())
}

fn is_hub_origin(url: &tauri::Url) -> bool {
    HUB_ORIGINS.contains(&url.origin().ascii_serialization().as_str())
}

/// 新窗口请求入口（社区页“打开”即 target=_blank / window.open）。
/// Hub 页面 -> 应用内新窗口；其余 http(s) -> 系统浏览器；其他一律拒绝。
fn handle_new_window_request(
    app: &tauri::AppHandle,
    url: tauri::Url,
    features: tauri::webview::NewWindowFeatures,
) -> tauri::webview::NewWindowResponse<tauri::Wry> {
    if is_hub_origin(&url) {
        let n = HUB_WINDOW_SEQ.fetch_add(1, Ordering::Relaxed);
        let label = format!("hub-detail-{n}");
        match build_hub_popup(app, &label, n, url, features) {
            Ok(_) => {}
            Err(e) => log::warn!("create hub detail window failed: {e}"),
        }
        // 无论创建成功与否都拒绝 WebView2 的默认新窗口流程：
        // Create/SetNewWindow 会让 WebView2 用目标 URL 导航我们创建的外壳页，
        // 外壳（本地 frame 的中继接收器）必须存活才能代远程页执行桥调用。
        return tauri::webview::NewWindowResponse::Deny;
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
    seq: u32,
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
        seq,
        utf8_percent_encode(url.as_str(), NON_ALPHANUMERIC)
    );
    let builder =
        tauri::WebviewWindowBuilder::new(app, label, WebviewUrl::App(shell.into()))
            .title("巨应壁纸")
            .inner_size(1100.0, 780.0)
            .min_inner_size(700.0, 500.0)
            .visible(false)
            .window_features(features)
            .initialization_script(HUB_COMPAT_SCRIPT)
            .on_new_window(move |url, features| handle_new_window_request(&handle, url, features))
            .on_document_title_changed(|window, title| {
                let _ = window.set_title(&title);
            })
            .on_page_load(|window, payload| {
                if payload.event() == tauri::webview::PageLoadEvent::Finished {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });

    if has_position {
        builder.build()
    } else {
        builder.center().build()
    }
}

fn setup(app: &mut tauri::App, dirs: AppDirs) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("GiantappWallpaper v{APP_VERSION} starting");

    // 创建主窗口（Rust 创建以便注入 Hub 兼容层初始化脚本）
    {
        use tauri::WebviewUrl;
        let handle = app.handle().clone();
        tauri::WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
            .title("巨应壁纸")
            .inner_size(1024.0, 680.0)
            .min_inner_size(800.0, 482.0)
            .center()
            .visible(false)
            // 去掉系统标题栏，由前端自绘（见 components/title-bar.tsx）
            .decorations(false)
            .initialization_script(HUB_COMPAT_SCRIPT)
            // 社区页卡片“打开”等 target=_blank 请求默认被 WebView 拒绝，
            // 在这里接管：Hub 详情页开应用内新窗口，其余交给系统浏览器
            .on_new_window(move |url, features| handle_new_window_request(&handle, url, features))
            .build()?;
    }

    // 注册深链协议（幂等）
    if let Ok(exe) = std::env::current_exe() {
        if let Err(e) = wallpaper_core::system::registry::register_uri_scheme(DEEP_LINK_SCHEME, &exe) {
            log::warn!("register uri scheme failed: {e}");
        }
    }

    // 配置
    let config = Arc::new(Mutex::new(ConfigStore::load(dirs.clone())));

    // 引擎宿主（内嵌播放器控制器）
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
        let handle = app.handle().clone();
        let emit: wallpaper_core::DownloadEventCallback = Arc::new(move |status| {
            use tauri::Emitter;
            let _ = handle.emit("download-status-changed", &status);
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
    });

    // 引擎状态变化 -> 通知前端 + 快照
    {
        use std::sync::Weak;
        let handle = app.handle().clone();
        let api_weak: Weak<WallpaperApi> = Arc::downgrade(&api);
        api.set_on_change(Box::new(move || {
            use tauri::Emitter;
            let _ = handle.emit("playing-status-changed", ());
            if let Some(api) = api_weak.upgrade() {
                tauri::async_runtime::spawn(async move {
                    api.save_snapshot().await;
                });
            }
        }));
    }

    // 系统事件
    system_events::start(app.handle().clone(), api.clone());

    // 恢复快照（含 v3 导入）
    {
        let api = api.clone();
        tauri::async_runtime::spawn(async move {
            let legacy = api.import_v3_snapshot();
            api.restore_from_snapshot(legacy).await;
            api.notify_change();
        });
    }

    // 主窗口尺寸恢复 + 关闭行为
    if let Some(window) = app.get_webview_window("main") {
        {
            let st: tauri::State<AppState> = app.state();
            let restore = st.load_window_restore();
            if restore.width >= 800.0 && restore.height >= 482.0 {
                restore.apply(&window);
            }
        }
        {
            let handle = app.handle().clone();
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

    // 首次启动的深链参数（livewallpaper4://...）
    if let Some(target) = extract_deep_link(&std::env::args().collect::<Vec<_>>()) {
        use tauri::Emitter;
        let _ = app.handle().emit("navigate", serde_json::json!({ "target": target }));
    }

    // 托盘
    tray::create(app.handle())?;

    // 启动显示策略
    if !launched_hidden {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
        }
    }

    log::info!("setup done");
    Ok(())
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
