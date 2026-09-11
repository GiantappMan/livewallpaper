//! 遮挡检测（对应 v3 `WindowStateChecker`）：
//! 枚举顶层窗口，窗口最大化或面积 ≥ 屏幕面积 90% 时认为该屏被遮挡。
//! 忽略：最小化 / 不可见 / DWM cloaked（UWP）/ 桌面层窗口。

use crate::system::screens::{all_screens, index_of_monitor};
use crate::system::workerw::{top_level_windows, window_class};
use std::collections::HashSet;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows::Win32::Graphics::Gdi::{MonitorFromWindow, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::WindowsAndMessaging::{GetWindowRect, IsIconic, IsWindowVisible, IsZoomed};

const IGNORED_CLASSES: &[&str] = &["WorkerW", "Progman", "CEF-OSC-WIDGET", "mpv"];

/// 返回被遮挡的屏幕索引集合。
pub fn covered_screens() -> Vec<u32> {
    covered_screens_excluding(&[])
}

/// 返回被遮挡的屏幕索引集合，跳过 `exclude` 中的窗口句柄
/// （原始 HWND 值）。独立窗口模式的播放器窗口由宿主传入排除，
/// 避免播放器自己触发"遮挡智能暂停"。
pub fn covered_screens_excluding(exclude: &[isize]) -> Vec<u32> {
    let screens = all_screens();
    if screens.is_empty() {
        return Vec::new();
    }
    let mut covered: HashSet<u32> = HashSet::new();

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

        let (rect, zoomed) = unsafe {
            let mut rect = RECT::default();
            let _ = GetWindowRect(hwnd, &mut rect);
            (rect, IsZoomed(hwnd).as_bool())
        };
        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;
        if width <= 0 || height <= 0 {
            continue;
        }

        let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
        let Some(index) = index_of_monitor(monitor) else {
            continue;
        };
        if zoomed {
            covered.insert(index);
            continue;
        }

        // 面积 >= 屏幕面积 90%
        if let Some(screen) = screens.get(index as usize) {
            let nums: Vec<i64> = screen
                .bounds
                .split(',')
                .filter_map(|p| p.trim().parse().ok())
                .collect();
            if nums.len() == 4 {
                let screen_area = (nums[2] as i64) * (nums[3] as i64);
                let window_area = width as i64 * height as i64;
                if screen_area > 0 && window_area * 10 >= screen_area * 9 {
                    covered.insert(index);
                }
            }
        }
    }

    covered.into_iter().collect()
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
