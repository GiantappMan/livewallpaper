//! 无 UI 依赖的资源路径探测 + 纯引擎宿主 [`HeadlessHost`]。
//!
//! GUI（[`crate::internal_player::InternalPlayerController`]）与 headless 共用
//! 这里的探测逻辑，保证两种启动模式下 mpv / 默认封面的落点一致。

use std::path::PathBuf;
use wallpaper_core::host::EngineHost;
use wallpaper_core::AppDirs;

/// exe 旁或源码树内的 mpv.exe 探测（不含 Tauri 资源目录，由调用方按需先行探测）。
/// 顺序：exe 旁 assets（绿色版 / 安装版资源与 exe 同级）→ 开发模式源码树 →
/// 数据目录（应用内自动下载）。
pub fn resolve_mpv_path(dirs: &AppDirs) -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        let p = exe.parent().unwrap().join("assets/players/mpv/mpv.exe");
        if p.exists() {
            return p;
        }
    }
    // 开发模式：源码树 src-tauri/assets
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets/players/mpv/mpv.exe");
    if dev.exists() {
        return dev;
    }
    let downloaded = crate::mpv_download::target_mpv_path(dirs);
    if downloaded.exists() {
        return downloaded;
    }
    PathBuf::new()
}

pub fn resolve_default_cover() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        let p = exe.parent().unwrap().join("assets/default_cover.webp");
        if p.exists() {
            return p;
        }
    }
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets/default_cover.webp");
    if dev.exists() {
        return dev;
    }
    PathBuf::new()
}

/// 纯引擎宿主：只解析资源路径，不注入任何窗口型播放器工厂。
/// 供纯 headless 嵌入 / 测试使用；webview / web 壁纸在该宿主下自动兜底 mpv。
#[allow(dead_code)] // 生产装配使用 InternalPlayerController（webview 壁纸全功能），此宿主面向嵌入与测试
pub struct HeadlessHost;

#[allow(dead_code)]
impl EngineHost for HeadlessHost {
    fn mpv_path(&self) -> PathBuf {
        resolve_mpv_path(&AppDirs::resolve())
    }

    fn default_cover(&self) -> PathBuf {
        resolve_default_cover()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// HeadlessHost 满足 EngineHost 且探测不 panic（mpv 是否存在随环境而定）。
    #[test]
    fn headless_host_resolves_paths() {
        let host: Box<dyn EngineHost> = Box::new(HeadlessHost);
        let _ = host.mpv_path();
        let _ = host.default_cover();
        assert!(host.player_factories().is_empty());
    }
}
