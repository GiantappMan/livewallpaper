//! Tauri 命令层：与 v3 `ApiObject` + `ShellApiObject` 的 JS 桥功能对齐。

use crate::state::AppState;
use crate::urls::{path_to_media_url, resolve_media_url, tmp_name_to_media_url, ResolvedUrl};
use base64::Engine;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};
use wallpaper_core::library;
use wallpaper_core::EngineHost;
use wallpaper_core::models::{
    PlayingStatus, Screen, TimePos, Wallpaper, WallpaperMeta, WallpaperSetting,
};
use wallpaper_core::AppDirs;

type Result<T> = std::result::Result<T, String>;

fn state(app: &AppHandle) -> State<'_, AppState> {
    app.state()
}

// ---------- 配置 ----------

#[tauri::command]
pub async fn get_config(app: AppHandle, key: String) -> Result<serde_json::Value> {
    let st = state(&app);
    let config = st.config.lock();
    config.get(&key)
}

#[tauri::command]
pub async fn set_config(app: AppHandle, key: String, value: serde_json::Value) -> Result<()> {
    {
        let st = state(&app);
        st.config.lock().save(&key, value)?;
    }
    apply_config_side_effects(&app, &key).await
}

/// 配置变更的联动逻辑（对应 v3 ConfigSetAfterEvent）。
async fn apply_config_side_effects(app: &AppHandle, key: &str) -> Result<()> {
    let st = state(app);
    match key {
        "General" => {
            // 自启注册 + 托盘文案
            let (auto_start, _hide) = {
                let config = st.config.lock();
                (config.general.auto_start, config.general.hide_window)
            };
            if auto_start {
                if let Ok(exe) = std::env::current_exe() {
                    let _ = wallpaper_core::system::registry::set_autostart(
                        crate::tray::AUTOSTART_NAME,
                        &format!("\"{}\"", exe.display()),
                    );
                }
            } else {
                wallpaper_core::system::registry::remove_autostart(crate::tray::AUTOSTART_NAME);
            }
            let _ = crate::tray::create(app);
        }
        "Appearance" => {
            let _ = app.emit("appearance-changed", ());
        }
        "Wallpaper" => {
            let (behavior, player) = {
                let config = st.config.lock();
                (
                    config.wallpaper.covered_behavior,
                    config.wallpaper.default_video_player,
                )
            };
            st.api.set_covered_behavior(behavior);
            st.api.set_default_video_player(player).await;
            st.api.save_snapshot().await;
            let _ = app.emit("refresh-page", ());
        }
        _ => {}
    }
    Ok(())
}

// ---------- 壁纸 ----------

/// 为壁纸（含播放列表成员）填充 fileUrl/coverUrl。
fn fill_urls(wallpaper: &mut Wallpaper) {
    if let Some(path) = &wallpaper.file_path {
        wallpaper.file_url = Some(path_to_media_url(path));
    }
    if let Some(cover) = &wallpaper.cover_path {
        wallpaper.cover_url = Some(path_to_media_url(cover));
    }
    for member in wallpaper.meta.wallpapers.iter_mut() {
        if let Some(path) = &member.file_path {
            member.file_url = Some(path_to_media_url(path));
        }
        if let Some(cover) = &member.cover_path {
            member.cover_url = Some(path_to_media_url(cover));
        }
    }
}

#[tauri::command]
pub async fn get_wallpapers(app: AppHandle) -> Result<Vec<Wallpaper>> {
    let st = state(&app);
    let (dirs, mpv, cover) = {
        let config = st.config.lock();
        let save_dirs = config.wallpaper.effective_directories();
        (
            save_dirs,
            st.player.mpv_path(),
            st.player.default_cover(),
        )
    };
    let mut list = wallpaper_core::library::scan_directories(&dirs, &mpv, &cover);
    for w in list.iter_mut() {
        fill_urls(w);
    }
    Ok(list)
}

#[tauri::command]
pub async fn get_screens(app: AppHandle) -> Result<Vec<Screen>> {
    Ok(state(&app).api.screens())
}

