use windows::{
    core::PCWSTR,
    Win32::Foundation::{BOOL, HWND, LPARAM},
    Win32::{
        System::Threading::CreateProcessW,
        UI::WindowsAndMessaging::{
            EnumWindows, GetWindowInfo, GetWindowTextW, GetWindowThreadProcessId, WINDOWINFO,
            WS_VISIBLE,
        },
    },
};

pub struct MyStruct {
    value: i32,
}

pub async fn create_process(path: String, args: String) {
    // unsafe {
    //     CreateProcessW(
    //         PCWSTR(path.as_ptr() as *const u16),
    //         PCWSTR(args.as_ptr() as *const u16),
    //         None,
    //         None,
    //         false.into(),
    //         0,
    //         None,
    //         None,
    //         None,
    //         None,
    //     );
    // }
}

pub async fn find_window_handle(pid: u32) {
    // let mut test = 1;
    extern "system" fn enum_window(window: HWND, data: LPARAM) -> BOOL {
        // test = 2;
        unsafe {
            let data = data.0 as *const MyStruct;
            println!("data {}", (*data).value);
            let mut text: [u16; 512] = [0; 512];
            let len = GetWindowTextW(window, &mut text);
            let text = String::from_utf16_lossy(&text[..len as usize]);

            let mut info = WINDOWINFO {
                cbSize: core::mem::size_of::<WINDOWINFO>() as u32,
                ..Default::default()
            };
            GetWindowInfo(window, &mut info).unwrap();

            if !text.is_empty() && info.dwStyle & WS_VISIBLE.0 != 0 {
                println!("{} ({}, {})", text, info.rcWindow.left, info.rcWindow.top);

                let pid: *mut u32 = &mut 0;

                let res = GetWindowThreadProcessId(window, Some(pid));
                println!("pid: {},res:{}", *pid, res);
            }

            true.into()
        }
    }

    unsafe {
        let data = MyStruct { value: 1 };
        //data to buffer
        let buffer = &data as *const MyStruct;
        _ = EnumWindows(Some(enum_window), LPARAM(buffer as _)).ok();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_window_handle() {
        find_window_handle(0).await;
        print!("test_get_window_handle")
    }

    // fn test_GetWindowThreadProcessId() {
    //     let mut pid: u32 = 0;
    //     unsafe {
    //         GetWindowThreadProcessId(HWND(0), Some(pid as *mut u32));
    //     }
    // }
}
