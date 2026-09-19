//! 领域模型。JSON 字段名与 v3 客户端保持一致（camelCase，含 `authorID`、`IsCanceled`
//! 两个历史命名），保证社区 Hub 页面与旧数据的兼容。

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub mod prelude {
    pub use super::*;
}

/// 壁纸类型（数值与 v3 对齐）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[repr(i32)]
#[derive(serde_repr::Serialize_repr, serde_repr::Deserialize_repr)]
pub enum WallpaperType {
    #[default]
    NotSupported = 0,
    Img = 1,
    AnimatedImg = 2,
    Video = 3,
    Web = 4,
    Exe = 5,
    Playlist = 6,
}

/// 视频播放引擎。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[repr(i32)]
#[derive(serde_repr::Serialize_repr, serde_repr::Deserialize_repr)]
pub enum VideoPlayer {
    #[default]
    DefaultPlayer = 0,
    Mpv = 1,
    /// v4 语义：应用内嵌 WebView 播放器窗口（v3 为独立 WPF 播放器进程）。
    System = 2,
}

/// 播放列表播放模式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[repr(i32)]
#[derive(serde_repr::Serialize_repr, serde_repr::Deserialize_repr)]
pub enum PlayMode {
    #[default]
    Order = 0,
    Random = 1,
    /// 定时切换：与 Order 一致，但优先尊重每项的 duration。
    Timer = 2,
}

/// 壁纸被窗口完全遮挡时的行为。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[repr(i32)]
#[derive(serde_repr::Serialize_repr, serde_repr::Deserialize_repr)]
pub enum CoveredBehavior {
    #[default]
    None = 0,
    Pause = 1,
    Stop = 2,
}

/// 静态图片的桌面填充方式（与 IDesktopWallpaper 的 DWPOS 对应）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[repr(i32)]
#[derive(serde_repr::Serialize_repr, serde_repr::Deserialize_repr)]
pub enum Fit {
    Center = 0,
    Tile = 1,
    Stretch = 2,
    Fit = 3,
    #[default]
    Fill = 4,
    Span = 5,
}

/// 支持的文件扩展名分类。
pub mod file_types {
    pub const IMG: &[&str] = &[".jpg", ".jpeg", ".bmp", ".png", ".jfif", ".avif"];
    pub const VIDEO: &[&str] = &[".mp4", ".flv", ".blv", ".avi", ".mov", ".webm", ".mkv"];
    pub const WEB: &[&str] = &[".html", ".htm"];
    pub const EXE: &[&str] = &[".exe"];
    pub const ANIMATED: &[&str] = &[".gif", ".webp"];
    pub const PLAYLIST: &[&str] = &[".playlist"];
    /// 兼容 v2 的播放列表占位扩展名。
    pub const LEGACY_GROUP: &[&str] = &[".group"];
}

pub fn extension_of(path: &Path) -> String {
    path.extension()
        .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
        .unwrap_or_default()
}

pub fn wallpaper_type_of_file(path: &Path) -> WallpaperType {
    let ext = extension_of(path);
    match ext.as_str() {
        e if file_types::IMG.contains(&e) => WallpaperType::Img,
        e if file_types::VIDEO.contains(&e) => WallpaperType::Video,
        e if file_types::WEB.contains(&e) => WallpaperType::Web,
        e if file_types::EXE.contains(&e) => WallpaperType::Exe,
        e if file_types::ANIMATED.contains(&e) => WallpaperType::AnimatedImg,
        e if file_types::PLAYLIST.contains(&e) => WallpaperType::Playlist,
        e if file_types::LEGACY_GROUP.contains(&e) => WallpaperType::Playlist,
        _ => WallpaperType::NotSupported,
    }
}

/// 壁纸的展示/运行信息（由服务端填充，客户端只读）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RunningInfo {
    pub screen_indexes: Vec<u32>,
    pub is_paused: bool,
}