/// 前端展示用的播放状态（含 URL 转换）。
async fn build_playing_status(app: &AppHandle) -> PlayingStatus {
    let st = state(app);
    let mut status = PlayingStatus::default();
    status.screens = st.api.screens();
    status.volume = st.api.settings.lock().volume;
    status.audio_screen_index = st.api.settings.lock().audio_source_index;
    for mut w in st.api.running_wallpapers().await {
        fill_urls(&mut w);
        status.wallpapers.push(w);
    }
    status
}

#[tauri::command]
pub async fn get_playing_status(app: AppHandle) -> Result<PlayingStatus> {
    Ok(build_playing_status(&app).await)
}

#[tauri::command]
pub async fn show_wallpaper(app: AppHandle, wallpaper: Wallpaper) -> Result<bool> {
    let st = state(&app);
    let screens = wallpaper.running_info.screen_indexes.clone();

    let mut resolved = wallpaper.clone();
    resolve_wallpaper_urls(&st.dirs, &mut resolved);

    st.api.show_wallpaper(resolved, screens).await?;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(true)
}

/// 把壁纸中的 URL 字段解析回本地路径（tmp URL -> tmp 路径）。
fn resolve_wallpaper_urls(dirs: &AppDirs, wallpaper: &mut Wallpaper) {
    if let Some(url) = &wallpaper.file_url {
        if let Some(path) = resolve_media_url(url, &dirs.tmp_dir()).map(|r| r.into_path()) {
            wallpaper.file_path = Some(path);
        }
    }
    if let Some(url) = &wallpaper.cover_url {
        if let Some(path) = resolve_media_url(url, &dirs.tmp_dir()).map(|r| r.into_path()) {
            wallpaper.cover_path = Some(path);
        }
    }
    for member in wallpaper.meta.wallpapers.iter_mut() {
        // 播放列表成员是已有库文件，仅需解析其路径
        if let Some(path) = member.file_path.clone() {
            let _ = path;
        }
    }
}

/// v3 语义：screen_index 为负（UI 传 -1 表示未选中）时作用于全部屏幕。
fn normalize_screen_index(screen_index: Option<i32>) -> Option<u32> {
    screen_index.filter(|i| *i >= 0).map(|i| i as u32)
}

#[tauri::command]
pub async fn pause_wallpaper(app: AppHandle, screen_index: Option<i32>) -> Result<()> {
    let st = state(&app);
    st.api.pause_wallpaper(normalize_screen_index(screen_index)).await;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(())
}

#[tauri::command]
pub async fn resume_wallpaper(app: AppHandle, screen_index: Option<i32>) -> Result<()> {
    let st = state(&app);
    st.api.resume_wallpaper(normalize_screen_index(screen_index)).await;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(())
}

#[tauri::command]
pub async fn stop_wallpaper(app: AppHandle, screen_index: Option<i32>) -> Result<()> {
    let st = state(&app);
    st.api.stop_wallpaper(normalize_screen_index(screen_index)).await;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(())
}

#[tauri::command]
pub async fn play_next_in_playlist(app: AppHandle, screen_index: Option<i32>) -> Result<()> {
    let st = state(&app);
    st.api.advance_playlist(1, normalize_screen_index(screen_index)).await;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(())
}

#[tauri::command]
pub async fn play_prev_in_playlist(app: AppHandle, screen_index: Option<i32>) -> Result<()> {
    let st = state(&app);
    st.api.advance_playlist(-1, normalize_screen_index(screen_index)).await;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(())
}

#[tauri::command]
pub async fn set_volume(
    app: AppHandle,
    volume: u32,
    screen_index: Option<i32>,
) -> Result<()> {
    let st = state(&app);
    let source = screen_index.unwrap_or(-1);
    st.api.set_volume(volume, source).await;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(())
}

#[tauri::command]
pub async fn get_wallpaper_time(app: AppHandle, screen_index: Option<i32>) -> Result<TimePos> {
    let st = state(&app);
    Ok(st
        .api
        .wallpaper_time(normalize_screen_index(screen_index))
        .await
        .unwrap_or(TimePos {
            duration: -1.0,
            position: -1.0,
        }))
}

#[tauri::command]
pub async fn set_progress(
    app: AppHandle,
    progress: f64,
    screen_index: Option<i32>,
) -> Result<()> {
    let st = state(&app);
    st.api.set_progress(progress, normalize_screen_index(screen_index)).await
}

