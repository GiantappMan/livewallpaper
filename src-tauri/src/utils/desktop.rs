//桌面相关api
use std::cell::RefCell;
use winsafe::co;
use winsafe::msg::WndMsg;
use winsafe::prelude::*;
use winsafe::AtomStr;
use winsafe::EnumWindows;
use winsafe::HWND;

use super::windows::find_window_handle;
fn _get_worker_w() -> HWND {
    let result = RefCell::new(HWND::NULL);
    let progman = HWND::FindWindow(Some(AtomStr::from_str("Progman")), None).unwrap_or(HWND::NULL);
    if progman != HWND::NULL {
        progman
            .SendMessageTimeout(
                WndMsg {
                    msg_id: 0x052C.into(),
                    wparam: 0xD,
                    lparam: 0x1,
                },
                co::SMTO::NORMAL,
                1000,
            )
            .unwrap_or_default();
    }

    EnumWindows(|top_handle: HWND| -> bool {
        let shell_dll_def_view =
            top_handle.FindWindowEx(None, AtomStr::from_str("SHELLDLL_DefView"), None);

        match shell_dll_def_view {
            Ok(shell_dll_def_view) => {
                if shell_dll_def_view == HWND::NULL {
                    return true;
                }

                let class_name = top_handle.GetClassName().unwrap_or_default();
                if class_name != "WorkerW" {
                    return true;
                }

                let tmp = HWND::NULL
                    .FindWindowEx(Some(&top_handle), AtomStr::from_str("WorkerW"), None)
                    .unwrap_or(HWND::NULL);

                result.replace(tmp);
                return true;
            }
            Err(_) => {
                return true;
            }
        };
    })
    .unwrap_or_default();

    result.into_inner()
}

fn _set_hwnd_wallpaper(hwnd: HWND, screen_index: Option<u8>) -> bool {
    let worker_w = _get_worker_w();
    if worker_w == HWND::NULL {
        return false;
    }

    //如果hwnd.SetParent失败就返回false，并打印错误
    if let Err(e) = hwnd.SetParent(&worker_w) {
        println!("set_hwnd_wallpaper {} err: {}", hwnd, e);
        return false;
    }

    true
}

pub fn set_pid_wallpaper(pid: u32, screen_index: Option<u8>) -> bool {
    //尝试5秒
    let mut hwnd = HWND::NULL;
    let start_time = std::time::Instant::now();
    while start_time.elapsed().as_secs() < 5 {
        hwnd = find_window_handle(pid);
        if hwnd != HWND::NULL {
            break;
        }
        std::thread::sleep(std::time::Duration::from_secs(1));
    }

    if hwnd == HWND::NULL {
        return false;
    }
    _set_hwnd_wallpaper(hwnd, screen_index)
}

#[cfg(test)]
mod tests {
    use super::*;
    use winsafe::{HPROCESS, STARTUPINFO};

    #[test]
    fn test_get_worker_w() {
        let res = _get_worker_w();
        println!("test_get_worker_w: {:?}", res);
        assert_ne!(res, HWND::NULL);
    }

    #[test]
    fn test_set_hwnd_wallpaper() {
        let mut si = STARTUPINFO::default();
        let pi = HPROCESS::CreateProcess(
            None,
            Some("notepad.exe"),
            None,
            None,
            false,
            co::CREATE::NoValue,
            None,
            None,
            &mut si,
        )
        .unwrap();

        //获取pid
        let pid = pi.dwProcessId;
        println!("pid: {:?}", pid);

        let res = set_pid_wallpaper(pid, None);
        println!("test_set_hwnd_wallpaper: {:?}", res);
        assert_eq!(res, true);
    }
}
