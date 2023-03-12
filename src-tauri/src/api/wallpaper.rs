use crate::{api::settings::settings_load_wallpaper, wallpaper::Wallpaper};

#[tauri::command]
pub async fn get_wallpapers() -> Result<Vec<Wallpaper>, String> {
    let config = settings_load_wallpaper().map_err(|e| {
        println!("settings_load_wallpaper error:{}", e.to_string());
        e.to_string()
    })?;
    println!("config:{:?}", config.paths);

    let mut res = Vec::new();
    for path in config.paths {
        let mut wallpapers = Wallpaper::get_wallpapers(&path).map_err(|e| {
            println!("get_wallpapers error:{}", e.to_string());
            e.to_string()
        })?;
        res.append(&mut wallpapers);
    }
    println!("res:{:?}", res);
    Ok(res)
}
