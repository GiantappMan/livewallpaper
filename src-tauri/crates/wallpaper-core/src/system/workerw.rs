//! WorkerW / Progman 桌面嵌入（与 v3 DesktopHelper 相同的原理）：
//! 向 Progman 发送 0x052C 消息催生 WorkerW 层，把播放器窗口 SetParent 到
//! WorkerW 上，使其位于桌面图标之下、系统壁纸之上。

use crate::system::{screens, wide};
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, POINT};
use windows::Win32::Graphics::Gdi::MapWindowPoints;
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, GetClassNameW, GetWindowLongPtrW,
    GetWindowThreadProcessId, SendMessageTimeoutW, SetParent, SetWindowLongPtrW, SetWindowPos,
    SMTO_NORMAL, SWP_NOSIZE, SWP_NOZORDER, HWND_BOTTOM,
    WINDOW_LONG_PTR_INDEX, WS_CAPTION, WS_EX_TOOLWINDOW, WS_MAXIMIZEBOX,
    WS_MINIMIZEBOX, WS_SYSMENU, WS_THICKFRAME,
};

/// 触发 Progman 生成 WorkerW 层。
pub fn create_worker_w() {
    unsafe {
        if let Some(progman) = find_progman() {
            let mut result = 0usize;
            // 0x052C：让 Explorer 在桌面图标层之下创建 WorkerW
            SendMessageTimeoutW(
                progman,
                0x052C,
                windows::Win32::Foundation::WPARAM(0xD),
                windows::Win32::Foundation::LPARAM(0x1),
                SMTO_NORMAL,
                1000,
                Some(&mut result),
            );
        }
    }
}

fn find_progman() -> Option<HWND> {
    unsafe {
        let name = wide("Progman");
        FindWindowW(windows::core::PCWSTR(name.as_ptr()), None).ok()
    }
}

/// 查找壁纸层父窗口：承载桌面图标（SHELLDLL_DefView）的窗口后面的 WorkerW。
pub fn get_worker_w() -> Option<HWND> {
    create_worker_w();
    let mut result: Option<HWND> = None;
    for top in top_level_windows() {
        let shell_view = unsafe {
            let cls = wide("SHELLDLL_DefView");
            FindWindowExW(Some(top), None, windows::core::PCWSTR(cls.as_ptr()), None).ok()
        };
        if shell_view.is_some() {
            unsafe {
                let cls = wide("WorkerW");
                result = FindWindowExW(
                    None,
                    Some(top),
                    windows::core::PCWSTR(cls.as_ptr()),
                    None,
                )
                .ok();
                if result.is_none() {
                    result = find_progman().and_then(|p| {
                        FindWindowExW(Some(p), None, windows::core::PCWSTR(cls.as_ptr()), None)
                            .ok()
                    });
                }
            }
            if result.is_some() {
                break;
            }
        }
    }
    if result.is_none() {
        // 兜底：任意不包含 DefView 的 WorkerW
        for top in top_level_windows() {
            if window_class(top).eq_ignore_ascii_case("WorkerW") {
                let has_defview = unsafe {
                    let cls = wide("SHELLDLL_DefView");
                    FindWindowExW(Some(top), None, windows::core::PCWSTR(cls.as_ptr()), None)
                        .is_ok()
                };
                if !has_defview {
                    result = Some(top);
                    break;
                }
            }
        }
    }
    result
}

pub(crate) fn top_level_windows() -> Vec<HWND> {
    let mut list: Vec<HWND> = Vec::new();
    unsafe {
        let _ = EnumWindows(Some(enum_proc), LPARAM(&mut list as *mut _ as isize));
    }
    list
}

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let list = &mut *(lparam.0 as *mut Vec<HWND>);
    list.push(hwnd);
    true.into()
}

pub(crate) fn window_class(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) };
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

/// 把窗口挂到桌面底部（WorkerW 之下）并定位到指定屏幕。
pub fn send_handle_to_desktop_bottom(hwnd: HWND, screen_index: u32) -> bool {
    let Some((x, y, w, h)) = screens::screen_bounds(screen_index) else {
        return false;
    };
    let Some(worker_w) = get_worker_w() else {
        return false;
    };
    attach_to(hwnd, worker_w, x, y, w, h)
}

fn attach_to(hwnd: HWND, parent: HWND, x: i32, y: i32, w: i32, h: i32) -> bool {
    unsafe {
        // 去掉标题栏与边框
        let style = GetWindowLongPtrW(hwnd, WINDOW_LONG_PTR_INDEX(-16)); // GWL_STYLE
        let new_style = style
            & !(WS_CAPTION.0 | WS_THICKFRAME.0 | WS_MINIMIZEBOX.0 | WS_MAXIMIZEBOX.0
                | WS_SYSMENU.0)
                as isize;
        SetWindowLongPtrW(hwnd, WINDOW_LONG_PTR_INDEX(-16), new_style);

        let ex_style = GetWindowLongPtrW(hwnd, WINDOW_LONG_PTR_INDEX(-20)); // GWL_EXSTYLE
        SetWindowLongPtrW(
            hwnd,
            WINDOW_LONG_PTR_INDEX(-20),
            ex_style | WS_EX_TOOLWINDOW.0 as isize,
        );

        // 先移出屏幕，避免 SetParent 过程中闪烁
        let _ = SetWindowPos(hwnd, Some(HWND_BOTTOM), -10000, 0, 0, 0, SWP_NOSIZE);

        // SetParent 有时需要重试（Explorer 忙碌时）
        let mut parented = false;
        for _ in 0..50 {
            if SetParent(hwnd, Some(parent)).is_ok() {
                parented = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        if !parented {
            return false;
        }

        // 屏幕坐标 -> WorkerW 相对坐标
        let mut points = [POINT { x, y }];
        MapWindowPoints(None, Some(parent), &mut points);

        let _ = SetWindowPos(
            hwnd,
            Some(HWND_BOTTOM),
            points[0].x,
            points[0].y,
            w,
            h,
            SWP_NOZORDER,
        );
        true
    }
}

/// 从 WorkerW 摘除窗口（关闭内部窗口前调用）。
pub fn detach_from_desktop(hwnd: HWND) {
    unsafe {
        let _ = SetParent(hwnd, None);
        let _ = SetWindowPos(hwnd, Some(HWND_BOTTOM), 0, 0, 0, 0, SWP_NOZORDER | SWP_NOSIZE);
    }
}

/// 找到属于指定 PID 的、类名匹配的主窗口。
pub fn find_window_by_pid(pid: u32, class_hint: &str) -> Option<HWND> {
    for hwnd in top_level_windows() {
        let pid_out =
            unsafe { GetWindowThreadProcessId(hwnd, None) };
        if pid_out != pid {
            continue;
        }
        if window_class(hwnd).eq_ignore_ascii_case(class_hint) {
            return Some(hwnd);
        }
    }
    None
}

/// 重绘桌面（退出时清理残留痕迹）：重新应用当前壁纸。
pub fn refresh_desktop() {
    if let Err(e) = super::syswallpaper::refresh() {
        log::warn!("refresh desktop failed: {e}");
    }
}
