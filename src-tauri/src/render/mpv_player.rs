use std::process::Command;

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

    pub fn launch(&self) {
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

        // mpv.wait().expect("failed to wait on mpv");

        println!("show");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_launch() {
        let mpv_player = MpvPlayer::new();
        mpv_player.launch();
    }
}
