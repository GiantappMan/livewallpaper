use crate::utils::windows::find_window_handle;
use std::error::Error;
use std::process::{Child, Command};
use tokio::net::windows::named_pipe::{self};
use uuid::Uuid;
use winsafe::prelude::*;
use winsafe::HWND;
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
    pub player_path: Option<String>,
    //当前播放路径
    pub current_path: Option<String>,
    pub pid: Option<u32>,
    process: Option<Child>,
}

impl Default for MpvPlayerOption {
    fn default() -> Self {
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

impl Default for MpvPlayer {
    fn default() -> Self {
        Self {
            option: MpvPlayerOption::default(),
            process: None,
            current_path: None,
            player_path: Some("resources\\mpv\\mpv.exe".to_string()),
            pid: None,
        }
    }
}
impl MpvPlayer {
    pub async fn launch(&mut self, path: Option<&str>) -> Result<HWND, Box<dyn Error>> {
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
            self.current_path = Some(path.unwrap().to_string());
        }
        println!("args:{:?}", args);

        //exe path
        let ext_path = std::env::current_exe().unwrap();
        let mpv_path = ext_path
            .parent()
            .unwrap()
            .join(self.player_path.as_ref().unwrap());
        println!("mpv_path:{}", mpv_path.to_str().unwrap());
        self.process = Some(
            Command::new(mpv_path)
                .args(args)
                .spawn()
                .expect("failed to launch mpv"),
        );
        let pid = self.process.as_ref().unwrap().id();
        self.pid = Some(pid);
        let handle = tokio::spawn(async move {
            let mut window_handle = HWND::NULL;
            let expire_time = tokio::time::Instant::now() + tokio::time::Duration::from_secs(5);
            while window_handle == HWND::NULL && tokio::time::Instant::now() < expire_time {
                window_handle = find_window_handle(pid);
                tokio::time::sleep(tokio::time::Duration::from_millis(1)).await;
                println!("wait pid{} window_handle", pid);
            }
            println!("pid {} , {}", pid, window_handle);
            return window_handle;
        });

        let window_handle: HWND = handle.await?;

        println!("show {}", window_handle);
        Ok(window_handle)
    }

    pub async fn play(&mut self, path: &str) -> Result<(), Box<dyn Error>> {
        println!("process is_some:{}", self.process.is_some());
        if self.process.is_none() {
            _ = self.launch(Some(path)).await?;
            return Ok(());
        }

        //判断进程已退出
        let child = self.process.as_mut().unwrap();
        if let Ok(Some(status)) = child.try_wait() {
            println!("process status: {:?}", status);
            //进程已退出
            _ = self.launch(Some(path)).await?;
            return Ok(());
        }

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
                        self.current_path = Some(path.to_string());
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
        let mut mpv_player = MpvPlayer {
            player_path: Some("..\\resources\\mpv\\mpv.exe".to_string()),
            ..MpvPlayer::default()
        };
        _ = mpv_player.launch(None).await;
        println!("test_launch");
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_launch end")
    }

    #[tokio::test]
    async fn test_launch_with_video() {
        let mut mpv_player = MpvPlayer {
            player_path: Some("..\\resources\\mpv\\mpv.exe".to_string()),
            ..MpvPlayer::default()
        };

        _ = mpv_player
            .launch(Some("resources\\wallpaper_samples\\video.mp4"))
            .await;
        println!("test_launch_with_video");
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_launch_with_video end")
    }

    #[tokio::test]
    async fn test_set_video() {
        let mut mpv_player = MpvPlayer {
            player_path: Some("..\\resources\\mpv\\mpv.exe".to_string()),
            ..MpvPlayer::default()
        };
        _ = mpv_player
            .launch(Some("resources\\wallpaper_samples\\video.mp4"))
            .await;
        println!("test_set_video");
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        let path = r#"D:\\code\\github-categorized\\tauri\\livewallpaper\\src-tauri\\resources\\wallpaper_samples\\audio.mp4"#;
        mpv_player.play(path).await.unwrap();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        mpv_player.process.unwrap().kill().unwrap();
        println!("test_set_video end")
    }

    #[tokio::test]
    async fn test_set_video_direct() {
        let mut mpv_player = MpvPlayer {
            player_path: Some("..\\resources\\mpv\\mpv.exe".to_string()),
            ..MpvPlayer::default()
        };
        let path = r#"D:\\code\\github-categorized\\tauri\\livewallpaper\\src-tauri\\resources\\wallpaper_samples\\audio.mp4"#;
        mpv_player.play(path).await.unwrap();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        mpv_player.process.take().unwrap().kill().unwrap();

        let path = r#"D:\\code\\github-categorized\\tauri\\livewallpaper\\src-tauri\\resources\\wallpaper_samples\\audio.mp4"#;
        mpv_player.play(path).await.unwrap();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        mpv_player.process.take().unwrap().kill().unwrap();
        println!("test_set_video_direct end")
    }
}
