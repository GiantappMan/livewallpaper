use std::process::{Child, Command};
use windows::{
    Win32::Foundation::{BOOL, HWND, LPARAM},
    Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowInfo, GetWindowTextW, WINDOWINFO, WS_VISIBLE,
    },
};

pub struct Option {
    pub stop_screen_saver: bool,
    pub hwdec: String, //no/auto
    pub pan_scan: bool,
}
pub struct MpvPlayer {
    pub option: Option,
}

impl Option {
    pub fn new() -> Self {
        Self {
            stop_screen_saver: false,
            hwdec: "auto".to_string(),
            pan_scan: true,
        }
    }
}

impl MpvPlayer {
    pub fn new() -> Self {
        Self {
            option: Option::new(),
        }
    }

    async fn get_window_handle(child: &Child) {
        extern "system" fn enum_window(window: HWND, _: LPARAM) -> BOOL {
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
                    println!("{} ({}, {})", text, info.rcWindow.left, info.rcWindow.top);
                }

                true.into()
            }
        }

        unsafe {
            _ = EnumWindows(Some(enum_window), LPARAM(0)).ok();
        }
    }

    pub async fn launch(&self) {
        let mut args = vec![];
        args.push(format!(
            "--stop-screensaver={}",
            if self.option.stop_screen_saver {
                "yes"
            } else {
                "no"
            }
        ));

        args.push(format!(
            "--panscan={}",
            if self.option.pan_scan { "1.0" } else { "0.0" }
        ));

        args.push(format!("--hwdec={}", self.option.hwdec));
        println!("args:{:?}", args);

        let mut mpv = Command::new("resources/mpv/mpv.exe")
            .args(args)
            .spawn()
            .expect("failed to launch mpv");

        MpvPlayer::get_window_handle(&mpv).await;
        // mpv.wait().expect("failed to wait on mpv");
        println!("show");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_launch() {
        let mpv_player = MpvPlayer::new();
        mpv_player.launch().await;
        println!("test_launch")
    }
}