// ---------- 壁纸管理 ----------

#[tauri::command]
pub async fn upload_to_tmp(
    app: AppHandle,
    file_name: String,
    content: String,
) -> Result<String> {
    let st = state(&app);
    let safe_name: String = file_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let dest = st.dirs.tmp_dir().join(&safe_name);
    std::fs::create_dir_all(&st.dirs.tmp_dir()).map_err(|e| e.to_string())?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&content)
        .map_err(|e| format!("bad base64: {e}"))?;
    std::fs::write(&dest, bytes).map_err(|e| e.to_string())?;
    Ok(tmp_name_to_media_url(&safe_name))
}

#[tauri::command]
pub async fn create_wallpaper_new(app: AppHandle, mut wallpaper: Wallpaper) -> Result<bool> {
    let st = state(&app);
    let (library_dir, mpv, default_cover) = {
        let config = st.config.lock();
        (
            config.wallpaper.effective_directories()[0].clone(),
            st.player.mpv_path(),
            st.player.default_cover(),
        )
    };

    // 媒体来源
    let media_src = resolve_media_url(
        wallpaper.file_url.as_deref().unwrap_or_default(),
        &st.dirs.tmp_dir(),
    )
    .map(ResolvedUrl::into_path);
    let media_src = media_src.ok_or("缺少有效的媒体文件")?;

    let cover_src = wallpaper
        .cover_url
        .as_deref()
        .and_then(|u| resolve_media_url(u, &st.dirs.tmp_dir()))
        .map(ResolvedUrl::into_path);

    // 播放列表成员路径解析（成员不拷贝）
    for member in wallpaper.meta.wallpapers.iter_mut() {
        if member.file_path.is_none() {
            if let Some(path) = member
                .file_url
                .as_deref()
                .and_then(|u| resolve_media_url(u, &st.dirs.tmp_dir()))
                .map(ResolvedUrl::into_path)
            {
                member.file_path = Some(path);
            }
        }
    }

    let created = library::create_wallpaper(
        &library_dir,
        &media_src,
        cover_src.as_deref(),
        wallpaper.meta.clone(),
        wallpaper.setting.clone(),
    )
    .map_err(|e| e.to_string())?;

    // 无封面时生成
    if created.cover_path.is_none() && !mpv.as_os_str().is_empty() {
        generate_cover_background(mpv, created.file_path.clone().unwrap(), library_dir, default_cover);
    }

    st.api.notify_change();
    Ok(true)
}

fn generate_cover_background(mpv: PathBuf, file: PathBuf, library_dir: PathBuf, default_cover: PathBuf) {
    std::thread::spawn(move || {
        let name = file
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        let cover = library_dir
            .join(library::META_DIR)
            .join(format!("{name}.cover.jpg"));
        let ok = if wallpaper_core::models::file_types::IMG
            .contains(&wallpaper_core::models::extension_of(&file).as_str())
        {
            std::fs::copy(&file, &cover).is_ok()
        } else {
            wallpaper_core::mpv::generate_cover(&mpv, &file, &cover).is_ok()
        };
        if !ok && default_cover.exists() {
            // 默认封面为 webp 内容，扩展名保持一致
            let webp = library_dir
                .join(library::META_DIR)
                .join(format!("{name}.cover.default.webp"));
            let _ = std::fs::copy(&default_cover, &webp);
            if webp.exists() {
                let mut meta = library::read_meta(&file);
                meta.cover = webp.file_name().map(|s| s.to_string_lossy().to_string());
                let _ = library::write_meta(&file, &meta);
                return;
            }
        }
        if ok || default_cover.exists() {
            // 更新 meta
            let mut meta = library::read_meta(&file);
            meta.cover = cover
                .file_name()
                .map(|s| s.to_string_lossy().to_string());
            let _ = library::write_meta(&file, &meta);
        }
    });
}

