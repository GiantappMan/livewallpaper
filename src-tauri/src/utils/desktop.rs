//桌面相关api
use super::windows::find_window_handle;
use std::cell::RefCell;
use std::rc::Rc;
use winsafe::co;
use winsafe::msg::WndMsg;
use winsafe::prelude::*;
use winsafe::AtomStr;
use winsafe::EnumWindows;
use winsafe::HwndPlace;
use winsafe::HWND;
use winsafe::POINT;
use winsafe::{HDC, HMONITOR, RECT};
fn _create_worker_w() {
    let progman = HWND::FindWindow(Some(AtomStr::from_str("Progman")), None).unwrap_or(HWND::NULL);
    if progman == HWND::NULL {
        println!("_create_worker_w: progman is null");
        return;
    }
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

fn _get_worker_w() -> HWND {
    let result = RefCell::new(HWND::NULL);
    _create_worker_w();
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

    let screen_size = _get_screen_size(screen_index);
    if screen_size.is_none() {
        return false;
    }

    let screen_size = screen_size.unwrap();
    let mut points = [POINT {
        x: screen_size.left,
        y: screen_size.top,
    }];

    let res = HWND::MapWindowPoints(&HWND::NULL, &worker_w, &mut points).unwrap();
    println!("MapWindowPoints: {:?}", res);
    // println!("MapWindowPoints: {:?}", points.len());
    let mut point = points[0];
    point.x = 1920;

    let size = winsafe::SIZE {
        cx: screen_size.right - screen_size.left,
        cy: screen_size.bottom - screen_size.top,
    };

    let res = hwnd
        .SetWindowPos(HwndPlace::None, point, size, co::SWP::NOACTIVATE)
        .unwrap();

    println!("SetWindowPos: {:?}", res);

    true
}

fn _get_screen_size(screen_index: Option<u8>) -> Option<RECT> {
    let result = Rc::new(RefCell::new(None));
    let hdc: HDC = HDC::NULL;

    let tmp_index = Rc::new(RefCell::new(0));
    hdc.EnumDisplayMonitors(None, |_: HMONITOR, _: HDC, rc: &RECT| -> bool {
        if *tmp_index.borrow() != screen_index.unwrap_or(0) {
            *tmp_index.borrow_mut() += 1;
            return true;
        }

        *result.borrow_mut() = Some(rc.clone());
        true
    })
    .unwrap();

    result.take()
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

        std::thread::sleep(std::time::Duration::from_secs(5));
        pi.hProcess.TerminateProcess(0).unwrap();
        _create_worker_w();
    }

    #[test]
    fn test_get_worker_w() {
        let res = _get_worker_w();
        println!("test_get_worker_w: {:?}", res);
        assert_ne!(res, HWND::NULL);
    }

    #[test]
    fn test_get_screen_size() {
        let res = _get_screen_size(Some(0));
        assert_eq!(res.is_some(), true);
        println!("test_get_screen_size: {:?}", res.unwrap().to_string());
    }
}
