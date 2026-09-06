//! 静态图片壁纸：IDesktopWallpaper COM 封装，支持按显示器设置与还原。

use crate::models::Fit;
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_DISABLE_OLE1DDE, COINIT_APARTMENTTHREADED,
};
use windows::Win32::UI::Shell::{DesktopWallpaper, IDesktopWallpaper};
use windows::core::HSTRING;

fn ensure_com() {
    unsafe {
        // 已初始化或模式不一致都无妨，IDesktopWallpaper 是聚合对象
        let _ = CoInitializeEx(
            None,
            COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE,
        );
    }
}

fn desktop_wallpaper() -> windows::core::Result<IDesktopWallpaper> {
    ensure_com();
    unsafe { CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL) }
}

fn fit_to_dwpos(fit: Fit) -> windows::Win32::UI::Shell::DESKTOP_WALLPAPER_POSITION {
    use windows::Win32::UI::Shell::DESKTOP_WALLPAPER_POSITION;
    match fit {
        Fit::Center => DESKTOP_WALLPAPER_POSITION(0),
        Fit::Tile => DESKTOP_WALLPAPER_POSITION(1),
        Fit::Stretch => DESKTOP_WALLPAPER_POSITION(2),
        Fit::Fit => DESKTOP_WALLPAPER_POSITION(3),
        Fit::Fill => DESKTOP_WALLPAPER_POSITION(4),
        Fit::Span => DESKTOP_WALLPAPER_POSITION(5),
    }
}

fn dwpos_to_fit(pos: windows::Win32::UI::Shell::DESKTOP_WALLPAPER_POSITION) -> Fit {
    match pos.0 {
        0 => Fit::Center,
        1 => Fit::Tile,
        2 => Fit::Stretch,
        3 => Fit::Fit,
        4 => Fit::Fill,
        5 => Fit::Span,
        _ => Fit::Fill,
    }
}

/// 显示器 DevicePath 列表（IDesktopWallpaper 的 monitor id）。
fn monitor_ids(wall: &IDesktopWallpaper) -> Vec<String> {
    let mut list = Vec::new();
    unsafe {
        if let Ok(count) = wall.GetMonitorDevicePathCount() {
            for i in 0..count {
                if let Ok(id) = wall.GetMonitorDevicePathAt(i) {
                    list.push(id.to_string().unwrap_or_default());
                }
            }
        }
    }
    list
}

/// 把屏幕索引映射为 IDesktopWallpaper 的 monitor id。
fn monitor_id_of_screen_index(wall: &IDesktopWallpaper, screen_index: u32) -> Option<String> {
    use crate::system::screens;
    let ids = monitor_ids(wall);
    // IDesktopWallpaper 的枚举顺序与 EnumDisplayMonitors 不保证一致，用边界匹配
    let bounds = screens::screen_bounds(screen_index)?;
    log::debug!(
        "monitor match: screen {screen_index} bounds {bounds:?}, ids {:?}",
        ids
    );
    for id in &ids {
        if let Ok(rect) = unsafe { wall.GetMonitorRECT(&HSTRING::from(id)) } {
            let r = (rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
            log::debug!("  id {id} rect {r:?}");
            if r == bounds {
                return Some(id.clone());
            }
        }
    }
    // 找不到时退回按序号
    ids.get(screen_index as usize).cloned()
}

/// 原壁纸信息，用于 Stop / 退出时还原。
#[derive(Debug, Clone)]
pub struct SysWallpaperSnapshot {
    pub monitor_id: String,
    pub path: String,
    pub position: Fit,
}

pub fn set_wallpaper(
    file: &std::path::Path,
    screen_index: u32,
    fit: Fit,
) -> Result<SysWallpaperSnapshot, String> {
    let wall = desktop_wallpaper().map_err(|e| e.to_string())?;
    let monitor_id = monitor_id_of_screen_index(&wall, screen_index)
        .ok_or_else(|| format!("monitor {screen_index} not found"))?;

    // 读取旧值用于还原
    let old = current_of_monitor(&wall, &monitor_id);

    log::info!(
        "set_wallpaper: screen {screen_index} -> monitor {monitor_id}, file {}",
        file.display()
    );
    unsafe {
        wall.SetWallpaper(&HSTRING::from(&monitor_id), &HSTRING::from(file))
            .map_err(|e| e.to_string())?;
        wall.SetPosition(fit_to_dwpos(fit)).map_err(|e| e.to_string())?;
    }

    Ok(old.unwrap_or(SysWallpaperSnapshot {
        monitor_id,
        path: String::new(),
        position: fit,
    }))
}

fn current_of_monitor(wall: &IDesktopWallpaper, monitor_id: &str) -> Option<SysWallpaperSnapshot> {
    unsafe {
        let path = wall.GetWallpaper(&HSTRING::from(monitor_id)).ok()?;
        let pos = wall.GetPosition().ok()?;
        Some(SysWallpaperSnapshot {
            monitor_id: monitor_id.to_string(),
            path: path.to_string().unwrap_or_default(),
            position: dwpos_to_fit(pos),
        })
    }
}

/// 还原旧壁纸。
pub fn restore(snapshot: &SysWallpaperSnapshot) {
    if snapshot.path.is_empty() {
        return;
    }
    let Ok(wall) = desktop_wallpaper() else {
        return;
    };
    unsafe {
        let _ = wall.SetWallpaper(
            &HSTRING::from(&snapshot.monitor_id),
            &HSTRING::from(&snapshot.path),
        );
        let _ = wall.SetPosition(fit_to_dwpos(snapshot.position));
    }
}

/// 当前壁纸（用于退出清理 / 兜底还原）。
pub fn current_any() -> Option<String> {
    let wall = desktop_wallpaper().ok()?;
    let ids = monitor_ids(&wall);
    for id in ids {
        if let Some(s) = current_of_monitor(&wall, &id) {
            if !s.path.is_empty() {
                return Some(s.path);
            }
        }
    }
    None
}

/// 重新应用当前壁纸，用于清除退出后的桌面残影。
pub fn refresh() -> Result<(), String> {
    let wall = desktop_wallpaper().map_err(|e| e.to_string())?;
    let ids = monitor_ids(&wall);
    for id in ids {
        unsafe {
            if let Ok(path) = wall.GetWallpaper(&HSTRING::from(&id)) {
                let path_str = path.to_string().unwrap_or_default();
                let _ = wall.SetWallpaper(&HSTRING::from(&id), &HSTRING::from(path_str));
            }
        }
    }
    Ok(())
}
