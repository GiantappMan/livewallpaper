//! wallpaper-core：巨应壁纸 v4 引擎。
//! UI 框架无关（不依赖 Tauri），宿主能力通过 [`host::EngineHost`] 注入，
//! 视频播放器通过 [`player::PlayerFactory`] / [`player::PlayerEngine`] 接入。

pub mod api;
pub mod config;
pub mod dirs;
pub mod download;
pub mod host;
pub mod library;
pub mod manager;
pub mod models;
pub mod player;
pub mod system;
pub mod window_state;

#[cfg(windows)]
pub mod mpv;

pub use api::WallpaperApi;
pub use config::{ConfigAppearance, ConfigGeneral, ConfigStore, ConfigWallpaper};
pub use dirs::AppDirs;
pub use download::{
    DownloadEventCallback, DownloadHistoryItem, DownloadItem, DownloadManager, DownloadStatus,
};
pub use host::{EngineHost, NullHost};
pub use manager::ScreenSnapshot;
pub use models::prelude::*;
pub use player::{
    MediaSource, PlayerConfig, PlayerEngine, PlayerFactory, PlayerRegistry, PlayerSnapshot,
};
