//! 配置系统：General / Appearance / Wallpaper 三组配置，JSON 存储、内存缓存，
//! 并支持从 v3（`%LOCALAPPDATA%/LiveWallpaper3`）一次性导入。

use crate::dirs::AppDirs;
use crate::models::{CoveredBehavior, VideoPlayer};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigGeneral {
    pub auto_start: bool,
    pub hide_window: bool,
    /// zh / en / ru / es
    pub current_lan: String,
}

impl Default for ConfigGeneral {
    fn default() -> Self {
        let lan = system_language();
        Self {
            auto_start: false,
            hide_window: false,
            current_lan: lan,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigAppearance {
    pub theme: String,
    pub mode: String, // system | light | dark
}

impl Default for ConfigAppearance {
    fn default() -> Self {
        Self {
            theme: "zinc".into(),
            mode: "dark".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigWallpaper {
    pub directories: Vec<String>,
    pub covered_behavior: CoveredBehavior,
    pub default_video_player: VideoPlayer,
    /// 退出时保留壁纸（不恢复原桌面、保留快照）。
    pub keep_wallpaper: bool,
}

impl ConfigWallpaper {
    pub fn keep_wallpaper_field(&self) -> bool {
        self.keep_wallpaper
    }
}

impl Default for ConfigWallpaper {
    fn default() -> Self {
        Self {
            directories: Vec::new(),
            covered_behavior: CoveredBehavior::Pause,
            default_video_player: VideoPlayer::Mpv,
            keep_wallpaper: false,
        }
    }
}

impl ConfigWallpaper {
    /// 已配置的目录；为空时返回默认目录（`D:\LiveWallpaper` 存在则优先），但不写盘。
    pub fn effective_directories(&self) -> Vec<PathBuf> {
        let list: Vec<PathBuf> = self
            .directories
            .iter()
            .map(PathBuf::from)
            .filter(|p| !p.as_os_str().is_empty())
            .collect();
        if !list.is_empty() {
            return list;
        }
        vec![default_save_directory()]
    }
}

/// 默认媒体库目录：优先 `D:\LiveWallpaper`，否则 `视频\LiveWallpaper`。
pub fn default_save_directory() -> PathBuf {
    let d = PathBuf::from(r"D:\LiveWallpaper");
    if d.parent().is_some() && d.parent().unwrap().is_dir() {
        let _ = std::fs::create_dir_all(&d);
        if d.is_dir() {
            return d;
        }
    }
    let videos = dirs::video_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_default())
        .join("LiveWallpaper");
    let _ = std::fs::create_dir_all(&videos);
    videos
}

fn system_language() -> String {
    normalize_lan(&sys_locale())
}

#[cfg(windows)]
fn sys_locale() -> String {
    // GetUserDefaultUILanguage 返回主语言 LCID，取低 9 位即可映射 ISO 639-1。
    unsafe {
        let lang = windows::Win32::Globalization::GetUserDefaultUILanguage();
        let primary = lang & 0x3FF;
        match primary {
            0x04 => "zh",
            0x09 => "en",
            0x19 => "ru",
            0x0A => "es",
            _ => "en",
        }
        .to_string()
    }
}

#[cfg(not(windows))]
fn sys_locale() -> String {
    std::env::var("LANG")
        .ok()
        .and_then(|l| l.get(0..2).map(str::to_string))
        .unwrap_or_else(|| "en".into())
}

/// 三组配置的容器，负责读写与 v3 导入。
#[derive(Debug, Clone)]
pub struct ConfigStore {
    dirs: AppDirs,
    pub general: ConfigGeneral,
    pub appearance: ConfigAppearance,
    pub wallpaper: ConfigWallpaper,
}

impl ConfigStore {
    pub fn load(dirs: AppDirs) -> Self {
        let general: ConfigGeneral = read_json(&dirs.config_file("general")).unwrap_or_else(|| {
            import_v3(&dirs, "Client.Apps.Configs.General").unwrap_or_default()
        });
        let appearance: ConfigAppearance = read_json(&dirs.config_file("appearance"))
            .unwrap_or_else(|| {
                import_v3(&dirs, "Client.Apps.Configs.Appearance").unwrap_or_default()
            });
        let wallpaper: ConfigWallpaper = read_json(&dirs.config_file("wallpaper"))
            .unwrap_or_else(|| {
                import_v3(&dirs, "Client.Apps.Configs.Wallpaper").unwrap_or_default()
            });

        let mut general = general;
        general.current_lan = normalize_lan(&general.current_lan);
        let mut appearance = appearance;
        if !["system", "light", "dark"].contains(&appearance.mode.as_str()) {
            appearance.mode = "dark".into();
        }

        let store = Self {
            dirs,
            general,
            appearance,
            wallpaper,
        };
        store.save_all();
        store
    }

    pub fn save_all(&self) {
        let _ = write_json(&self.dirs.config_file("general"), &self.general);
        let _ = write_json(&self.dirs.config_file("appearance"), &self.appearance);
        let _ = write_json(&self.dirs.config_file("wallpaper"), &self.wallpaper);
    }

    pub fn save(&mut self, key: &str, value: serde_json::Value) -> Result<(), String> {
        match key {
            "General" => {
                self.general = serde_json::from_value(value).map_err(|e| e.to_string())?;
                self.general.current_lan = normalize_lan(&self.general.current_lan);
            }
            "Appearance" => {
                self.appearance = serde_json::from_value(value).map_err(|e| e.to_string())?;
                if !["system", "light", "dark"].contains(&self.appearance.mode.as_str()) {
                    self.appearance.mode = "dark".into();
                }
            }
            "Wallpaper" => {
                self.wallpaper = serde_json::from_value(value).map_err(|e| e.to_string())?;
            }
            _ => return Err(format!("unknown config key: {key}")),
        }
        self.save_all();
        Ok(())
    }

    pub fn get(&self, key: &str) -> Result<serde_json::Value, String> {
        match key {
            "General" => serde_json::to_value(&self.general).map_err(|e| e.to_string()),
            "Appearance" => serde_json::to_value(&self.appearance).map_err(|e| e.to_string()),
            "Wallpaper" => serde_json::to_value(&self.wallpaper).map_err(|e| e.to_string()),
            _ => Err(format!("unknown config key: {key}")),
        }
    }
}

fn normalize_lan(lan: &str) -> String {
    let lan = lan.to_lowercase();
    if ["zh", "en", "ru", "es"].contains(&lan.as_str()) {
        lan
    } else {
        "en".into()
    }
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    let text = std::fs::read_to_string(path).ok()?;
    match serde_json::from_str(&text) {
        Ok(v) => Some(v),
        Err(e) => {
            log::warn!("解析配置失败 {}: {e}", path.display());
            None
        }
    }
}

fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut tmp = path.to_path_buf();
    tmp.set_extension("json.tmp");
    {
        let mut f = std::fs::File::create(&tmp)?;
        let text = serde_json::to_string_pretty(value).map_err(std::io::Error::other)?;
        f.write_all(text.as_bytes())?;
    }
    std::fs::rename(&tmp, path)
}

/// v3 配置为 `{}` 包装的相同字段结构（v3 文件本身就是扁平对象），直接尝试解析。
fn import_v3<T: serde::de::DeserializeOwned>(dirs: &AppDirs, v3_name: &str) -> Option<T> {
    let path = dirs.v3_root().join(format!("{v3_name}.json"));
    let value = read_json::<T>(&path);
    if value.is_some() {
        log::info!("从 v3 导入配置: {v3_name}");
    }
    value
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_save_get_roundtrip() {
        let dirs = AppDirs::new(std::env::temp_dir().join(format!("wp4-test-{}", uuid::Uuid::new_v4())));
        dirs.ensure().unwrap();
        let mut store = ConfigStore::load(dirs.clone());
        // 默认语言跟随系统，只需保证合法
        assert!(["zh", "en", "ru", "es"].contains(&store.general.current_lan.as_str()));

        store
            .save(
                "General",
                serde_json::json!({"autoStart": true, "hideWindow": true, "currentLan": "zh"}),
            )
            .unwrap();
        assert_eq!(store.general.current_lan, "zh");

        let reloaded = ConfigStore::load(dirs);
        assert!(reloaded.general.auto_start);
        assert_eq!(reloaded.general.current_lan, "zh");
    }

    #[test]
    fn import_v3_config() {
        let dirs = AppDirs::new(std::env::temp_dir().join(format!("wp4-test-{}", uuid::Uuid::new_v4())));
        dirs.ensure().unwrap();
        std::fs::create_dir_all(dirs.v3_root()).unwrap();
        std::fs::write(
            dirs.v3_root().join("Client.Apps.Configs.Appearance.json"),
            r#"{"theme":"blue","mode":"light"}"#,
        )
        .unwrap();
        let store = ConfigStore::load(dirs.clone());
        assert_eq!(store.appearance.theme, "blue");
        assert_eq!(store.appearance.mode, "light");
        // 导入后写入 v4 配置，删除 v3 后仍可读
        std::fs::remove_dir_all(dirs.v3_root()).unwrap();
        let again = ConfigStore::load(dirs);
        assert_eq!(again.appearance.theme, "blue");
    }
}
