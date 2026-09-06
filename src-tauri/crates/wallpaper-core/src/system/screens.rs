//! 显示器枚举与映射。屏幕索引 = 按 Bounds.X 从左到右排序后的序号（与 v3 一致）。

use crate::models::Screen;
use crate::system::{rect_string, wide};
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, RECT};
use windows::Win32::Graphics::Gdi::{
    CreateDCW, DeleteDC, EnumDisplayMonitors, GetDeviceCaps, GetMonitorInfoW, MonitorFromWindow,
    HDC, HMONITOR, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::WindowsAndMessaging::MONITORINFOF_PRIMARY;

/// 枚举全部显示器，按左边缘 X 排序，index 即屏幕索引。
pub fn all_screens() -> Vec<Screen> {
    let mut monitors: Vec<HMONITOR> = Vec::new();
    unsafe {
        let _ = EnumDisplayMonitors(
            None,
            None,
            Some(monitor_collect_proc),
            LPARAM(&mut monitors as *mut _ as isize),
        );
    }

    let mut infos: Vec<MonitorInfo> = monitors
        .into_iter()
        .filter_map(|m| monitor_info(m))
        .collect();
    infos.sort_by_key(|i| i.rect.left);

    infos
        .into_iter()
        .enumerate()
        .map(|(index, info)| Screen {
            index: index as u32,
            bits_per_pixel: info.bits_per_pixel,
            bounds: rect_string(
                info.rect.left,
                info.rect.top,
                info.rect.right - info.rect.left,
                info.rect.bottom - info.rect.top,
            ),
            device_name: info.device_name,
            primary: info.primary,
            working_area: rect_string(
                info.work.left,
                info.work.top,
                info.work.right - info.work.left,
                info.work.bottom - info.work.top,
            ),
        })
        .collect()
}

/// hwnd 所在屏幕的索引（按左边缘排序约定）。
pub fn screen_index_of_window(hwnd: HWND) -> Option<u32> {
    let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    index_of_monitor(monitor)
}

pub fn index_of_monitor(monitor: HMONITOR) -> Option<u32> {
    let name = monitor_info(monitor)?.device_name;
    all_screens()
        .into_iter()
        .find(|s| s.device_name == name)
        .map(|s| s.index)
}

/// 屏幕索引 -> 显示器矩形 (x, y, w, h)（物理像素）。
pub fn screen_bounds(index: u32) -> Option<(i32, i32, i32, i32)> {
    let screens = all_screens();
    let s = screens.get(index as usize)?;
    let nums: Vec<i32> = s
        .bounds
        .split(',')
        .filter_map(|p| p.trim().parse().ok())
        .collect();
    if nums.len() == 4 {
        Some((nums[0], nums[1], nums[2], nums[3]))
    } else {
        None
    }
}

struct MonitorInfo {
    device_name: String,
    rect: RECT,
    work: RECT,
    primary: bool,
    bits_per_pixel: u32,
}

fn monitor_info(monitor: HMONITOR) -> Option<MonitorInfo> {
    unsafe {
        let mut info = MONITORINFOEXW::default();
        info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        if !GetMonitorInfoW(monitor, &mut info as *mut _ as _).as_bool() {
            return None;
        }
        let device_name = String::from_utf16_lossy(&info.szDevice)
            .trim_end_matches('\0')
            .to_string();
        let bits_per_pixel = bits_per_pixel_of(&device_name);
        Some(MonitorInfo {
            primary: info.monitorInfo.dwFlags & MONITORINFOF_PRIMARY != 0,
            rect: info.monitorInfo.rcMonitor,
            work: info.monitorInfo.rcWork,
            bits_per_pixel,
            device_name,
        })
    }
}

fn bits_per_pixel_of(device_name: &str) -> u32 {
    unsafe {
        let name = wide(device_name);
        // CreateDCW(driver, device, port, dm)
        let hdc = CreateDCW(None, windows::core::PCWSTR(name.as_ptr()), None, None);
        if hdc.is_invalid() {
            return 32;
        }
        // BITSPIXEL = 12
        let bpp = GetDeviceCaps(Some(hdc), windows::Win32::Graphics::Gdi::GET_DEVICE_CAPS_INDEX(12));
        let _ = DeleteDC(hdc);
        if bpp <= 0 {
            32
        } else {
            bpp as u32
        }
    }
}

unsafe extern "system" fn monitor_collect_proc(
    monitor: HMONITOR,
    _hdc: HDC,
    _rect: *mut RECT,
    lparam: LPARAM,
) -> BOOL {
    let list = &mut *(lparam.0 as *mut Vec<HMONITOR>);
    list.push(monitor);
    true.into()
}
