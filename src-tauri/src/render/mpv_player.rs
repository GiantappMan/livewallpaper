use crate::utils::windows::find_window_handle;
use std::error::Error;
use std::process::{Child, Command};
use tokio::net::windows::named_pipe::{self};
use uuid::Uuid;
use windows::Win32::Foundation::HWND;

pub struct MpvPlayerOption {
    pipe_name: String,
    pub stop_screen_saver: bool,
    pub hwdec: String, //no/auto
    pub pan_scan: bool,
    pub loop_file: bool,
    pub volume: u8,
}
pub struct MpvPlayer {
    pub option: MpvPlayerOption,
    process: Option<Child>,
}

impl MpvPlayerOption {
    pub fn new() -> Self {
        Self {
            pipe_name: format!(r"\\.\pipe\{}", Uuid::new_v4().to_string()),
            stop_screen_saver: false,
            hwdec: "auto".to_string(),
            pan_scan: true,
            loop_file: true,
            volume: 0,
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

    pub async fn launch(&mut self, path: Option<String>) {
        let mut args: Vec<String> = vec![];
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

        args.push(format!(
            "--loop-file={}",
            if self.option.loop_file { "inf" } else { "no" }
        ));

        args.push(format!("--volume={}", self.option.volume));

        args.push(format!("--hwdec={}", self.option.hwdec));

        args.push(format!(r"--input-ipc-server={}", self.option.pipe_name));
        if path.is_some() {
            args.push(format!("{}", path.unwrap()));
        }
        println!("args:{:?}", args);

        self.process = Some(
            Command::new("resources\\mpv\\mpv.exe")
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

    pub async fn play(&mut self, path: &str) -> Result<(), Box<dyn Error>> {
        println!("play:{}", path);

        let client = named_pipe::ClientOptions::new().open(&self.option.pipe_name)?;

        let mut command = format!(r#"{{"command":["loadfile","{}","replace"]}}"#, path);
        command = format!("{} \n", command); //要加换行符才行
        println!("command:{}", command);
        // Wait for the pipe to be writable
        client.writable().await?;

        match client.try_write(command.as_bytes()) {
            Ok(n) => {
                client.readable().await?;
                println!("write {} bytes", n);
                let mut buf = [0; 4096];

                match client.try_read(&mut buf) {
                    Ok(n) => {
                        println!("read {} bytes", n);
                        //read 0,n from buffer
                        let msg = String::from_utf8(buf.to_vec())?;
                        println!("GOT = {}", msg);
                    }
                    Err(e) => {
                        print!("error = {}", e);
                    }
                }
            }
            Err(e) => {
                print!("error = {:?}", e);
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_launch() {
        let mut mpv_player = MpvPlayer::new();
        mpv_player.launch(None).await;
        println!("test_launch");
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_launch end")
    }

    #[tokio::test]
    async fn test_launch_with_video() {
        let mut mpv_player = MpvPlayer::new();

        mpv_player
            .launch(Some("resources\\wallpaper_samples\\video.mp4".to_string()))
            .await;
        println!("test_launch_with_video");
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_launch_with_video end")
    }

    #[tokio::test]
    async fn test_set_video() {
        let mut mpv_player = MpvPlayer::new();
        mpv_player
            .launch(Some("resources\\wallpaper_samples\\video.mp4".to_string()))
            .await;
        println!("test_set_video");
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        let path = r#"D:\\code\\github-categorized\\tauri\\livewallpaper\\src-tauri\\resources\\wallpaper_samples\\audio.mp4"#;
        mpv_player.play(path).await.unwrap();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_set_video end")
    }

    // #[tokio::test]
    // async fn test_ipc() {
    //     let client = named_pipe::ClientOptions::new()
    //         .open(r#"\\.\pipe\mpv-socket"#)
    //         // .open(&self.option.pipe_name)
    //         .unwrap();

    //     let path = r#"D:\\code\\github-categorized\\tauri\\livewallpaper\\src-tauri\\resources\\wallpaper_samples\\audio.mp4"#;
    //     let command_str = format!(r#"{{"command":["loadfile","{}","replace"]}}"#, path);
    //     let cmd = format!("{} \n", command_str); //要加换行符才行
    //                                              // let cmd = "{\"command\":[\"loadfile\",\"D:\\\\code\\\\github-categorized\\\\tauri\\\\livewallpaper\\\\src-tauri\\\\resources\\\\wallpaper_samples\\\\audio.mp4\",\"replace\"]} \n";

    //     // let buffer = [io::IoSlice::new(cmd.as_bytes())];

    //     loop {
    //         // Wait for the pipe to be writable
    //         client.writable().await.unwrap();

    //         // Try to write data, this may still fail with `WouldBlock`
    //         // if the readiness event is a false positive.

    //         match client.try_write(cmd.as_bytes()) {
    //             Ok(n) => {
    //                 client.readable().await.unwrap();
    //                 println!("write {} bytes", n);

    //                 // Creating the buffer **after** the `await` prevents it from
    //                 // being stored in the async task.
    //                 let mut buf = [0; 4096];

    //                 // Try to read data, this may still fail with `WouldBlock`
    //                 // if the readiness event is a false positive.
    //                 match client.try_read(&mut buf) {
    //                     Ok(0) => break,
    //                     Ok(n) => {
    //                         println!("read {} bytes", n);
    //                         //read 0,n from buffer
    //                         let msg = String::from_utf8(buf.to_vec()).unwrap();
    //                         println!("GOT = {}", msg);
    //                     }
    //                     Err(e) if e.kind() == io::ErrorKind::WouldBlock => {
    //                         print!("error = {}", e);
    //                         continue;
    //                     }
    //                     Err(e) => {
    //                         print!("error = {}", e);
    //                     }
    //                 }

    //                 break;
    //             }
    //             Err(e) if e.kind() == io::ErrorKind::WouldBlock => {
    //                 print!("error = {:?}", e);
    //                 continue;
    //             }
    //             Err(e) => {
    //                 print!("error = {:?}", e);
    //             }
    //         }
    //     }
    // }
}
