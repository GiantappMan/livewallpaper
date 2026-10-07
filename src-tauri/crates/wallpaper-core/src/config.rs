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
    /// 开机自启时以 headless 模式（无窗口）运行。
    pub auto_start_headless: bool,
    /// 与社区站一致的语言集：zh / en / ru / es / zh-Hant / ja / de / fr / pt-BR
    pub current_lan: String,
}

impl Default for ConfigGeneral {
    fn default() -> Self {
        let lan = system_language();
        Self {
            auto_start: false,
            hide_window: false,
            auto_start_headless: false,
            current_lan: lan,
        }
    }
}

/// 出厂默认生效的皮肤 id（Win11 Fluent，随安装包内置分发）。`default`
/// 表示内置界面，不是出厂值。
pub const FACTORY_SKIN_ID: &str = "fluent";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigAppearance {
    pub theme: String,
    pub mode: String, // system | light | dark
    /// 生效皮肤 id；`default` 为内置界面。
    pub skin: String,
}

impl Default for ConfigAppearance {
    fn default() -> Self {
        Self {
            theme: "zinc".into(),
            mode: "dark".into(),
            skin: FACTORY_SKIN_ID.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigUpdate {
    /// 界面热更新清单地址（`ui.json`）；为空表示未启用。
    pub ui_url: String,
    /// 启动时自动检查并应用界面更新。
    pub ui_auto: bool,
    /// 热更新界面是否生效（应用更新后置位；还原内置界面时清除）。
    pub ui_active: bool,
    /// 程序更新检查地址 base（清单为 `<base>/stable.json` / `<base>/preview.json`）。
    pub app_url: String,
    /// 程序更新通道：`off` | `stable` | `preview`。
    pub app_channel: String,
    /// 发现新版本后自动下载（安装始终需要用户确认）。
    pub app_auto_download: bool,
}

impl Default for ConfigUpdate {
    fn default() -> Self {
        Self {
            ui_url: String::new(),
            ui_auto: true,
            ui_active: false,
            app_url: String::new(),
            app_channel: "stable".into(),
            app_auto_download: true,
        }
    }
}

impl ConfigUpdate {
    pub fn normalized_channel(&self) -> String {
        match self.app_channel.as_str() {
            "off" => "off",
            "preview" => "preview",
            _ => "stable",
        }
        .to_string()
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
            default_video_player: VideoPlayer::System,
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
    // LANGID 低 10 位是主语言，10-15 位是子语言；中文需按子语言区分简繁
    // （繁体：TRADITIONAL=1 / HONGKONG=3 / MACAO=5）。
    unsafe {
        let lang = windows::Win32::Globalization::GetUserDefaultUILanguage();
        let primary = lang & 0x3FF;
        let sub = (lang >> 10) & 0x0F;
        match primary {
            0x04 if matches!(sub, 1 | 3 | 5) => "zh-Hant",
            0x04 => "zh",
            0x07 => "de",
            0x09 => "en",
            0x0A => "es",
            0x0C => "fr",
            0x11 => "ja",
            0x16 => "pt-BR",
            0x19 => "ru",
            _ => "en",
        }
        .to_string()
    }
}

#[cfg(not(windows))]
fn sys_locale() -> String {
    // LANG 形如 zh_TW.UTF-8 → zh-Hant；zh.UTF-8 / zh → zh
    let lang = std::env::var("LANG").unwrap_or_default();
    let base = lang.split('.').next().unwrap_or("en");
    let mut seg = base.split(['_', '-']);
    let primary = seg.next().unwrap_or("en").to_lowercase();
    let region = seg.next().map(|r| r.to_uppercase());
    match (primary.as_str(), region.as_deref()) {
        ("zh", Some("TW") | Some("HK") | Some("MO") | Some("HANT")) => "zh-Hant",
        _ => &primary,
    }
    .to_string()
}

/// 三组配置的容器，负责读写与 v3 导入。
#[derive(Debug, Clone)]
pub struct ConfigStore {
    dirs: AppDirs,
    pub general: ConfigGeneral,
    pub appearance: ConfigAppearance,
    pub wallpaper: ConfigWallpaper,
    pub update: ConfigUpdate,
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
        let update: ConfigUpdate = read_json(&dirs.config_file("update")).unwrap_or_default();

        let mut general = general;
        general.current_lan = normalize_lan(&general.current_lan);
        let mut appearance = appearance;
        if !["system", "light", "dark"].contains(&appearance.mode.as_str()) {
            appearance.mode = "dark".into();
        }
        let mut update = update;
        update.app_channel = update.normalized_channel();

        let store = Self {
            dirs,
            general,
            appearance,
            wallpaper,
            update,
        };
        store.save_all();
        store
    }

    pub fn save_all(&self) {
        let _ = write_json(&self.dirs.config_file("general"), &self.general);
        let _ = write_json(&self.dirs.config_file("appearance"), &self.appearance);
        let _ = write_json(&self.dirs.config_file("wallpaper"), &self.wallpaper);
        let _ = write_json(&self.dirs.config_file("update"), &self.update);
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
            "Update" => {
                self.update = serde_json::from_value(value).map_err(|e| e.to_string())?;
                self.update.app_channel = self.update.normalized_channel();
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
            "Update" => serde_json::to_value(&self.update).map_err(|e| e.to_string()),
            _ => Err(format!("unknown config key: {key}")),
        }
    }
}

/// 语言归一化：大小写不敏感，接受别名（zh-tw / pt / pt-br 等），
/// 统一收敛到与词典文件名一致的规范写法，非法值回退 en。
fn normalize_lan(lan: &str) -> String {
    let lan = lan.to_lowercase().replace('_', "-");
    match lan.as_str() {
        "zh" => "zh",
        "en" => "en",
        "ru" => "ru",
        "es" => "es",
        "zh-hant" | "zh-tw" | "zh-hk" | "zh-mo" | "zh-hant-cn" => "zh-Hant",
        "ja" => "ja",
        "de" => "de",
        "fr" => "fr",
        "pt" | "pt-br" | "pt-pt" => "pt-BR",
        _ => "en",
    }
    .to_string()
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

/// 读一个 JSON 配置文件（损坏时返回 None 并记日志）。日历等独立数据文件共用。
pub(crate) fn read_json_file<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    read_json(path)
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

/// 原子写一个 JSON 配置文件（.tmp + rename）。日历等独立数据文件共用。
pub(crate) fn write_json_file<T: serde::Serialize>(path: &Path, value: &T) -> std::io::Result<()> {
    write_json(path, value)
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
        assert!([
            "zh", "en", "ru", "es", "zh-Hant", "ja", "de", "fr", "pt-BR",
        ]
        .contains(&store.general.current_lan.as_str()));

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

    #[test]
    fn normalize_lan_aliases() {
        assert_eq!(normalize_lan("zh"), "zh");
        assert_eq!(normalize_lan("EN"), "en");
        assert_eq!(normalize_lan("zh-Hant"), "zh-Hant");
        assert_eq!(normalize_lan("ZH-TW"), "zh-Hant");
        assert_eq!(normalize_lan("zh_tw"), "zh-Hant");
        assert_eq!(normalize_lan("pt"), "pt-BR");
        assert_eq!(normalize_lan("PT-br"), "pt-BR");
        assert_eq!(normalize_lan("ja"), "ja");
        assert_eq!(normalize_lan("de"), "de");
        assert_eq!(normalize_lan("fr"), "fr");
        assert_eq!(normalize_lan("ko"), "en");
        assert_eq!(normalize_lan(""), "en");
    }
}