/// 壁纸元数据，存储为 `.metadata/<name>.meta.json`。
/// 字段存在但值为 null 时回退默认（v3 元数据中大量出现 null）。
fn null_as_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de> + Default,
{
    let value: Option<T> = serde::Deserialize::deserialize(deserializer)?;
    Ok(value.unwrap_or_default())
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WallpaperMeta {
    pub id: Option<String>,
    #[serde(deserialize_with = "null_as_default")]
    pub title: String,
    #[serde(deserialize_with = "null_as_default")]
    pub description: String,
    /// 封面文件名（相对媒体所在目录）。
    pub cover: Option<String>,
    #[serde(deserialize_with = "null_as_default")]
    pub author: Option<String>,
    #[serde(rename = "authorID", deserialize_with = "null_as_default")]
    pub author_id: Option<String>,
    pub create_time: Option<chrono::DateTime<chrono::Local>>,
    pub update_time: Option<chrono::DateTime<chrono::Local>>,
    #[serde(rename = "type")]
    pub wallpaper_type: WallpaperType,
    pub play_index: u32,
    /// 播放列表成员。
    pub wallpapers: Vec<Wallpaper>,
}

impl WallpaperMeta {
    pub fn is_playlist(&self) -> bool {
        self.wallpaper_type == WallpaperType::Playlist
    }

    /// 保证元数据有稳定 Id：优先已有 Id，其次文件名，最后生成 GUID。
    pub fn ensure_id(&mut self, file: &Path) -> String {
        if let Some(id) = &self.id {
            if !id.is_empty() {
                return id.clone();
            }
        }
        let id = file
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        self.id = Some(id.clone());
        id
    }
}

/// 单个壁纸的播放设置，存储为 `.metadata/<name>.setting.json`。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WallpaperSetting {
    /// 播放列表中该项的展示时长，"HH:MM" 或 "HH:MM:SS"。
    pub duration: Option<String>,
    /// web / exe 壁纸：是否允许鼠标交互（穿透开关）。
    pub enable_mouse_event: bool,
    /// 视频：硬件解码。
    pub hardware_decoding: bool,
    /// 视频：填充放大（裁剪黑边）；false 为保持宽高比。
    pub is_pan_scan: bool,
    pub video_player: VideoPlayer,
    pub play_mode: PlayMode,
    /// 静态图：填充方式。
    pub fit: Fit,
    /// 静态图：退出时恢复原桌面壁纸。
    pub keep_wallpaper: bool,
    /// 播放器窗口是否嵌入桌面（WorkerW）。false = 独立可见窗口（调试 / 预览用）。
    pub embed_desktop: bool,
}

impl Default for WallpaperSetting {
    fn default() -> Self {
        Self {
            duration: None,
            enable_mouse_event: true,
            hardware_decoding: true,
            is_pan_scan: true,
            video_player: VideoPlayer::DefaultPlayer,
            play_mode: PlayMode::Order,
            fit: Fit::Fill,
            keep_wallpaper: true,
            embed_desktop: true,
        }
    }
}

impl WallpaperSetting {
    /// "HH:MM" / "HH:MM:SS" -> 秒。
    pub fn duration_seconds(&self) -> Option<u64> {
        parse_duration(self.duration.as_deref()?)
    }
}

pub fn parse_duration(text: &str) -> Option<u64> {
    let parts: Vec<&str> = text.trim().split(':').collect();
    let nums: Vec<u64> = parts.iter().filter_map(|p| p.trim().parse().ok()).collect();
    match nums.len() {
        2 => Some(nums[0] * 3600 + nums[1] * 60),
        3 => Some(nums[0] * 3600 + nums[1] * 60 + nums[2]),
        _ => None,
    }
}

/// 壁纸对象：本地媒体 + 元数据 + 设置 + 运行信息。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Wallpaper {
    /// 所在媒体库目录（绝对路径）。
    pub dir: Option<PathBuf>,
    pub file_name: Option<String>,
    /// 展示用 URL（media 协议），由 Api 层填充。
    pub file_url: Option<String>,
    pub file_path: Option<PathBuf>,
    pub cover_url: Option<String>,
    pub cover_path: Option<PathBuf>,
    pub meta: WallpaperMeta,
    pub setting: WallpaperSetting,
    pub running_info: RunningInfo,
}

impl Wallpaper {
    pub fn file_path(&self) -> Option<&Path> {
        self.file_path.as_deref()
    }

    /// 播放列表当前应播放的成员（非播放列表则返回自身）。
    pub fn current_item(&self) -> &Wallpaper {
        if !self.meta.is_playlist() || self.meta.wallpapers.is_empty() {
            return self;
        }
        let idx = (self.meta.play_index as usize).min(self.meta.wallpapers.len() - 1);
        &self.meta.wallpapers[idx]
    }

