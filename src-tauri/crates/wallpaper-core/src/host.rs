//! 应用层（Tauri）注入到引擎的能力：内嵌播放器窗口、web 壁纸窗口、资源路径。
//! 引擎核心保持 UI 框架无关，方便测试与复用。

use crate::models::TimePos;
use std::path::PathBuf;

pub trait EngineHost: Send + Sync {
    // ---- 内嵌播放器窗口（视频/动图，每屏一个）----

    /// 加载并显示。窗口不存在时会自动创建。
    fn player_load(
        &self,
        screen: u32,
        media_url: &str,
        volume: u32,
        panscan: bool,
    ) -> Result<(), String>;
    fn player_set_paused(&self, screen: u32, paused: bool) -> Result<(), String>;
    fn player_set_volume(&self, screen: u32, volume: u32) -> Result<(), String>;
    /// 按百分比跳转（0-100）。
    fn player_seek_percent(&self, screen: u32, percent: f64) -> Result<(), String>;
    fn player_time(&self, screen: u32) -> Option<TimePos>;
    fn player_is_alive(&self, screen: u32) -> bool;
    fn player_close(&self, screen: u32) -> Result<(), String>;

    // ---- web 壁纸窗口（每屏一个）----

    fn web_load(&self, screen: u32, url: &str, mouse_enabled: bool) -> Result<(), String>;
    fn web_is_alive(&self, screen: u32) -> bool;
    fn web_close(&self, screen: u32) -> Result<(), String>;

    // ---- 资源 ----

    fn mpv_path(&self) -> PathBuf;
    fn default_cover(&self) -> PathBuf;
}

/// 无操作宿主（测试用）。
pub struct NullHost;

impl EngineHost for NullHost {
    fn player_load(&self, _s: u32, _u: &str, _v: u32, _p: bool) -> Result<(), String> {
        Err("no host".into())
    }
    fn player_set_paused(&self, _s: u32, _p: bool) -> Result<(), String> {
        Ok(())
    }
    fn player_set_volume(&self, _s: u32, _v: u32) -> Result<(), String> {
        Ok(())
    }
    fn player_seek_percent(&self, _s: u32, _p: f64) -> Result<(), String> {
        Ok(())
    }
    fn player_time(&self, _s: u32) -> Option<TimePos> {
        None
    }
    fn player_is_alive(&self, _s: u32) -> bool {
        false
    }
    fn player_close(&self, _s: u32) -> Result<(), String> {
        Ok(())
    }
    fn web_load(&self, _s: u32, _u: &str, _m: bool) -> Result<(), String> {
        Err("no host".into())
    }
    fn web_is_alive(&self, _s: u32) -> bool {
        false
    }
    fn web_close(&self, _s: u32) -> Result<(), String> {
        Ok(())
    }
    fn mpv_path(&self) -> PathBuf {
        PathBuf::new()
    }
    fn default_cover(&self) -> PathBuf {
        PathBuf::new()
    }
}
