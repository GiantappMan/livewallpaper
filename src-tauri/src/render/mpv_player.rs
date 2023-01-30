struct MpvPlayer {}

impl MpvPlayer {
    fn new() -> Self {
        Self {}
    }

    fn show(&self) {
        println!("show");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mpv_player() {
        let mpv_player = MpvPlayer::new();
        mpv_player.show();
    }
}