    pub fn current_item_mut(&mut self) -> &mut Wallpaper {
        if !self.meta.is_playlist() || self.meta.wallpapers.is_empty() {
            return self;
        }
        let idx = (self.meta.play_index as usize).min(self.meta.wallpapers.len() - 1);
        &mut self.meta.wallpapers[idx]
    }

    /// 随机模式的实际播放顺序。
    pub fn real_playlist(&self) -> Vec<Wallpaper> {
        use rand::seq::SliceRandom;
        let mut list = self.meta.wallpapers.clone();
        if self.setting.play_mode == PlayMode::Random {
            let mut rng = rand::thread_rng();
            loop {
                list.shuffle(&mut rng);
                if list.is_empty()
                    || self.meta.wallpapers.len() < 2
                    || list != self.meta.wallpapers
                {
                    break;
                }
            }
        }
        list
    }
}

/// 显示器信息（字段与 v3 `Screen` 一致，bounds 为 "x, y, w, h" 字符串）。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Screen {
    pub index: u32,
    pub bits_per_pixel: u32,
    pub bounds: String,
    pub device_name: String,
    pub primary: bool,
    pub working_area: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimePos {
    /// 秒；-1 表示不可用。
    pub duration: f64,
    pub position: f64,
}

/// 引擎全局播放设置（音量 / 音源 / 遮挡行为 / 默认播放器），随快照持久化。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ApiSettings {
    /// 允许发声的屏幕索引；负数表示全部静音。
    pub audio_source_index: i32,
    /// 全局音量 0-100。
    pub volume: u32,
    pub covered_behavior: CoveredBehavior,
    /// DefaultPlayer 语义的解析结果。
    pub default_video_player: VideoPlayer,
}

impl Default for ApiSettings {
    fn default() -> Self {
        Self {
            audio_source_index: 0,
            volume: 0,
            covered_behavior: CoveredBehavior::Pause,
            default_video_player: VideoPlayer::Mpv,
        }
    }
}

/// 前端播放状态（对应 v3 `PlayingStatus`）。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PlayingStatus {
    pub screens: Vec<Screen>,
    pub wallpapers: Vec<Wallpaper>,
    pub volume: u32,
    pub audio_screen_index: i32,
    /// 当前被全屏窗口遮挡的屏幕索引（每秒 tick 更新）。
    pub covered_screens: Vec<u32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_duration_works() {
        assert_eq!(parse_duration("01:00"), Some(3600));
        assert_eq!(parse_duration("00:01:30"), Some(90));
        assert_eq!(parse_duration("bad"), None);
    }

    #[test]
    fn wallpaper_json_uses_legacy_names() {
        let meta = WallpaperMeta {
            author_id: Some("u1".into()),
            ..Default::default()
        };
        let json = serde_json::to_string(&meta).unwrap();
        assert!(json.contains("authorID"));
        let back: WallpaperMeta = serde_json::from_str(&json).unwrap();
        assert_eq!(back.author_id.as_deref(), Some("u1"));
    }

    #[test]
    fn enums_serialize_as_numbers_like_v3() {
        assert_eq!(serde_json::to_string(&WallpaperType::Video).unwrap(), "3");
        assert_eq!(serde_json::to_string(&CoveredBehavior::Pause).unwrap(), "1");
        assert_eq!(serde_json::to_string(&VideoPlayer::Mpv).unwrap(), "1");
        // v3 元数据里的数字与 null 均可读回
        let meta: WallpaperMeta =
            serde_json::from_str(r#"{"type": 3, "description": null, "title": "t"}"#).unwrap();
        assert_eq!(meta.wallpaper_type, WallpaperType::Video);
        assert_eq!(meta.description, "");
        assert_eq!(meta.title, "t");
    }

    #[test]
    fn setting_roundtrip_camel_case() {
        let s = WallpaperSetting::default();
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("hardwareDecoding"));
        assert!(json.contains("isPanScan"));
        assert!(json.contains("videoPlayer"));
        assert!(json.contains("playMode"));
        assert!(json.contains("keepWallpaper"));
        let back: WallpaperSetting = serde_json::from_str(&json).unwrap();
        assert_eq!(back, s);
    }
}
