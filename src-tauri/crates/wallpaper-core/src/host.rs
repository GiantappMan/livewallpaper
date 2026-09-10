//! 应用层（Tauri）注入到引擎的能力：web 壁纸窗口、资源路径、自定义播放器工厂。
//! 引擎核心保持 UI 框架无关，方便测试与复用。
//!
//! 视频播放器的控制不在本 trait——统一走 [`crate::player::PlayerFactory`] /
//! [`crate::player::PlayerEngine`]；宿主可通过 [`EngineHost::player_factories`]
//! 注入自己的播放器（内嵌 WebView 播放器就是这么接入的）。

use crate::player::PlayerFactory;
use std::path::PathBuf;
use std::sync::Arc;

pub trait EngineHost: Send + Sync {
    // ---- web 壁纸窗口（每屏一个）----

    fn web_load(&self, screen: u32, url: &str, mouse_enabled: bool) -> Result<(), String>;
    fn web_is_alive(&self, screen: u32) -> bool;
    fn web_close(&self, screen: u32) -> Result<(), String>;

    // ---- 资源 ----

    /// 外部 mpv.exe 的路径（空 PathBuf 表示不可用）。
    fn mpv_path(&self) -> PathBuf;
    fn default_cover(&self) -> PathBuf;

    // ---- 播放器工厂 ----

    /// 宿主提供的视频播放器工厂（如内嵌 WebView 播放器）。
    /// 引擎自身提供的工厂（mpv）之外的自定义播放器都从这里注入。
    fn player_factories(&self) -> Vec<Arc<dyn PlayerFactory>> {
        Vec::new()
    }
}

/// 无操作宿主（测试用）。
pub struct NullHost;

impl EngineHost for NullHost {
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
