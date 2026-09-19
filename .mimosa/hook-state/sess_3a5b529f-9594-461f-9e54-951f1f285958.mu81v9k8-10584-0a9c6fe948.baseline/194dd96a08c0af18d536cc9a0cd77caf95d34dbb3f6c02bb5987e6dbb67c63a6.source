//! 系统事件转发：显示器变化 / 锁屏 / 主题切换 -> 引擎处理 + 事件广播
//! （经 EventHub 同时到达前端与控制管道）。

use crate::events::EventHub;
use std::sync::Arc;
use wallpaper_core::system::events as sys_events;
use wallpaper_core::WallpaperApi;

pub fn start(hub: EventHub, api: Arc<WallpaperApi>) {
    wallpaper_core::system::events::start();
    let (tx, rx) = std::sync::mpsc::channel::<sys_events::SystemEvent>();
    sys_events::subscribe(tx);

    let hub_for_thread = hub.clone();
    std::thread::Builder::new()
        .name("wp4-event-forward".into())
        .spawn(move || {
            for event in rx {
                handle_event(hub_for_thread.clone(), api.clone(), event);
            }
        })
        .ok();

    // 启动后同步一次系统主题
    publish_theme(&hub, wallpaper_core::system::registry::is_dark_mode());
}

fn publish_theme(hub: &EventHub, dark: bool) {
    hub.publish(
        "system-theme-changed",
        serde_json::json!({ "mode": if dark { "dark" } else { "light" } }),
    );
}

fn handle_event(hub: EventHub, api: Arc<WallpaperApi>, event: sys_events::SystemEvent) {
    use sys_events::SystemEvent;
    tauri::async_runtime::spawn(async move {
        match event {
            SystemEvent::DisplayChanged => {
                api.handle_display_changed().await;
                hub.publish("refresh-page", ());
            }
            SystemEvent::SessionLock => {
                api.handle_lock().await;
            }
            SystemEvent::SessionUnlock => {
                api.handle_unlock().await;
            }
            SystemEvent::ThemeChanged { dark } => {
                publish_theme(&hub, dark);
            }
        }
    });
}
