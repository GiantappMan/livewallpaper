//! 媒体库：目录扫描、元数据读写、封面生成、壁纸增删改。
//! 目录布局（v3.1）：
//! `<saveDir>/<id>.<ext>` + `<saveDir>/.metadata/<id>.meta.json | <id>.setting.json | <id>.cover.<ext>`

use crate::models::{
    extension_of, file_types, wallpaper_type_of_file, Wallpaper, WallpaperMeta, WallpaperSetting,
};
use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};

pub const META_DIR: &str = ".metadata";

/// 递归扫描目录，返回壁纸列表（按创建时间倒序，与 v3 一致）。
pub fn scan_directories(directories: &[PathBuf], mpv_exe: &Path, default_cover: &Path) -> Vec<Wallpaper> {
    let mut files: Vec<PathBuf> = Vec::new();
    for dir in directories {
        scan_directory(dir, &mut files, 0);
    }

    let mut wallpapers: Vec<Wallpaper> = files
        .into_iter()
        .filter_map(|file| load_wallpaper(&file, mpv_exe, default_cover).ok())
        .collect();

    wallpapers.sort_by(|a, b| {
        let ta = a
            .meta
            .create_time
            .map(|t| t.timestamp_millis())
            .unwrap_or_else(|| creation_time(a.file_path.as_deref().unwrap_or(Path::new(""))));
        let tb = b
            .meta
            .create_time
            .map(|t| t.timestamp_millis())
            .unwrap_or_else(|| creation_time(b.file_path.as_deref().unwrap_or(Path::new(""))));
        tb.cmp(&ta)
    });
    wallpapers
}

fn scan_directory(dir: &Path, out: &mut Vec<PathBuf>, depth: u8) {
    if depth > 3 {
        return; // 限制递归深度，避免大目录卡顿
    }
    // 项目目录（Wallpaper Engine / v2）：整个目录是一个壁纸，
    // 入口文件取 project.json 的 file 字段，不再递归内部资源。
    // 入口缺失（已删除 / 拷贝中）时同样整体跳过，避免拆出一堆资源垃圾条目。
    if let Some(file) = project_file_field(dir) {
        let entry = dir.join(file);
        if entry.is_file() {
            out.push(entry);
        }
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        if path.is_dir() {
            if name == META_DIR || name.starts_with('.') {
                continue;
            }
            scan_directory(&path, out, depth + 1);
        } else {
            let ext = extension_of(&path);
            let supported = [
                file_types::IMG,
                file_types::VIDEO,
                file_types::WEB,
                file_types::ANIMATED,
                file_types::PLAYLIST,
                file_types::LEGACY_GROUP,
            ]
            .iter()
            .any(|list| list.contains(&ext.as_str()));
            // 跳过封面文件与播放列表成员占位
            if supported && !name.contains(".cover") {
                out.push(path);
            }
        }
    }
}

/// 项目目录（Wallpaper Engine workshop 内容 / v2 布局）标记：
/// project.json 存在且 file 字段有效，返回该入口相对路径。
fn project_file_field(dir: &Path) -> Option<String> {
    let text = std::fs::read_to_string(dir.join("project.json")).ok()?;
    let v: Value = serde_json::from_str(&text).ok()?;
    let file = v.get("file")?.as_str()?.trim();
    if file.is_empty() || file.contains("..") {
        return None;
    }
    Some(file.to_string())
}

fn creation_time(path: &Path) -> i64 {
    std::fs::metadata(path)
        .and_then(|m| m.created())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn metadata_dir(dir: &Path) -> PathBuf {
    dir.join(META_DIR)
}

/// v3 兼容：元数据按文件主名（无扩展名）存放，如 `<id>.meta.json`。
pub fn meta_path_of(file: &Path) -> PathBuf {
    let dir = metadata_dir(file.parent().unwrap_or_else(|| Path::new(".")));
    let stem = file
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let by_stem = dir.join(format!("{stem}.meta.json"));
    if by_stem.exists() {
        return by_stem;
    }
    // 兼容 v4 早期：按完整文件名
    let name = file
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    dir.join(format!("{name}.meta.json"))
}

pub fn setting_path_of(file: &Path) -> PathBuf {
    let dir = metadata_dir(file.parent().unwrap_or_else(|| Path::new(".")));
    let stem = file
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let by_stem = dir.join(format!("{stem}.setting.json"));
    if by_stem.exists() {
        return by_stem;
    }
    let name = file
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    dir.join(format!("{name}.setting.json"))
}

fn load_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn save_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, serde_json::to_string_pretty(value)?)?;
    Ok(())
}

