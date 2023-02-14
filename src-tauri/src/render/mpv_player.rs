use std::process::{Child, Command};

use windows::Win32::Foundation::HWND;

use crate::utils::windows::find_window_handle;

pub struct MpvPlayerOption {
    pub stop_screen_saver: bool,
    pub hwdec: String, //no/auto
    pub pan_scan: bool,
}
pub struct MpvPlayer {
    pub option: MpvPlayerOption,
    process: Option<Child>,
}

impl MpvPlayerOption {
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
            option: MpvPlayerOption::new(),
            process: None,
        }
    }

    pub async fn launch(&mut self) {
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

        self.process = Some(
            Command::new("resources/mpv/mpv.exe")
                .args(args)
                .spawn()
                .expect("failed to launch mpv"),
        );
        let pid = self.process.as_ref().unwrap().id();
        let handle = tokio::spawn(async move {
            let mut window_handle = HWND(0);
            let expire_time = tokio::time::Instant::now() + tokio::time::Duration::from_secs(5);
            while window_handle.0 == 0 && tokio::time::Instant::now() < expire_time {
                window_handle = find_window_handle(pid, false);
                tokio::time::sleep(tokio::time::Duration::from_millis(1)).await;
                println!("wait window_handle");
            }
            println!("pid {} , {}", pid, window_handle.0);
            return window_handle;
        });

        let window_handle: HWND = handle.await.unwrap();

        println!("show {}", window_handle.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_launch() {
        let mut mpv_player = MpvPlayer::new();
        mpv_player.launch().await;
        println!("test_launch");
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_launch end")
    }
}
