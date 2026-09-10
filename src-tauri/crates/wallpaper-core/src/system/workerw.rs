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
    ShowWindow, SMTO_NORMAL, SWP_NOSIZE, SWP_NOZORDER, HWND_BOTTOM, SW_SHOWNOACTIVATE,
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

        // mpv 的窗口以隐藏状态启动（--window-minimized），SetParent 不会显示它，
        // 不补 ShowWindow 则进程/IPC 都正常但桌面上无画面。趁窗口还在屏幕外时
        // 无激活显示（不抢焦点），再定位到目标屏幕。
        let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);

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
        let mut wnd_pid = 0u32;
        unsafe {
            GetWindowThreadProcessId(hwnd, Some(&mut wnd_pid));
        }
        if wnd_pid != pid {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::{Command, Stdio};
    use windows::Win32::UI::WindowsAndMessaging::{IsIconic, IsWindowVisible};

    fn test_mpv_exe() -> Option<std::path::PathBuf> {
        if let Some(p) = std::env::var_os("MPV_TEST_EXE") {
            return Some(std::path::PathBuf::from(p));
        }
        // 应用内自动下载的 mpv 落点
        let p = crate::AppDirs::resolve().root.join("players").join("mpv").join("mpv.exe");
        p.exists().then_some(p)
    }

    fn is_iconic(hwnd: HWND) -> bool {
        unsafe { IsIconic(hwnd) }.as_bool()
    }

    fn is_visible(hwnd: HWND) -> bool {
        unsafe { IsWindowVisible(hwnd) }.as_bool()
    }

    /// 端到端复现 mpv 挂桌面的完整链路：--window-minimized 启动（窗口隐藏）->
    /// 等窗口 -> 挂 WorkerW -> 断言窗口已显示（回归：此前挂载后仍隐藏，
    /// 桌面无画面）。会在真实桌面短暂创建 WorkerW 子窗口，默认忽略。
    #[test]
    #[ignore = "会在真实桌面短暂创建 WorkerW 子窗口"]
    fn mpv_minimized_window_becomes_visible_on_attach() {
        let Some(mpv) = test_mpv_exe() else {
            eprintln!("未找到 mpv.exe（可设 MPV_TEST_EXE 指定），跳过");
            return;
        };
        let mut child = Command::new(&mpv)
            .args([
                // idle 时 mpv 默认不开窗口，与生产（播视频开窗口）对齐需 force-window
                "--idle=yes",
                "--force-window=yes",
                "--window-minimized=yes",
                "--geometry=-10000:-10000",
                "--no-border",
                "--no-osc",
                "--no-terminal",
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("launch mpv");
        let pid = child.id();

        // 等窗口出现
        let mut hwnd = None;
        for _ in 0..100 {
            if let Some(h) = find_window_by_pid(pid, "mpv") {
                hwnd = Some(h);
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        let hwnd = hwnd.expect("mpv 窗口未出现");
        eprintln!(
            "挂载前: iconic={} visible={}",
            is_iconic(hwnd),
            is_visible(hwnd)
        );

        assert!(
            send_handle_to_desktop_bottom(hwnd, 0),
            "挂载 WorkerW 失败"
        );
        eprintln!(
            "挂载后: iconic={} visible={}",
            is_iconic(hwnd),
            is_visible(hwnd)
        );

        // 修复点：挂载后窗口必须可见
        assert!(is_visible(hwnd), "挂载后窗口不可见");

        let _ = child.kill();
        let _ = child.wait();
    }
}