/// 加载单个壁纸（媒体文件 -> Wallpaper），需要时生成封面。
/// 兼容 v3.0（sidecar 命名）与 v2（project.json）并自动迁移。
pub fn load_wallpaper(file: &Path, mpv_exe: &Path, default_cover: &Path) -> Result<Wallpaper> {
    let file = migrate_v30_sidecars(file);

    let mut meta: WallpaperMeta = load_json(&meta_path_of(&file))
        .or_else(|| {
            // v2: project.json
            let project = file.parent()?.join("project.json");
            load_v2_project(&project, &file)
        })
        .unwrap_or_default();

    let setting: WallpaperSetting =
        load_json(&setting_path_of(&file)).unwrap_or_default();

    // 项目目录（Wallpaper Engine / v2）：修正早前错误扫描留下的 meta——
    // 占位默认封面让位给 project.json 的 preview，自动 id（等于入口文件名）让位给
    // workshopid / 目录名；标题保留（用户可能已改名）。
    let dir = file.parent().unwrap_or_else(|| Path::new("."));
    let is_project_entry = project_file_field(dir)
        .map(|f| dir.join(f) == file)
        .unwrap_or(false);
    if is_project_entry {
        if let Some(p) = load_v2_project(&dir.join("project.json"), &file) {
            let cover_is_placeholder = meta
                .cover
                .as_deref()
                .map(|c| c.ends_with(".cover.default.webp"))
                .unwrap_or(true);
            if cover_is_placeholder && p.cover.is_some() {
                meta.cover = p.cover.clone();
            }
            let auto_id = file
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            if meta.id.as_deref().is_none_or(|id| id.is_empty() || id == auto_id) {
                meta.id = p.id.clone();
            }
        }
    }

    let wallpaper_type = wallpaper_type_of_file(&file);
    if meta.title.is_empty() {
        meta.title = file
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
    }
    meta.wallpaper_type = wallpaper_type;
    meta.ensure_id(&file);

    // 封面：meta.cover 是文件名，v3 一律存放在 .metadata 目录
    let mut cover_path = meta
        .cover
        .as_ref()
        .map(|c| {
            let in_meta = dir.join(META_DIR).join(c);
            if in_meta.exists() {
                in_meta
            } else {
                dir.join(c)
            }
        })
        .filter(|p| p.exists());

    if cover_path.is_none() {
        cover_path = generate_cover_for(&file, &meta, mpv_exe, default_cover).ok();
        if let Some(cp) = &cover_path {
            meta.cover = Some(
                cp.file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default(),
            );
            // 回写 meta，避免下次再生成
            let _ = save_json(&meta_path_of(&file), &meta);
        }
    }

    // v2 目录迁移：删除遗留 project.json（已在 meta 中）
    let legacy_project = dir.join("project.json");
    if legacy_project.exists() && !meta.wallpapers.is_empty() {
        let _ = std::fs::remove_file(&legacy_project);
    }

    let create_time = meta.create_time.or_else(|| {
        chrono::DateTime::from_timestamp(creation_time(&file), 0)
            .map(|t| t.with_timezone(&chrono::Local))
    });

    Ok(Wallpaper {
        dir: Some(dir.to_path_buf()),
        file_name: Some(
            file.file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default(),
        ),
        file_path: Some(file.clone()),
        cover_path,
        file_url: None,
        cover_url: None,
        meta: WallpaperMeta { create_time, ..meta },
        setting,
        running_info: Default::default(),
    })
}

/// v3.0 布局迁移：`<name>.meta.json` / `<name>.setting.json` 在媒体同目录 ->
/// 移入 `.metadata/`。
fn migrate_v30_sidecars(file: &Path) -> PathBuf {
    let Some(parent) = file.parent() else {
        return file.to_path_buf();
    };
    let name = file.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let meta_dir = metadata_dir(parent);
    if meta_dir.is_dir() {
        return file.to_path_buf();
    }
    let old_meta = parent.join(format!("{name}.meta.json"));
    let old_setting = parent.join(format!("{name}.setting.json"));
    if !old_meta.exists() && !old_setting.exists() {
        return file.to_path_buf();
    }
    if std::fs::create_dir_all(&meta_dir).is_err() {
        return file.to_path_buf();
    }
    let _ = std::fs::rename(&old_meta, meta_dir.join(format!("{name}.meta.json")));
    let _ = std::fs::rename(&old_setting, meta_dir.join(format!("{name}.setting.json")));
    log::info!("migrated v3.0 sidecars for {name}");
    file.to_path_buf()
}

