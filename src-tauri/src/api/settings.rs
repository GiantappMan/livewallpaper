use crate::config::{self, read_config, write_config, Wallpaper};
//设置相关接口

#[tauri::command]
pub fn settings_load_wallpaper() -> Result<Wallpaper, String> {
    let config: config::Wallpaper =
        read_config("%localappdata%\\livewallpaper3\\configs\\wallpaper.json").map_err(|e| {
            println!("read_config error:{}", e.to_string());
            e.to_string()
        })?;
    println!("load_wallpaper:{:?}", config);
    Ok(config)
}
#[tauri::command]
pub fn settings_save_wallpaper(config: Wallpaper) -> Result<Wallpaper, String> {
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
