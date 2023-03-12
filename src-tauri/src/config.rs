use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::from_reader;
pub(crate) use std::fs::File;
use std::{
    error::Error,
    io::{BufReader, Write},
};
use winsafe::ExpandEnvironmentStrings;
//常规设置
#[derive(Default, Debug, Deserialize, Serialize)]
pub struct General {}
//壁纸设置
#[derive(Debug, Deserialize, Serialize)]
pub struct WallpaperConfig {
    //壁纸目录
    pub paths: Vec<String>,
}

impl Default for WallpaperConfig {
    fn default() -> Self {
        let mut paths = vec![];
        if std::path::Path::new("D:\\").exists() {
            paths.push("D:\\LiveWallpaper\\".to_string());
        } else {
            let tmp = ExpandEnvironmentStrings("%UserProfile%\\videos\\").unwrap();
            paths.push(tmp);
        }
        WallpaperConfig { paths }
    }
}

pub fn read_config<T>(filename: &str) -> Result<T, Box<dyn Error>>
where
    T: DeserializeOwned + Default,
{
    let filename = ExpandEnvironmentStrings(filename)?;
    let dir = std::path::Path::new(&filename).parent().unwrap();
    if !dir.exists() {
        std::fs::create_dir_all(dir)?;
    }

    //文件不存在
    if !std::path::Path::new(&filename).exists() {
        let config = T::default();
        return Ok(config);
    }

    let file = File::open(filename)?;
    let reader = BufReader::new(file);
    let result = from_reader(reader)?;
    Ok(result)
}

pub fn write_config<T>(filename: &str, config: &T) -> Result<(), Box<dyn Error>>
where
    T: Serialize,
{
    let filename = ExpandEnvironmentStrings(filename)?;
    let dir = std::path::Path::new(&filename).parent().unwrap();
    if !dir.exists() {
        std::fs::create_dir_all(dir)?;
    }

    let mut file = File::create(filename)?;
    let json = serde_json::to_string_pretty(config)?;
    file.write_all(json.as_bytes())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_config() {
        let config = WallpaperConfig {
            paths: vec!["D:\\Livewallpaper\\".to_string()],
        };
        write_config(
            "%localappdata%\\livewallpaper3\\configs\\config.json",
            &config,
        )
        .unwrap();
    }

    #[test]
    fn test_read_config() {
        let config: WallpaperConfig =
            read_config("%localappdata%\\livewallpaper3\\configs\\config.json").unwrap();
        // json
        let json = serde_json::to_string(&config).unwrap();
        print!("{}", json);

        println!("{:?}", config);
    }
}