#[tauri::command]
pub async fn update_wallpaper_new(
    app: AppHandle,
    mut wallpaper: Wallpaper,
    old_file_url: String,
) -> Result<bool> {
    let st = state(&app);
    let old_path = resolve_media_url(&old_file_url, &st.dirs.tmp_dir())
        .map(ResolvedUrl::into_path)
        .ok_or("缺少旧壁纸路径")?;

    // 找到现有壁纸
    let (dirs, mpv, cover) = {
        let config = st.config.lock();
        (
            config.wallpaper.effective_directories(),
            st.player.mpv_path(),
            st.player.default_cover(),
        )
    };
    let all = library::scan_directories(&dirs, &mpv, &cover);
    let existing = all
        .into_iter()
        .find(|w| w.file_path.as_deref() == Some(old_path.as_path()))
        .ok_or("未找到要更新的壁纸")?;

    // 新封面
    if let Some(url) = wallpaper.cover_url.as_deref() {
        if let Some(path) = resolve_media_url(url, &st.dirs.tmp_dir()).map(ResolvedUrl::into_path) {
            wallpaper.cover_path = Some(path);
        }
    }

    // 播放列表成员解析
    for member in wallpaper.meta.wallpapers.iter_mut() {
        if member.file_path.is_none() {
            if let Some(path) = member
                .file_url
                .as_deref()
                .and_then(|u| resolve_media_url(u, &st.dirs.tmp_dir()))
                .map(ResolvedUrl::into_path)
            {
                member.file_path = Some(path);
            }
        }
    }

    library::update_wallpaper(&existing, &wallpaper).map_err(|e| e.to_string())?;
    st.api.notify_change();
    Ok(true)
}

#[tauri::command]
pub async fn delete_wallpaper(app: AppHandle, wallpaper: Wallpaper) -> Result<bool> {
    let st = state(&app);
    let path = resolve_media_url(
        wallpaper.file_url.as_deref().unwrap_or_default(),
        &st.dirs.tmp_dir(),
    )
    .map(ResolvedUrl::into_path)
    .or_else(|| wallpaper.file_path.clone())
    .ok_or("缺少壁纸路径")?;

    // 正在播放则先停止（匹配文件路径或播放列表成员）
    let playing = st.api.running_wallpapers().await;
    for w in playing {
        let matches = w
            .file_path
            .as_ref()
            .map(|p| *p == path)
            .unwrap_or(false)
            || w.meta
                .wallpapers
                .iter()
                .any(|m| m.file_path.as_ref().map(|p| *p == path).unwrap_or(false));
        if matches {
            for screen in &w.running_info.screen_indexes {
                st.api.stop_wallpaper(Some(*screen)).await;
            }
        }
    }

    library::delete_wallpaper(&Wallpaper {
        file_path: Some(path),
        ..wallpaper
    })
    .map_err(|e| e.to_string())?;
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(true)
}

#[tauri::command]
pub async fn set_wallpaper_setting(
    app: AppHandle,
    setting: WallpaperSetting,
    wallpaper: Wallpaper,
) -> Result<bool> {
    let st = state(&app);
    let path = resolve_media_url(
        wallpaper.file_url.as_deref().unwrap_or_default(),
        &st.dirs.tmp_dir(),
    )
    .map(ResolvedUrl::into_path)
    .or_else(|| wallpaper.file_path.clone())
    .ok_or("缺少壁纸路径")?;

    library::write_setting(&path, &setting).map_err(|e| e.to_string())?;

    // 正在播放则实时应用：重新播放
    let playing = st.api.running_wallpapers().await;
    for w in playing {
        let matches = w
            .file_path
            .as_ref()
            .map(|p| *p == path)
            .unwrap_or(false);
        if matches {
            let mut updated = wallpaper.clone();
            updated.setting = setting.clone();
            updated.running_info.screen_indexes = w.running_info.screen_indexes.clone();
            resolve_wallpaper_urls(&st.dirs, &mut updated);
            st.api.show_wallpaper(updated, w.running_info.screen_indexes).await?;
        }
    }
    st.api.save_snapshot().await;
    st.api.notify_change();
    Ok(true)
}

// ---------- 下载 ----------

