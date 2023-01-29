use std::fs;

use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Deserialize, Serialize)]
pub struct Wallpaper {
    pub path: String,
}

impl Wallpaper {
    pub fn new(path: String) -> Wallpaper {
        Wallpaper { path }
    }

    pub fn scan_folder(folder: &str) -> Vec<Wallpaper> {
        let mut wallpapers = Vec::new();
        let support_ext = vec![
            "jpg", "png", "jpeg", "bmp", "gif", "mp4", "webm", "mkv", "avi", "wmv", "mov", "flv",
        ];
        let exclude_files = vec!["cover.jpg", "cover.png"];
        //遍历folder下的所有文件
        for entry in fs::read_dir(folder).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            let file_name = path.file_name().unwrap().to_str().unwrap();
            //如果是文件夹，递归
            if path.is_dir() {
                wallpapers.append(&mut Wallpaper::scan_folder(path.to_str().unwrap()));
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
    fn test_scan() {
        let wallpapers = Wallpaper::scan_folder("D:\\Livewallpaper\\");
        println!("{:?}", wallpapers);
    }
}
