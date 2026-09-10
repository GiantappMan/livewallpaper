//! 应用层（Tauri）注入到引擎的能力：资源路径 + 自定义播放器工厂。
//! 引擎核心保持 UI 框架无关，方便测试与复用。
//!
//! 一切播放（视频、web 壁纸）都走 [`crate::player::PlayerFactory`] /
//! [`crate::player::PlayerEngine`] 统一接口；宿主通过 [`EngineHost::player_factories`]
//! 注入自己的播放器（内嵌 WebView 播放器、web 壁纸播放器就是这么接入的）。

use crate::player::PlayerFactory;
use std::path::PathBuf;
use std::sync::Arc;

pub trait EngineHost: Send + Sync {
    // ---- 资源 ----

    /// 外部 mpv.exe 的路径（空 PathBuf 表示不可用）。
    fn mpv_path(&self) -> PathBuf;
    fn default_cover(&self) -> PathBuf;

    // ---- 播放器工厂 ----

    /// 宿主提供的播放器工厂（如内嵌 WebView 播放器、web 壁纸播放器）。
    /// 引擎自身提供的工厂（mpv）之外的自定义播放器都从这里注入。
    fn player_factories(&self) -> Vec<Arc<dyn PlayerFactory>> {
        Vec::new()
    }
}

/// 无操作宿主（测试用）。
pub struct NullHost;

impl EngineHost for NullHost {
    fn mpv_path(&self) -> PathBuf {
        PathBuf::new()
    }
    fn default_cover(&self) -> PathBuf {
        PathBuf::new()
    }
}
