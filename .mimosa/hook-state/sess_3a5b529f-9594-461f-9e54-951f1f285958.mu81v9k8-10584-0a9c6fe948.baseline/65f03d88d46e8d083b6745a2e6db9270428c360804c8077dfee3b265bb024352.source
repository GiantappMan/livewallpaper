//! 遮挡检测（对应 v3 `WindowStateChecker`）：
//! 枚举顶层窗口，计算每屏被覆盖面积的百分比（多窗口取矩形并集）；
//! 有最大化窗口或覆盖率 ≥ 90% 判定该屏被遮挡。
//! 忽略：最小化 / 不可见 / DWM cloaked（UWP）/ 桌面层窗口。

use crate::system::screens::{all_screens, index_of_monitor};
use crate::system::workerw::{top_level_windows, window_class};
use std::collections::HashSet;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows::Win32::Graphics::Gdi::{MonitorFromWindow, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::WindowsAndMessaging::{GetWindowRect, IsIconic, IsWindowVisible, IsZoomed};

const IGNORED_CLASSES: &[&str] = &["WorkerW", "Progman", "CEF-OSC-WIDGET", "mpv"];

/// 判定遮挡的覆盖率阈值（%）。
const COVERED_THRESHOLD: u32 = 90;

/// 每屏遮挡覆盖率（实时检测结果）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenCoverage {
    pub screen_index: u32,
    /// 被顶层窗口覆盖的屏幕面积百分比（0-100，多窗口取矩形并集）。
    pub percent: u32,
    /// 达到遮挡判定：有最大化窗口，或覆盖率 ≥ [`COVERED_THRESHOLD`]。
    pub covered: bool,
}

/// 返回被遮挡的屏幕索引集合。
pub fn covered_screens() -> Vec<u32> {
    covered_screens_excluding(&[])
}

/// 返回被遮挡的屏幕索引集合，跳过 `exclude` 中的窗口句柄
/// （原始 HWND 值）。独立窗口模式的播放器窗口由宿主传入排除，
/// 避免播放器自己触发"遮挡智能暂停"。
pub fn covered_screens_excluding(exclude: &[isize]) -> Vec<u32> {
    screen_coverage_excluding(exclude)
        .into_iter()
        .filter(|c| c.covered)
        .map(|c| c.screen_index)
        .collect()
}

/// 实时检测：每屏遮挡覆盖率（0-100%）与遮挡判定。
pub fn screen_coverage_excluding(exclude: &[isize]) -> Vec<ScreenCoverage> {
    let screens = all_screens();
    if screens.is_empty() {
        return Vec::new();
    }

    // 合格窗口一次枚举：普通窗口按矩形参与所有相交屏幕的并集；
    // 最大化窗口视为所在屏幕全覆盖（与 v3 判定一致）。
    let mut loose: Vec<(i32, i32, i32, i32)> = Vec::new();
    let mut zoomed: HashSet<u32> = HashSet::new();

    for hwnd in top_level_windows() {
        if exclude.contains(&(hwnd.0 as isize)) {
            continue;
        }
        unsafe {
            if !IsWindowVisible(hwnd).as_bool() || IsIconic(hwnd).as_bool() {
                continue;
            }
            if is_cloaked(hwnd) {
                continue;
            }
        }
        let class = window_class(hwnd);
        if IGNORED_CLASSES.iter().any(|c| class.eq_ignore_ascii_case(c)) {
            continue;
        }

        let (rect, is_zoomed) = unsafe {
            let mut rect = RECT::default();
            let _ = GetWindowRect(hwnd, &mut rect);
            (rect, IsZoomed(hwnd).as_bool())
        };
        if rect.right <= rect.left || rect.bottom <= rect.top {
            continue;
        }

        if is_zoomed {
            let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
            if let Some(index) = index_of_monitor(monitor) {
                zoomed.insert(index);
            }
        } else {
            loose.push((rect.left, rect.top, rect.right, rect.bottom));
        }
    }

    screens
        .iter()
        .map(|screen| {
            let (sx, sy, sw, sh) = parse_bounds(&screen.bounds).unwrap_or((0, 0, 0, 0));
            let screen_area = sw as i64 * sh as i64;

            let mut clipped: Vec<(i32, i32, i32, i32)> = Vec::new();
            if zoomed.contains(&screen.index) && screen_area > 0 {
                clipped.push((sx, sy, sx + sw, sy + sh));
            }
            for &(wx1, wy1, wx2, wy2) in &loose {
                let x1 = wx1.max(sx);
                let y1 = wy1.max(sy);
                let x2 = wx2.min(sx.saturating_add(sw));
                let y2 = wy2.min(sy.saturating_add(sh));
                if x2 > x1 && y2 > y1 {
                    clipped.push((x1, y1, x2, y2));
                }
            }

            let percent = union_percent(screen_area, &clipped);
            let covered = zoomed.contains(&screen.index) || percent >= COVERED_THRESHOLD;
            ScreenCoverage {
                screen_index: screen.index,
                percent,
                covered,
            }
        })
        .collect()
}

