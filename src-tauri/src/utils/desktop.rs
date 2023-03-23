use winsafe::co;
use winsafe::msg::WndMsg;
use winsafe::AtomStr;
//桌面相关api
use winsafe::prelude::*;
use winsafe::HWND;
use winsafe::{co::WS, prelude::*};
use winsafe::{EnumWindows, WINDOWINFO};

pub fn get_worker_w() {
    let progman = HWND::FindWindow(Some(AtomStr::from_str("Progman")), None).unwrap_or(HWND::NULL);
    println!("program: {:?}", progman);
    if progman != HWND::NULL {
        let res = progman
            .SendMessageTimeout(
                WndMsg {
                    msg_id: 0x052C.into(),
                    wparam: 0xD,
                    lparam: 0x1,
                },
                co::SMTO::NORMAL,
                1000,
            )
            .unwrap();
    }

    EnumWindows(|top_handle: HWND| -> bool {
        // println!("top_handle: {:?}", top_handle);
        let shell_dll_def_view =
            top_handle.FindWindowEx(None, AtomStr::from_str("SHELLDLL_DefView"), None);

        match shell_dll_def_view {
            Ok(shell_dll_def_view) => {
                if shell_dll_def_view == HWND::NULL {
                    return true;
                }

                let class_name = top_handle.GetClassName().unwrap();
                println!("top_handle:{},class_name: {:?}", top_handle, class_name);
                if class_name != "WorkerW" {
                    return true;
                }

                let worker_w = HWND::NULL
                    .FindWindowEx(Some(&top_handle), AtomStr::from_str("WorkerW"), None)
                    .unwrap();

                println!("worker_w: {:?}", worker_w);
                println!("shell_dll_def_view: {:?}", shell_dll_def_view);
                return true;
            }
            Err(e) => {
                let title = top_handle.GetWindowText().unwrap();
                println!("top_handle {},title {},error: {:?}", top_handle, title, e);
                return true;
            }
        };
    })
    .unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_worker_w() {
        get_worker_w();
        print!("test_get_worker_w")
    }
}
