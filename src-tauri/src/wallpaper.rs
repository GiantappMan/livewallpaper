use std::fs;

use serde::{Deserialize, Serialize};

use crate::render::mpv_player::MpvPlayer;

#[derive(Default, Debug, Deserialize, Serialize)]
pub struct Wallpaper {
    pub path: String,
}

impl Wallpaper {
    pub fn new(path: String) -> Wallpaper {
        Wallpaper { path }
    }

    pub async fn set_wallpaper(path: &str) {
        let mut mpv_player = MpvPlayer::new();
        mpv_player.launch(Some(path)).await;
    }

    pub fn get_wallpapers(folder: &str) -> Vec<Wallpaper> {
        let mut wallpapers = Vec::new();
        let support_ext = vec![
            "jpg", "png", "jpeg", "bmp", "gif", "mp4", "webm", "mkv", "avi", "wmv", "mov", "flv",
            "exe", "html", "htm",
        ];
        let exclude_files = vec!["cover.jpg", "cover.png"];
        //遍历folder下的所有文件
        for entry in fs::read_dir(folder).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            let file_name = path.file_name().unwrap().to_str().unwrap();
            //如果是文件夹，递归
            if path.is_dir() {
                wallpapers.append(&mut Wallpaper::get_wallpapers(path.to_str().unwrap()));
            } else {
                let ext = path.extension().unwrap().to_str().unwrap();
                if support_ext.contains(&ext) && !exclude_files.contains(&file_name) {
                    wallpapers.push(Wallpaper::new(path.to_str().unwrap().to_string()));
                }
            }
        }

        wallpapers
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_wallpapers() {
        let wallpapers = Wallpaper::get_wallpapers("D:\\Livewallpaper\\");
        println!("{:?}", wallpapers);
    }

    #[tokio::test]
    async fn test_set_wallpaper() {
        Wallpaper::set_wallpaper(
            r#"D:\Livewallpaper\859059a5619bf2b30774f00b454e4c01\1634301590758_0bhwl.mp4"#,
        )
        .await;
    }
}
