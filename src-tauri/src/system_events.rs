//! 系统事件转发：显示器变化 / 锁屏 / 主题切换 -> 引擎处理 + 前端事件。

use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use wallpaper_core::system::events as sys_events;
use wallpaper_core::WallpaperApi;

pub fn start(app: AppHandle, api: Arc<WallpaperApi>) {
    wallpaper_core::system::events::start();
    let (tx, rx) = std::sync::mpsc::channel::<sys_events::SystemEvent>();
    sys_events::subscribe(tx);

    let app_for_thread = app.clone();
    std::thread::Builder::new()
        .name("wp4-event-forward".into())
        .spawn(move || {
            
            let app = app_for_thread;
            for event in rx {
                handle_event(app.clone(), api.clone(), event);
            }
        })
        .ok();

    // 启动后同步一次系统主题
    let dark = wallpaper_core::system::registry::is_dark_mode();
    let _ = app.emit(
        "system-theme-changed",
        serde_json::json!({ "mode": if dark { "dark" } else { "light" } }),
    );
}

fn handle_event(app: AppHandle, api: Arc<WallpaperApi>, event: sys_events::SystemEvent) {
    use sys_events::SystemEvent;
    tauri::async_runtime::spawn(async move {
        match event {
            SystemEvent::DisplayChanged => {
                api.handle_display_changed().await;
                let _ = app.emit("refresh-page", ());
            }
            SystemEvent::SessionLock => {
                api.handle_lock().await;
            }
            SystemEvent::SessionUnlock => {
                api.handle_unlock().await;
            }
            SystemEvent::ThemeChanged { dark } => {
                let _ = app.emit(
                    "system-theme-changed",
                    serde_json::json!({ "mode": if dark { "dark" } else { "light" } }),
                );
            }
        }
    });
}
