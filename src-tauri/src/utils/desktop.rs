use winsafe::co;
use winsafe::msg::WndMsg;
use winsafe::AtomStr;
//桌面相关api
use winsafe::prelude::*;
use winsafe::HWND;

fn get_worker_w() {
    let progman = HWND::FindWindow(Some(AtomStr::from_str("Progman")), None).unwrap_or(HWND::NULL);
    println!("program: {:?}", progman);
    if progman == HWND::NULL {
        return;
    }

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
    println!("res: {:?}", res);
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
