use std::error::Error;
use std::fs;
use tokio::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::render::mpv_player::MpvPlayer;

#[derive(Default, Debug, Deserialize, Serialize)]
pub struct Wallpaper {
    pub path: String,
}

//管理一块屏幕的壁纸播放
#[derive(Default)]
pub struct WallpaperManager {
    pub screen_index: u32,
    pub current_wallpaper: Wallpaper,
    pub mpv_player: Option<MpvPlayer>,
}
lazy_static::lazy_static! {
    static ref WALLPAPER_MANAGERS: Mutex<Vec<WallpaperManager>> = Mutex::new(Vec::new());
}
impl WallpaperManager {
    pub async fn set_wallpaper(path: &str, screen_index: u32) -> Result<(), Box<dyn Error>> {
        let mut map = WALLPAPER_MANAGERS.lock().await;
        let manager = map.iter_mut().find(|m| m.screen_index == screen_index);
        if manager.is_none() {
            //新建管理器
            let mut new_manager = WallpaperManager::default();
            new_manager.screen_index = screen_index;
            new_manager.mpv_player = Some(MpvPlayer::default());

            map.push(new_manager);
        }
        let manager = map
            .iter_mut()
            .find(|m| m.screen_index == screen_index)
            .unwrap();

        let mpv_player = manager.mpv_player.as_mut().unwrap();
        mpv_player.play(path).await?;
        manager.current_wallpaper.path = mpv_player.current_path.clone().unwrap();

        Ok(())
    }

    pub fn get_wallpapers(folder: &str) -> Result<Vec<Wallpaper>, Box<dyn Error>> {
        let mut wallpapers = Vec::new();
        let support_ext = vec![
            "jpg", "png", "jpeg", "bmp", "gif", "mp4", "webm", "mkv", "avi", "wmv", "mov", "flv",
            "exe", "html", "htm",
        ];
        let exclude_files = vec!["cover.jpg", "cover.png"];
        //遍历folder下的所有文件
        for entry in fs::read_dir(folder)? {
            let entry = entry?;
            let path = entry.path();
            let file_name = path.file_name().unwrap().to_str().unwrap();
            if path.is_dir() {
                //如果是文件夹，递归
                let tmp = &mut WallpaperManager::get_wallpapers(path.to_str().unwrap())?;
                wallpapers.append(tmp);
            } else {
                let ext = path.extension().unwrap().to_str().unwrap();
                if support_ext.contains(&ext) && !exclude_files.contains(&file_name) {
                    wallpapers.push(Wallpaper {
                        path: path.to_str().unwrap().to_string(),
                        ..Default::default()
                    });
                }
            }
        }

        Ok(wallpapers)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_wallpapers() {
        let wallpapers = WallpaperManager::get_wallpapers("D:\\Livewallpaper\\");
        println!("{:?}", wallpapers);
    }

    #[tokio::test]
    async fn test_set_wallpaper() {
        _ = WallpaperManager::set_wallpaper(
            r#"D:\Livewallpaper\859059a5619bf2b30774f00b454e4c01\1634301590758_0bhwl.mp4"#,
            0,
        )
        .await;
    }
}
