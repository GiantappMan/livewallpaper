use std::{process::Command, thread::spawn};

use windows::Win32::Foundation::HWND;

use crate::utils::windows::find_window_handle;

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

        let mpv = Command::new("resources/mpv/mpv.exe")
            .args(args)
            .spawn()
            .expect("failed to launch mpv");

        let mut window_handle: HWND = HWND(0);
        let handle = tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            let pid = mpv.id();
            window_handle = find_window_handle(pid);
            println!("pid {} , {}", pid, window_handle.0);
        });

        handle.await.unwrap();

        println!("show {}", window_handle.0);
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