/// v2 / Wallpaper Engine project.json -> WallpaperMeta。
fn load_v2_project(project: &Path, file: &Path) -> Option<WallpaperMeta> {
    let text = std::fs::read_to_string(project).ok()?;
    let v: Value = serde_json::from_str(&text).ok()?;
    let mut meta = WallpaperMeta {
        title: v
            .get("title")
            .and_then(|t| t.as_str())
            .unwrap_or_default()
            .to_string(),
        description: v
            .get("description")
            .and_then(|d| d.as_str())
            .unwrap_or_default()
            .to_string(),
        wallpaper_type: wallpaper_type_of_file(file),
        ..Default::default()
    };
    // Wallpaper Engine：preview 即项目封面（位于项目目录内）
    if let Some(preview) = v.get("preview").and_then(|p| p.as_str()).filter(|p| !p.is_empty()) {
        meta.cover = Some(preview.to_string());
    }
    // 稳定 id：workshopid > 项目目录名（入口文件多为 index.html，不能作 id）
    if let Some(id) = v
        .get("workshopid")
        .and_then(|w| w.as_str())
        .filter(|w| !w.is_empty())
        .map(|s| s.to_string())
        .or_else(|| {
            file.parent()?
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
        })
    {
        meta.id = Some(id);
    }
    meta.ensure_id(file);
    Some(meta)
}

use serde_json::Value;

/// 生成封面：图片直接复制，视频/动图用 mpv 截帧，失败回退默认封面。
fn generate_cover_for(
    file: &Path,
    meta: &WallpaperMeta,
    mpv_exe: &Path,
    default_cover: &Path,
) -> Result<PathBuf> {
    let dir = file.parent().ok_or_else(|| anyhow!("no parent"))?;
    let name = file
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "cover".into());
    let meta_dir = metadata_dir(dir);
    std::fs::create_dir_all(&meta_dir)?;

    let ext = extension_of(file);
    let cover_path = meta_dir.join(format!("{name}.cover.jpg"));

    let generated = if file_types::IMG.contains(&ext.as_str()) {
        std::fs::copy(file, &cover_path).is_ok()
    } else if [
        file_types::VIDEO,
        file_types::ANIMATED,
    ]
    .iter()
    .any(|l| l.contains(&ext.as_str()))
    {
        crate::mpv::generate_cover(mpv_exe, file, &cover_path).is_ok()
    } else {
        false
    };

    if generated && cover_path.exists() {
        return Ok(cover_path);
    }
    // 默认封面（webp 内容）扩展名保持一致
    let fallback = meta_dir.join(format!("{name}.cover.default.webp"));
    std::fs::copy(default_cover, &fallback).context("copy default cover failed")?;
    let _ = meta;
    Ok(fallback)
}

/// 读取设置（供 ShowWallpaper 前刷新）。
pub fn read_setting(file: &Path) -> WallpaperSetting {
    load_json(&setting_path_of(file)).unwrap_or_default()
}

/// 写入设置。
pub fn write_setting(file: &Path, setting: &WallpaperSetting) -> Result<()> {
    save_json(&setting_path_of(file), setting)
}

pub fn read_meta(file: &Path) -> WallpaperMeta {
    load_json(&meta_path_of(file)).unwrap_or_default()
}

pub fn write_meta(file: &Path, meta: &WallpaperMeta) -> Result<()> {
    save_json(&meta_path_of(file), meta)
}

