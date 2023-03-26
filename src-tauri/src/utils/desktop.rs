//桌面相关api

use std::cell::RefCell;
use std::error::Error;
use winsafe::co;
use winsafe::msg::WndMsg;
use winsafe::prelude::*;
use winsafe::AtomStr;
use winsafe::EnumWindows;
use winsafe::HWND;

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

fn set_hwnd_wallpaper(hwnd: HWND, screen_index: Option<u8>) -> Result<(), Box<dyn Error>> {
    let worker_w = _get_worker_w();
    if worker_w == HWND::NULL {
        return Ok(());
    }

    hwnd.SetParent(&worker_w)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_worker_w() {
        let res = _get_worker_w();
        println!("test_get_worker_w: {:?}", res);
        assert_ne!(res, HWND::NULL);
    }
}
