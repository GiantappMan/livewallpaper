//! 统一播放器抽象：任意视频引擎（外部 exe / 内嵌 WebView / 未来的 web、exe 播放器）
//! 都通过 [`PlayerFactory`]（创建）+ [`PlayerEngine`]（控制）两个接口接入引擎。
//!
//! 新增播放器只需要三步：
//! 1. 实现 [`PlayerFactory`]：声明 kind / 可服务的 [`VideoPlayer`] 设置值 / 可用性，
//!    并给出 `create`（全新启动）与 `restore`（崩溃后接管）；
//! 2. 实现一个 [`PlayerEngine`] 实例：加载换源、暂停、音量、进度、探活、快照、退出；
//!    窗口如何渲染是引擎自己的事，只需在 [`PlayerEngine::attach_to_desktop`]
//!    里把自己的窗口挂到桌面 WorkerW 层；
//! 3. 把工厂注册进 [`PlayerRegistry`]（UI 宿主可通过 `EngineHost::player_factories`
//!    注入；引擎默认注册 mpv）。
//!
//! 屏幕管理器（`manager.rs`）只面向这套接口，不感知任何具体引擎。

use crate::models::VideoPlayer;
use anyhow::Result;
use std::path::PathBuf;
use std::sync::Arc;

/// 一次播放的媒体源。本地引擎用 `path`，WebView 类引擎用 `url`，
/// 引擎按自身能力取用，管理器不做区分。
#[derive(Debug, Clone)]
pub struct MediaSource {
    /// 本地媒体文件路径。
    pub path: PathBuf,
    /// 应用内 media:// 协议地址或网络 URL（内嵌 WebView 播放器需要）。
    pub url: Option<String>,
}

impl MediaSource {
    pub fn from_path(path: impl Into<PathBuf>) -> Self {
        Self {
            path: path.into(),
            url: None,
        }
    }
}

/// web 壁纸播放器的 kind 标识。web 壁纸（`WallpaperType::Web`）不走
/// `VideoPlayer` 用户设置，管理器按此 kind 从注册表直接取对应工厂；
/// 宿主注入的 web 播放器工厂需使用相同的 kind。
pub const WEB_KIND: &str = "web";

/// 播放器启动参数。
#[derive(Debug, Clone)]
pub struct PlayerConfig {
    pub screen: u32,
    pub volume: u32,
    /// 铺满裁剪（true = cover，false = contain）。
    pub panscan: bool,
    pub hardware_decoding: bool,
    /// 页面是否接收鼠标事件（web 类引擎使用；视频引擎可忽略）。
    pub mouse_events: bool,
}

/// 播放器实例的可序列化恢复信息（写入屏幕快照，崩溃后供 `restore` 接管）。
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlayerSnapshot {
    /// 引擎 kind（对应 [`PlayerFactory::kind`]）。
    pub kind: String,
    /// 引擎自定义数据（引擎自行序列化/反序列化）。
    pub data: serde_json::Value,
}

/// 一个已启动的播放器实例（对应一块屏幕上的活动渲染）。
#[async_trait::async_trait]
pub trait PlayerEngine: Send + Sync {
    /// 引擎标识（快照序列化 / 工厂匹配 / 日志），如 "mpv"、"webview"。
    fn kind(&self) -> &'static str;

    /// 在仍存活的实例上换源播放（同引擎切换壁纸的复用路径）。
    /// `config` 为本次播放的参数（换源时音量/鼠标等设置可能已变化）。
    /// 不支持换源的引擎返回 Err，管理器会回收实例并整体重启。
    async fn load(&self, source: &MediaSource, config: &PlayerConfig) -> Result<()>;

    /// 等待渲染窗口就绪并嵌入桌面（WorkerW 层）。失败时管理器会回收实例。
    async fn attach_to_desktop(&self) -> Result<()>;

    async fn set_paused(&self, paused: bool) -> Result<()>;
    async fn set_volume(&self, volume: u32) -> Result<()>;

    /// 铺满裁剪：1.0 开启，0.0 关闭。不支持的引擎默认 no-op。
    async fn set_panscan(&self, value: f64) -> Result<()> {
        let _ = value;
        Ok(())
    }

    /// 按百分比跳转（0-100）。
    async fn seek_percent(&self, percent: f64) -> Result<()>;

    /// (duration, position) 秒；未知为 -1。
    async fn time_pos(&self) -> (f64, f64);

    /// 实例是否仍存活（进程在/管道通/窗口在）。
    async fn is_alive(&self) -> bool;

    /// 可序列化恢复信息；返回 None 表示不支持崩溃接管。
    async fn snapshot(&self) -> Option<serde_json::Value> {
        None
    }

    /// 优雅退出并释放资源（窗口关闭 / 进程结束）。不应返回错误。
    async fn shutdown(&self);
}

/// 播放器工厂：负责实例的创建与崩溃接管。
#[async_trait::async_trait]
pub trait PlayerFactory: Send + Sync {
    /// 引擎标识，需与该工厂创建的 [`PlayerEngine::kind`] 一致。
    fn kind(&self) -> &'static str;

    /// 可服务的 `VideoPlayer` 用户设置值（用于按设置选择引擎）。
    fn serves(&self) -> &'static [VideoPlayer];

    /// 引擎当前是否可用（如外部 exe 存在、依赖就绪）。
    fn is_available(&self) -> bool;

    /// 全新启动一个实例（渲染窗口尚未嵌入；成功后管理器会调用
    /// [`PlayerEngine::attach_to_desktop`]）。
    async fn create(
        &self,
        source: &MediaSource,
        config: &PlayerConfig,
    ) -> Result<Arc<dyn PlayerEngine>>;

    /// 从快照接管仍在运行的实例（应用崩溃/强杀后重启的场景）。
    async fn restore(&self, data: &serde_json::Value, screen: u32)
        -> Result<Arc<dyn PlayerEngine>>;
}

/// 播放器工厂注册表：按用户设置解析引擎，首选不可用时按注册顺序兜底。
pub struct PlayerRegistry {
    factories: Vec<Arc<dyn PlayerFactory>>,
}

impl PlayerRegistry {
    /// 注册顺序即兜底优先级。
    pub fn new(factories: Vec<Arc<dyn PlayerFactory>>) -> Self {
        Self { factories }
    }

    pub fn get(&self, kind: &str) -> Option<Arc<dyn PlayerFactory>> {
        self.factories.iter().find(|f| f.kind() == kind).cloned()
    }

    /// 按用户设置解析可用引擎；设置指定的引擎不可用时退回第一个可用的
    /// 视频引擎（按注册顺序），全部不可用返回 None。
    pub fn resolve(&self, player: VideoPlayer) -> Option<Arc<dyn PlayerFactory>> {
        self.factories
            .iter()
            .find(|f| f.serves().contains(&player) && f.is_available())
            .or_else(|| {
                // 兜底只考虑视频引擎（serves 非空）；web 等按类型路由的引擎不参与
                self.factories
                    .iter()
                    .find(|f| !f.serves().is_empty() && f.is_available())
            })
            .cloned()
    }
}
