//! 共享应用状态。

use parking_lot::Mutex;
use std::sync::Arc;
use wallpaper_core::{AppDirs, ConfigStore, DownloadManager, WallpaperApi};

use crate::internal_player::InternalPlayerController;

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WindowRestore {
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

impl WindowRestore {
    pub fn apply(&self, window: &tauri::WebviewWindow) {
        if self.width >= 800.0 && self.height >= 482.0 {
            let _ = window.set_size(tauri::LogicalSize::new(self.width, self.height));
        }
        if self.maximized {
            let _ = window.maximize();
        }
    }

    /// 从主窗口读取当前状态。
    pub fn capture(window: &tauri::WebviewWindow) -> Self {
        let maximized = window.is_maximized().unwrap_or(false);
        if maximized {
            // 最大化时保留上次的常规尺寸（由调用方合并）
            return Self::default();
        }
        if let Ok(size) = window.inner_size() {
            let scale = window.scale_factor().unwrap_or(1.0);
            return Self {
                width: size.width as f64 / scale,
                height: size.height as f64 / scale,
                maximized,
            };
        }
        Self::default()
    }
}

pub struct AppState {
    pub api: Arc<WallpaperApi>,
    pub dirs: AppDirs,
    pub config: Arc<Mutex<ConfigStore>>,
    pub downloads: Arc<DownloadManager>,
    pub player: Arc<InternalPlayerController>,
    pub window_restorer: Mutex<WindowRestore>,
}

impl AppState {
    fn window_file(&self) -> std::path::PathBuf {
        self.dirs.config_file("window")
    }

    pub fn load_window_restore(&self) -> WindowRestore {
        std::fs::read_to_string(self.window_file())
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default()
    }

    pub fn save_window_restore(&self, restore: &WindowRestore) {
        if let Ok(text) = serde_json::to_string(restore) {
            let _ = std::fs::write(self.window_file(), text);
        }
    }
}
