#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use tauri::{CustomMenuItem, Manager, SystemTrayMenu, SystemTrayMenuItem};
use tauri::{SystemTray, SystemTrayEvent};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn create_tray(app: &tauri::App) -> tauri::Result<()> {
    let about = CustomMenuItem::new("about".to_string(), "About");
    let local = CustomMenuItem::new("local".to_string(), "Local");
    let community = CustomMenuItem::new("community".to_string(), "Community");
    let settings = CustomMenuItem::new("settings".to_string(), "Settings");
    let exit = CustomMenuItem::new("exit".to_string(), "Exit");
    let tray_menu = SystemTrayMenu::new()
        .add_item(about)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(local)
        .add_item(community)
        .add_item(settings)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(exit);

    let handle = app.handle();
    let tray_id = "LiveWallpaper3".to_string();
    SystemTray::new()
        .with_id(&tray_id)
        .with_menu(tray_menu)
        .on_event(move |event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    if id == "exit" {
                        // exit the app
                        handle.exit(0);
                    } else if id == "about" {
                    }
                }
                SystemTrayEvent::DoubleClick {
                    position: _,
                    size: _,
                    ..
                } => {
                    let window = handle.get_window("main");
                    if window.is_some() {
                        let window = window.unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    } else {
                        let main_window = tauri::WindowBuilder::new(
                            &handle,
                            "main",
                            tauri::WindowUrl::App("index.html".into()),
                        )
                        .build()
                        .expect("failed to create main window");
                        main_window.set_title("LiveWallpaper3").unwrap();
                        //center 会动一下 https://github.com/tauri-apps/tauri/issues/4777
                        main_window.center().unwrap();
                        main_window.show().unwrap();
                    }
                }
                _ => {}
            }
        })
        .build(app)
        .map(|_| ())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            create_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            //Keep the app running in the background after closing all windows
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
}
