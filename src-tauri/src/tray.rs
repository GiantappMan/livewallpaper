//! 托盘：关于 / 打开主面板 / 设置 / 退出，双击唤起主窗口。

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

const ABOUT_URL: &str = "https://github.com/GiantappMan/livewallpaper";
/// 注册表自启值名。
pub const AUTOSTART_NAME: &str = "GiantappWallpaper";

struct TrayTexts {
    about: &'static str,
    open: &'static str,
    settings: &'static str,
    exit: &'static str,
}

fn texts(lang: &str) -> TrayTexts {
    match lang {
        "zh" => TrayTexts {
            about: "关于",
            open: "打开主面板",
            settings: "设置",
            exit: "退出",
        },
        "ru" => TrayTexts {
            about: "О программе",
            open: "Открыть панель",
            settings: "Настройки",
            exit: "Выход",
        },
        "es" => TrayTexts {
            about: "Acerca de",
            open: "Abrir panel",
            settings: "Ajustes",
            exit: "Salir",
        },
        _ => TrayTexts {
            about: "About",
            open: "Open main panel",
            settings: "Settings",
            exit: "Exit",
        },
    }
}

/// （重新）创建托盘。语言切换时调用以更新文案。
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let lang = {
        
        let state: tauri::State<crate::state::AppState> = app.state();
        let guard = state.config.lock();
        guard.general.current_lan.clone()
    };
    let t = texts(&lang);

    let about = MenuItem::with_id(app, "about", t.about, true, None::<&str>)?;
    let open = MenuItem::with_id(app, "open", t.open, true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", t.settings, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", t.exit, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&about, &open, &settings, &quit])?;

    let icon = app
        .default_window_icon()
        .cloned()
        .expect("missing window icon");

    // 重建时移除旧托盘
    if let Some(old) = app.tray_by_id("main-tray") {
        let _ = old.set_visible(false);
    }

    let builder = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("GiantappWallpaper")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "about" => {
                let _ = wallpaper_core::system::open_url(ABOUT_URL);
            }
            "open" => show_main(app, None),
            "settings" => show_main(app, Some("settings")),
            "quit" => {
                crate::tray::quit(app.clone());
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle(), None);
            }
        });

    builder.build(app)?;
    Ok(())
}

fn show_main(app: &AppHandle, route: Option<&str>) {
    // headless / 窗口已销毁时按需创建
    crate::show_main_window(app, route);
}

/// 应用退出：按 KeepWallpaper 配置清理壁纸与快照。
pub fn quit(app: AppHandle) {
    crate::persist_window_state(&app);
    let keep = {
        let state: tauri::State<crate::state::AppState> = app.state();
        let guard = state.config.lock();
        guard.wallpaper.keep_wallpaper_field()
    };
    let api = {
        let state: tauri::State<crate::state::AppState> = app.state();
        state.api.clone()
    };
    // 退出可能来自 tokio 上下文（控制管道 app.quit）：block_on 不允许嵌套在
    // 运行时线程内，放独立线程执行并等待完成。
    std::thread::scope(|s| {
        s.spawn(|| {
            tauri::async_runtime::block_on(async move {
                api.dispose(keep).await;
            });
        });
    });
    app.exit(0);
}
