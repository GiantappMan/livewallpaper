//windows api简化
use std::cell::RefCell;

use winsafe::{co::WS, prelude::*};
use winsafe::{EnumWindows, HWND, WINDOWINFO};

pub fn find_window_handle(pid: u32) -> HWND {
    let res: RefCell<HWND> = RefCell::new(HWND::NULL);

    EnumWindows(|hwnd: HWND| -> bool {
        let text = hwnd.GetWindowText().unwrap();
        let mut info = WINDOWINFO::default();
        hwnd.GetWindowInfo(&mut info).unwrap();

        if !text.is_empty() && (info.dwStyle & WS::VISIBLE != WS::NoValue) {
            let (_, _pid) = hwnd.GetWindowThreadProcessId();
            //println!("title:{},_pid:{},hwnd:{}", text, _pid, hwnd); //debug
            if pid == _pid {
                *res.borrow_mut() = hwnd;
            }
        }
        true
    })
    .unwrap();

    println!("find_window_handle pid: {:?}, res: {:?}", pid, res.borrow()); //debug
    res.into_inner()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_window_handle() {
        let res = find_window_handle(0);
        println!("test_get_window_handle: {:?}", res)
    }
}