#[tauri::command]
pub async fn download_wallpaper(
    app: AppHandle,
    cover_url: Option<String>,
    wallpaper_url: String,
    meta: WallpaperMeta,
) -> Result<bool> {
    let st = state(&app);
    let id = meta
        .id
        .clone()
        .filter(|s| !s.is_empty())
        .ok_or("meta.id is required")?;

    let (library_dir, _) = {
        let config = st.config.lock();
        (config.wallpaper.effective_directories()[0].clone(), ())
    };

    let ext = wallpaper_url
        .split('?')
        .next()
        .and_then(|u| {
            std::path::Path::new(u)
                .extension()
                .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
        })
        .unwrap_or_else(|| ".mp4".into());
    let media_dest = library_dir.join(format!("{id}{ext}"));

    let cover_dest = cover_url.as_ref().map(|cu| {
        let cover_ext = cu
            .split('?')
            .next()
            .and_then(|u| {
                std::path::Path::new(u)
                    .extension()
                    .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
            })
            .unwrap_or_else(|| ".jpg".into());
        library_dir
            .join(library::META_DIR)
            .join(format!("{id}.cover{cover_ext}"))
    });

    // 预写 meta 文件（下载完成后即为完整壁纸）
    let meta_dest = library_dir.join(library::META_DIR).join(format!("{id}{ext}.meta.json"));
    let mut meta_to_save = meta.clone();
    let now = chrono::Local::now();
    meta_to_save.create_time = Some(now);
    meta_to_save.update_time = Some(now);
    if let Some(cover_dest) = &cover_dest {
        meta_to_save.cover = cover_dest
            .file_name()
            .map(|s| s.to_string_lossy().to_string());
    }
    let _ = std::fs::create_dir_all(library_dir.join(library::META_DIR));
    let _ = std::fs::write(
        &meta_dest,
        serde_json::to_string_pretty(&meta_to_save).unwrap_or_default(),
    );

    st.downloads
        .submit(
            &id,
            &meta.title,
            &wallpaper_url,
            media_dest,
            cover_url,
            cover_dest,
        )
        .await;
    Ok(true)
}

#[tauri::command]
pub async fn cancel_download_wallpaper(app: AppHandle, id: String) -> Result<()> {
    state(&app).downloads.cancel(&id);
    Ok(())
}

#[tauri::command]
pub async fn get_download_status(app: AppHandle) -> Result<wallpaper_core::DownloadStatus> {
    Ok(state(&app).downloads.status_all().await)
}

#[tauri::command]
pub async fn get_download_item_status(
    app: AppHandle,
    id: String,
) -> Result<Option<wallpaper_core::DownloadItem>> {
    Ok(state(&app).downloads.status_of(&id).await)
}

/// 带展示用 URL 的历史条目（封面/文件走 media 协议）。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadHistoryEntry {
    #[serde(flatten)]
    item: wallpaper_core::DownloadHistoryItem,
    cover_url: Option<String>,
    file_url: String,
}

#[tauri::command]
pub fn get_download_history(app: AppHandle) -> Result<Vec<DownloadHistoryEntry>> {
    let items = state(&app).downloads.history_all();
    Ok(items
        .into_iter()
        .map(|item| {
            let cover_url = item
                .cover_path
                .as_deref()
                .map(|p| path_to_media_url(std::path::Path::new(p)));
            let file_url = path_to_media_url(std::path::Path::new(&item.file_path));
            DownloadHistoryEntry {
                item,
                cover_url,
                file_url,
            }
        })
        .collect())
}

#[tauri::command]
pub fn clear_download_history(app: AppHandle) -> Result<()> {
    state(&app).downloads.clear_history();
    Ok(())
}

#[tauri::command]
pub fn remove_download_history_item(app: AppHandle, id: String) -> Result<()> {
    state(&app).downloads.remove_history(&id);
    Ok(())
}

// ---------- 外壳 ----------

#[tauri::command]
pub fn get_version() -> String {
    crate::APP_VERSION.to_string()
}

/// 解析后的实际主题（system -> 注册表）。
#[tauri::command]
pub fn get_real_theme_mode(app: AppHandle) -> String {
    let st = state(&app);
    let mode = st.config.lock().appearance.mode.clone();
    match mode.as_str() {
        "light" => "light".into(),
        "dark" => "dark".into(),
        _ => {
            if wallpaper_core::system::registry::is_dark_mode() {
                "dark".into()
            } else {
                "light".into()
            }
        }
    }
}