/// "x, y, w, h" -> (x, y, w, h)。
fn parse_bounds(bounds: &str) -> Option<(i32, i32, i32, i32)> {
    let nums: Vec<i32> = bounds
        .split(',')
        .filter_map(|p| p.trim().parse().ok())
        .collect();
    if nums.len() == 4 {
        Some((nums[0], nums[1], nums[2], nums[3]))
    } else {
        None
    }
}

/// 矩形并集面积占屏幕面积的百分比（0-100，四舍五入）。
fn union_percent(screen_area: i64, rects: &[(i32, i32, i32, i32)]) -> u32 {
    if screen_area <= 0 || rects.is_empty() {
        return 0;
    }
    let mut xs: Vec<i32> = rects.iter().flat_map(|r| [r.0, r.2]).collect();
    let mut ys: Vec<i32> = rects.iter().flat_map(|r| [r.1, r.3]).collect();
    xs.sort_unstable();
    xs.dedup();
    ys.sort_unstable();
    ys.dedup();

    // 坐标压缩网格：逐格判断是否被任一矩形覆盖
    let mut area: i64 = 0;
    for wy in ys.windows(2) {
        let row_top = wy[0];
        let row_h = (wy[1] - wy[0]) as i64;
        for wx in xs.windows(2) {
            let cx = wx[0];
            if rects
                .iter()
                .any(|r| r.0 <= cx && cx < r.2 && r.1 <= row_top && row_top < r.3)
            {
                area += (wx[1] - cx) as i64 * row_h;
            }
        }
    }
    (((area as f64 / screen_area as f64) * 100.0).round() as u32).min(100)
}

fn is_cloaked(hwnd: windows::Win32::Foundation::HWND) -> bool {
    unsafe {
        let mut cloaked: u32 = 0;
        DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut u32 as *mut _,
            std::mem::size_of::<u32>() as u32,
        )
        .is_ok()
            && cloaked != 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: i64 = 1920 * 1080;

    #[test]
    fn union_percent_basics() {
        assert_eq!(union_percent(SCREEN, &[]), 0);
        assert_eq!(union_percent(SCREEN, &[(0, 0, 1920, 1080)]), 100);
        // 四分之一
        assert_eq!(union_percent(SCREEN, &[(0, 0, 960, 540)]), 25);
    }

    #[test]
    fn union_percent_overlapping_windows() {
        // 两个各占一半、重叠 20% 的窗口：并集 = 80%
        assert_eq!(union_percent(SCREEN, &[(0, 0, 960, 1080), (576, 0, 1536, 1080)]), 80);
        // 两个相邻半屏拼满
        assert_eq!(union_percent(SCREEN, &[(0, 0, 960, 1080), (960, 0, 1920, 1080)]), 100);
        // 完全嵌套
        assert_eq!(union_percent(SCREEN, &[(0, 0, 1920, 1080), (10, 10, 100, 100)]), 100);
    }

    #[test]
    fn union_percent_rounding_and_clamp() {
        // 1/3 屏幕
        assert_eq!(union_percent(SCREEN, &[(0, 0, 640, 1080)]), 33);
        // 矩形超出屏幕面积不会超过 100
        assert_eq!(union_percent(SCREEN, &[(0, 0, 9999, 9999)]), 100);
        assert_eq!(union_percent(0, &[(0, 0, 100, 100)]), 0);
    }

    #[test]
    fn parse_bounds_works() {
        assert_eq!(parse_bounds("0, 0, 1920, 1080"), Some((0, 0, 1920, 1080)));
        assert_eq!(parse_bounds("-1920, 5, 2560, 1440"), Some((-1920, 5, 2560, 1440)));
        assert_eq!(parse_bounds("bad"), None);
    }
}
