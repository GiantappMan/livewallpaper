//windows api封装
use windows::{
    s,
    Win32::Foundation::{BOOL, HWND, LPARAM},
    Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowA, FindWindowW, GetWindowInfo, GetWindowTextW,
        GetWindowThreadProcessId, WINDOWINFO, WS_VISIBLE,
    },
};

pub fn find_window_handle(pid: u32, print_log: bool) -> HWND {
    struct EnumWindowsPayload {
        pid: u32,
        handle: HWND,
        print_log: bool,
    }

    extern "system" fn enum_window(window: HWND, data: LPARAM) -> BOOL {
        unsafe {
            let mut text: [u16; 512] = [0; 512];
            let len = GetWindowTextW(window, &mut text);
            let text = String::from_utf16_lossy(&text[..len as usize]);

            let mut info = WINDOWINFO {
                cbSize: core::mem::size_of::<WINDOWINFO>() as u32,
                ..Default::default()
            };
            GetWindowInfo(window, &mut info).unwrap();

            if !text.is_empty() && info.dwStyle & WS_VISIBLE.0 != 0 {
                let data = data.0 as *mut EnumWindowsPayload;
                let pid: *mut u32 = &mut 0;

                let res = GetWindowThreadProcessId(window, Some(pid));
                if *pid == (*data).pid {
                    (*data).handle = window;
                    if (*data).print_log {
                        println!(
                            "found pid: {},handle:{} res:{} {} ({}, {})",
                            (*data).pid,
                            window.0,
                            res,
                            text,
                            info.rcWindow.left,
                            info.rcWindow.top
                        );

                        return false.into();
                    }
                } else {
                    if (*data).print_log {
                        println!(
                            "pid：{}, text: {} left: {}, top: {}",
                            *pid, text, info.rcWindow.left, info.rcWindow.top
                        );
                    }
                }
            }

            true.into()
        }
    }

    unsafe {
        let box_data = Box::new(EnumWindowsPayload {
            pid,
            handle: HWND::default(),
            print_log,
        });
        let buffer = Box::into_raw(box_data);
        _ = EnumWindows(Some(enum_window), LPARAM(buffer as _)).ok();
        if print_log {
            println!("------end {} {}", (*buffer).pid, (*buffer).handle.0);
        }

        (*buffer).handle
    }
}

pub fn find_window(lpClassName: String) -> HWND {
    unsafe {
        let res = FindWindowA(s!("Progman"), None);
        println!("find_window: {}", res.0);
        res
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_window_handle() {
        find_window_handle(0, true);
        print!("test_get_window_handle")
    }

    #[test]
    fn test_find_window() {
        find_window("Progman".to_string());
        print!("test_find_window")
    }
}