#[tauri::command]
pub fn open_url(_app: AppHandle, url: String) -> Result<()> {
    wallpaper_core::system::open_url(&url)
}

#[tauri::command]
pub fn explore(_app: AppHandle, path: String) -> Result<()> {
    wallpaper_core::system::reveal_in_explorer(&std::path::PathBuf::from(path))
}

#[tauri::command]
pub fn open_store_review(_app: AppHandle, default_url: Option<String>) -> Result<bool> {
    // v4 不再是商店应用（NSIS 安装），直接打开默认链接
    if let Some(url) = default_url {
        wallpaper_core::system::open_url(&url)?;
    }
    Ok(false)
}

#[tauri::command]
pub fn open_log_folder(app: AppHandle) -> Result<()> {
    let st = state(&app);
    wallpaper_core::system::reveal_in_explorer(&st.dirs.logs_dir())
}

#[tauri::command]
pub async fn show_folder_dialog(app: AppHandle) -> Result<Option<String>> {
    let _window = app
        .get_webview_window("main")
        .ok_or("no main window")?;
    tokio::task::spawn_blocking(move || {
        let folder = rfd::FileDialog::new()
            .set_title("Select Folder")
            .pick_folder();
        Ok(folder.map(|p| p.to_string_lossy().to_string()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn show_shell(app: AppHandle, path: Option<String>) -> Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
    if let Some(path) = path {
        let _ = app.emit("navigate", serde_json::json!({ "path": path }));
    }
    Ok(())
}

#[tauri::command]
pub fn hide_loading(app: AppHandle) -> Result<()> {
    // 主窗口就绪：关闭启动屏；除非配置了启动时隐藏，否则显示主窗口
    let hide = {
        let st = state(&app);
        let guard = st.config.lock();
        guard.general.hide_window
    };
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if !hide {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_window_state(app: AppHandle, width: f64, height: f64, maximized: bool) -> Result<()> {
    let st = state(&app);
    *st.window_restorer.lock() = crate::state::WindowRestore {
        width,
        height,
        maximized,
    };
    Ok(())
}

#[tauri::command]
pub fn exit_app(app: AppHandle) -> Result<()> {
    crate::tray::quit(app);
    Ok(())
}

// ---------- mpv 播放器 ----------

/// mpv 可用性（发布包不含 mpv，缺失时可在设置页一键自动下载）。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MpvStatus {
    pub available: bool,
    pub path: String,
    pub downloading: bool,
}

#[tauri::command]
pub fn get_mpv_status(app: AppHandle) -> Result<MpvStatus> {
    let st = state(&app);
    let path = st.player.mpv_path();
    Ok(MpvStatus {
        available: path.exists(),
        path: path.to_string_lossy().into_owned(),
        downloading: crate::mpv_download::in_progress(),
    })
}

/// 后台启动 mpv 下载；进度/结果经 `mpv-download-event` 事件推送。
#[tauri::command]
pub fn download_mpv(app: AppHandle) -> Result<()> {
    let dirs = state(&app).dirs.clone();
    crate::mpv_download::start(app, dirs)
}

#[tauri::command]
pub fn cancel_download_mpv(_app: AppHandle) -> Result<()> {
    crate::mpv_download::cancel();
    Ok(())
}

// ---------- 社区登录 ----------

/// 在独立顶层窗口打开社区页：用于账号登录等依赖第一方 Cookie 的场景
/// （hub iframe 是跨站上下文，授权页拒绝被嵌套，会话 Cookie 也受第三方限制）。
/// 已有社区/登录窗口时直接聚焦。
#[tauri::command]
pub fn open_community_window(app: AppHandle, url: String) -> Result<()> {
    use crate::{build_oauth_window, is_hub_origin, next_hub_window_seq};

    if let Some((_, win)) = app
        .webview_windows()
        .into_iter()
        .find(|(label, _)| label.starts_with("oauth-"))
    {
        let _ = win.set_focus();
        return Ok(());
    }
    let parsed = tauri::Url::parse(&url).map_err(|e| e.to_string())?;
    if !is_hub_origin(&parsed) {
        return Err("origin not allowed".to_string());
    }
    let label = format!("oauth-{}", next_hub_window_seq());
    build_oauth_window(&app, &label, parsed)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