/// 在媒体库中新建壁纸：拷贝媒体与封面，写入元数据。返回新的 Wallpaper。
pub fn create_wallpaper(
    library_dir: &Path,
    media_src: &Path,
    cover_src: Option<&Path>,
    mut meta: WallpaperMeta,
    setting: WallpaperSetting,
) -> Result<Wallpaper> {
    if !media_src.exists() {
        return Err(anyhow!("media file not found: {}", media_src.display()));
    }
    std::fs::create_dir_all(library_dir)?;
    std::fs::create_dir_all(library_dir.join(META_DIR))?;

    let id = uuid::Uuid::new_v4().to_string();
    let ext = extension_of(media_src);
    let file_name = format!("{id}{ext}");
    let dest = library_dir.join(&file_name);
    std::fs::copy(media_src, &dest).with_context(|| format!("copy media {}", media_src.display()))?;

    // 封面
    if let Some(cover_src) = cover_src.filter(|c| c.exists()) {
        let cover_ext = extension_of(cover_src);
        let cover_name = format!("{id}.cover{cover_ext}");
        let cover_dest = library_dir.join(META_DIR).join(&cover_name);
        if std::fs::copy(cover_src, &cover_dest).is_ok() {
            meta.cover = Some(cover_name);
        }
    }

    let now = chrono::Local::now();
    meta.id = Some(id.clone());
    if meta.title.is_empty() {
        meta.title = id.clone();
    }
    meta.create_time = Some(now);
    meta.update_time = Some(now);
    meta.wallpaper_type = wallpaper_type_of_file(&dest);

    write_meta(&dest, &meta)?;
    write_setting(&dest, &setting)?;

    Ok(Wallpaper {
        dir: Some(library_dir.to_path_buf()),
        file_name: Some(file_name),
        file_path: Some(dest.clone()),
        cover_path: meta
            .cover
            .as_ref()
            .map(|c| library_dir.join(META_DIR).join(c)),
        file_url: None,
        cover_url: None,
        meta,
        setting,
        running_info: Default::default(),
    })
}

/// 更新壁纸（标题 / 描述 / 封面 / 成员），必要时重命名成员列表文件。
pub fn update_wallpaper(
    existing: &Wallpaper,
    new: &Wallpaper,
) -> Result<Wallpaper> {
    let file = existing
        .file_path
        .clone()
        .ok_or_else(|| anyhow!("wallpaper has no file path"))?;
    let mut meta = existing.meta.clone();
    meta.title = new.meta.title.clone();
    meta.description = new.meta.description.clone();
    meta.wallpapers = new.meta.wallpapers.clone();
    meta.play_index = new.meta.play_index;
    meta.update_time = Some(chrono::Local::now());

    // 封面更新
    if let Some(cover_src) = new.cover_path.as_ref().filter(|c| c.exists()) {
        let dir = file.parent().unwrap_or_else(|| Path::new("."));
        let id = meta.ensure_id(&file);
        let cover_ext = extension_of(cover_src);
        let cover_name = format!("{id}.cover{cover_ext}");
        let cover_dest = dir.join(META_DIR).join(&cover_name);
        std::fs::create_dir_all(dir.join(META_DIR))?;
        if std::fs::copy(cover_src, &cover_dest).is_ok() {
            meta.cover = Some(cover_name);
        }
    }

    write_meta(&file, &meta)?;

    let mut updated = existing.clone();
    updated.meta = meta;
    Ok(updated)
}

