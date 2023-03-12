use crate::config::{self, read_config, write_config, WallpaperConfig};
//设置相关接口

#[tauri::command]
pub fn settings_load_wallpaper() -> Result<WallpaperConfig, String> {
    let config: config::WallpaperConfig =
        read_config("%localappdata%\\livewallpaper3\\configs\\wallpaper.json").map_err(|e| {
            println!("read_config error:{}", e.to_string());
            e.to_string()
        })?;
    println!("load_wallpaper:{:?}", config);
    Ok(config)
}
#[tauri::command]
pub fn settings_save_wallpaper(config: WallpaperConfig) -> Result<WallpaperConfig, String> {
    println!("save_wallpaper:{:?}", config);
    write_config(
        "%localappdata%\\livewallpaper3\\configs\\wallpaper.json",
        &config,
    )
    .map_err(|e| {
        println!("write_config error:{}", e.to_string());
        e.to_string()
    })?;
    Ok(config)
}