/// 删除壁纸：媒体 + 元数据 + 封面 + 设置；播放列表仅删除占位文件与元数据。
pub fn delete_wallpaper(wallpaper: &Wallpaper) -> Result<()> {
    let file = wallpaper
        .file_path
        .clone()
        .ok_or_else(|| anyhow!("wallpaper has no file path"))?;
    let dir = file.parent().unwrap_or_else(|| Path::new("."));

    // 播放列表成员不删除（仅引用）
    let _ = std::fs::remove_file(&file);

    let name = file
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let meta_dir = dir.join(META_DIR);
    for suffix in ["meta.json", "setting.json"] {
        let _ = std::fs::remove_file(meta_dir.join(format!("{name}.{suffix}")));
    }
    // 封面：<stem>.cover*
    if let Some(stem) = file.file_stem() {
        let stem = stem.to_string_lossy().to_string();
        if let Ok(entries) = std::fs::read_dir(&meta_dir) {
            for entry in entries.flatten() {
                let n = entry.file_name().to_string_lossy().to_string();
                if n.starts_with(&format!("{stem}.cover")) {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }

    // 目录若已空则清理（仅删除空目录，避免误删用户文件）
    if dir.read_dir().map(|mut d| d.next().is_none()).unwrap_or(false) {
        let _ = std::fs::remove_dir(dir);
    }
    Ok(())
}

/// 从远程下载的元数据构造 meta（保证 id 存在）。
pub fn meta_for_download(mut meta: WallpaperMeta, id: &str) -> WallpaperMeta {
    if meta.id.is_none() || meta.id.as_deref().is_none_or(str::is_empty) {
        meta.id = Some(id.to_string());
    }
    meta
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::WallpaperType;

    fn temp_root(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "gapp-lib-{}-{tag}",
            uuid::Uuid::new_v4().simple()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Wallpaper Engine 项目目录只产生一个 web 壁纸条目，
    /// 内部资源（图标 / 预览图）不再被拆成独立条目。
    #[test]
    fn wallpaper_engine_project_scans_as_single_entry() {
        let root = temp_root("we");
        let project = root.join("2905017768");
        std::fs::create_dir_all(project.join("assets/icons")).unwrap();
        std::fs::write(
            project.join("project.json"),
            r#"{"title":"Bocchi the Rock!","type":"web","file":"index.html","preview":"preview.gif","workshopid":"2905017768"}"#,
        )
        .unwrap();
        std::fs::write(project.join("index.html"), "<html></html>").unwrap();
        std::fs::write(project.join("preview.gif"), "gif").unwrap();
        std::fs::write(project.join("assets/icons/play.png"), "png").unwrap();

        let list = scan_directories(&[root.clone()], Path::new("mpv"), Path::new("cover"));
        assert_eq!(list.len(), 1, "内部资源不应成为独立条目: {list:?}");
        let w = &list[0];
        assert_eq!(w.file_path.as_deref(), Some(project.join("index.html").as_path()));
        assert_eq!(w.meta.wallpaper_type, WallpaperType::Web);
        assert_eq!(w.meta.title, "Bocchi the Rock!");
        assert_eq!(w.meta.id.as_deref(), Some("2905017768"));
        assert_eq!(w.cover_path.as_deref(), Some(project.join("preview.gif").as_path()));

        // 项目目录本身作为媒体库根目录时同样只出一个条目
        let list = scan_directories(&[project], Path::new("mpv"), Path::new("cover"));
        assert_eq!(list.len(), 1);

        std::fs::remove_dir_all(&root).ok();
    }

    /// 普通目录（无 project.json）维持原有递归行为。
    #[test]
    fn plain_folders_still_recurse() {
        let root = temp_root("plain");
        std::fs::create_dir_all(root.join("sub")).unwrap();
        std::fs::write(root.join("a.jpg"), "jpg").unwrap();
        std::fs::write(root.join("sub/b.mp4"), "mp4").unwrap();

        let list = scan_directories(&[root.clone()], Path::new("mpv"), Path::new("cover"));
        let mut names: Vec<String> = list
            .iter()
            .map(|w| {
                w.file_name
                    .as_deref()
                    .unwrap_or_default()
                    .to_string()
            })
            .collect();
        names.sort();
        assert_eq!(names, vec!["a.jpg", "b.mp4"]);

        std::fs::remove_dir_all(&root).ok();
    }

    /// 早前错误扫描留下的 meta（占位封面 / 入口文件名 id）会被 project.json 修正。
    #[test]
    fn stale_meta_gets_repaired_from_project_json() {
        let root = temp_root("stale");
        let project = root.join("2905017768");
        std::fs::create_dir_all(project.join(META_DIR)).unwrap();
        std::fs::write(
            project.join("project.json"),
            r#"{"title":"Bocchi","type":"web","file":"index.html","preview":"preview.gif","workshopid":"2905017768"}"#,
        )
        .unwrap();
        std::fs::write(project.join("index.html"), "<html></html>").unwrap();
        std::fs::write(project.join("preview.gif"), "gif").unwrap();
        std::fs::write(
            project.join(META_DIR).join("index.meta.json"),
            r#"{"id":"index","title":"Bocchi","cover":"index.cover.default.webp","type":4}"#,
        )
        .unwrap();
        std::fs::write(project.join(META_DIR).join("index.cover.default.webp"), "webp").unwrap();

        let list = scan_directories(&[root.clone()], Path::new("mpv"), Path::new("cover"));
        assert_eq!(list.len(), 1);
        let w = &list[0];
        assert_eq!(w.meta.id.as_deref(), Some("2905017768"));
        assert_eq!(w.cover_path.as_deref(), Some(project.join("preview.gif").as_path()));

        std::fs::remove_dir_all(&root).ok();
    }
}
