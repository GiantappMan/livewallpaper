//! mpv 播放器自动下载：发布包不内嵌 mpv，缺失时从 shinchiro/mpv-winbuild-cmake
//! （mpv 官网推荐的 Windows 构建渠道）最新 release 下载 `mpv-x86_64-*.7z`，
//! 解出 mpv.exe 放入数据目录 `players/mpv/`，供 `mpv_path` 兜底查找。
//! 进度/结果经 `mpv-download-event` 事件广播给前端。

use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tauri::Emitter;
use wallpaper_core::AppDirs;

const RELEASE_API: &str =
    "https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest";

static IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static CANCEL: AtomicBool = AtomicBool::new(false);

/// 自动下载的 mpv.exe 落点。数据目录在免安装/开发模式下均可写
/// （exe 旁的 assets 属只读安装目录，不宜作运行时写入目标）。
pub fn target_mpv_path(dirs: &AppDirs) -> PathBuf {
    dirs.root.join("players").join("mpv").join("mpv.exe")
}

pub fn in_progress() -> bool {
    IN_PROGRESS.load(Ordering::SeqCst)
}

/// 前端事件载荷（tag = state，便于按分支解构）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum MpvDownloadEvent {
    #[serde(rename_all = "camelCase")]
    Progress {
        percent: f64,
        received_bytes: u64,
        total_bytes: u64,
    },
    #[serde(rename_all = "camelCase")]
    Done { path: String },
    #[serde(rename_all = "camelCase")]
    Error { message: String },
}

/// 启动后台下载任务。已在进行中或已安装时返回错误。
pub fn start(app: tauri::AppHandle, dirs: AppDirs) -> Result<(), String> {
    if IN_PROGRESS.swap(true, Ordering::SeqCst) {
        return Err("mpv 正在下载中".into());
    }
    if target_mpv_path(&dirs).exists() {
        IN_PROGRESS.store(false, Ordering::SeqCst);
        return Err("mpv 已存在，无需下载".into());
    }
    CANCEL.store(false, Ordering::SeqCst);

    tauri::async_runtime::spawn(async move {
        let result = run(&app, &dirs).await;
        IN_PROGRESS.store(false, Ordering::SeqCst);
        match result {
            Ok(path) => {
                log::info!("mpv downloaded to {}", path.display());
                let _ = app.emit(
                    "mpv-download-event",
                    MpvDownloadEvent::Done {
                        path: path.to_string_lossy().into_owned(),
                    },
                );
            }
            Err(e) => {
                log::error!("mpv download failed: {e:#}");
                let _ = app.emit(
                    "mpv-download-event",
                    MpvDownloadEvent::Error {
                        message: e.to_string(),
                    },
                );
            }
        }
    });
    Ok(())
}

pub fn cancel() {
    CANCEL.store(true, Ordering::SeqCst);
}

async fn run(app: &tauri::AppHandle, dirs: &AppDirs) -> Result<PathBuf> {
    let client = reqwest::Client::builder()
        .user_agent("GiantappWallpaper/4")
        // 与 DownloadManager 一致：僵死连接不能让任务永远停在"下载中"
        .connect_timeout(Duration::from_secs(15))
        .read_timeout(Duration::from_secs(30))
        .build()?;

    // 1. 最新 release 中定位 mpv-x86_64 常规包
    #[derive(serde::Deserialize)]
    struct Asset {
        name: String,
        size: u64,
        browser_download_url: String,
    }
    #[derive(serde::Deserialize)]
    struct Release {
        assets: Vec<Asset>,
    }

    let release: Release = client
        .get(RELEASE_API)
        .send()
        .await
        .with_context(|| format!("GET {RELEASE_API}"))?
        .error_for_status()?
        .text()
        .await
        .context("读取 release 信息失败")
        .and_then(|text| serde_json::from_str(&text).context("解析 release 信息失败"))?;
    let asset = pick_mpv_asset(
        release
            .assets
            .iter()
            .map(|a| (a.name.as_str(), a.size, a.browser_download_url.as_str())),
    )
    .ok_or_else(|| anyhow!("最新 release 中未找到 mpv-x86_64 下载包"))?;

    // 2. 流式下载到 tmp
    std::fs::create_dir_all(dirs.tmp_dir())?;
    let archive = dirs.tmp_dir().join("mpv-player.7z");
    download(app, &client, asset.1, &archive, asset.0).await?;

    // 3. 解出 mpv.exe（纯 Rust LZMA 解码较吃 CPU，放阻塞线程池）
    if CANCEL.load(Ordering::SeqCst) {
        let _ = std::fs::remove_file(&archive);
        return Err(anyhow!("已取消"));
    }
    let dest = target_mpv_path(dirs);
    std::fs::create_dir_all(dest.parent().unwrap())?;
    let archive2 = archive.clone();
    let dest2 = dest.clone();
    tauri::async_runtime::spawn_blocking(move || extract_mpv_exe(&archive2, &dest2))
        .await
        .map_err(|e| anyhow!("解压任务失败: {e}"))??;
    let _ = std::fs::remove_file(&archive);
    Ok(dest)
}

/// 从 release 资产中挑选常规 x86_64 完整包：排除 dev SDK（无 exe）、
/// -v3-（需要 AVX2 指令集的变体）与非 x86_64 架构。返回 (size, url)。
fn pick_mpv_asset<'a, I>(assets: I) -> Option<(u64, &'a str)>
where
    I: IntoIterator<Item = (&'a str, u64, &'a str)>,
{
    assets
        .into_iter()
        .find(|(name, _, _)| {
            name.starts_with("mpv-x86_64-")
                && name.ends_with(".7z")
                && !name.contains("-v3-")
                && !name.contains("dev")
        })
        .map(|(_, size, url)| (size, url))
}

async fn download(
    app: &tauri::AppHandle,
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    total_hint: u64,
) -> Result<()> {
    let mut resp = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?
        .error_for_status()?;
    let total = resp.content_length().unwrap_or(total_hint);

    let tmp = dest.with_extension("part");
    let mut file = std::fs::File::create(&tmp)
        .with_context(|| format!("创建文件失败: {}", tmp.display()))?;

    let mut received: u64 = 0;
    let mut last_notify = Instant::now() - Duration::from_secs(1);
    notify_progress(app, 0.0, received, total);

    while let Some(chunk) = resp.chunk().await? {
        if CANCEL.load(Ordering::SeqCst) {
            drop(file);
            let _ = std::fs::remove_file(&tmp);
            return Err(anyhow!("已取消"));
        }
        std::io::Write::write_all(&mut file, &chunk)?;
        received += chunk.len() as u64;
        let now = Instant::now();
        if now.duration_since(last_notify) >= Duration::from_millis(200) {
            last_notify = now;
            notify_progress(app, percent(received, total), received, total);
        }
    }
    std::io::Write::flush(&mut file)?;
    drop(file);
    std::fs::rename(&tmp, dest).with_context(|| format!("改名失败: {}", dest.display()))?;
    notify_progress(app, 100.0, received, total);
    Ok(())
}

fn percent(received: u64, total: u64) -> f64 {
    if total > 0 {
        (received as f64 / total as f64) * 100.0
    } else {
        0.0
    }
}

fn notify_progress(app: &tauri::AppHandle, percent: f64, received: u64, total: u64) {
    let _ = app.emit(
        "mpv-download-event",
        MpvDownloadEvent::Progress {
            percent,
            received_bytes: received,
            total_bytes: total,
        },
    );
}

/// 从 7z 包中解出 mpv.exe。整包解压到临时目录后再取出：
/// selective 跳过条目在 solid 压缩流下会破坏解码状态导致 CRC 校验失败。
pub fn extract_mpv_exe(archive: &Path, dest_exe: &Path) -> Result<()> {
    let out_dir = archive.with_file_name("mpv-player-extract");
    let _ = std::fs::remove_dir_all(&out_dir);
    std::fs::create_dir_all(&out_dir)?;

    let result = sevenz_rust2::decompress_file(archive, &out_dir);
    let extracted = find_file(&out_dir, "mpv.exe");
    let ok = result.is_ok();
    if let (true, Some(src)) = (ok, extracted) {
        let _ = std::fs::remove_file(dest_exe);
        std::fs::rename(&src, dest_exe)?;
    }
    let _ = std::fs::remove_dir_all(&out_dir);
    result.map_err(|e| anyhow!("解压失败: {e:#}"))?;
    if dest_exe.exists() {
        Ok(())
    } else {
        Err(anyhow!("压缩包中未找到 mpv.exe"))
    }
}

/// 递归查找首个同名文件（mpv.exe 位于包内 mpv/ 子目录）。
fn find_file(dir: &Path, name: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_file(&path, name) {
                return Some(found);
            }
        } else if path.file_name()?.to_string_lossy().eq_ignore_ascii_case(name) {
            return Some(path);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pick_asset_skips_dev_v3_and_wrong_arch() {
        let assets = [
            ("ffmpeg-x86_64-git-abc.7z", 1, "u1"),
            ("mpv-dev-x86_64-20260903-git-abc.7z", 2, "u2"),
            ("mpv-x86_64-v3-20260903-git-abc.7z", 3, "u3"),
            ("mpv-aarch64-20260903-git-abc.7z", 4, "u4"),
            ("mpv-i686-20260903-git-abc.7z", 5, "u5"),
            ("mpv-x86_64-20260903-git-abc.7z", 6, "u6"),
        ];
        assert_eq!(pick_mpv_asset(assets).map(|(s, u)| (s, u)), Some((6, "u6")));
    }

    /// 真实包解压验证：设置 MPV_TEST_7Z 指向已下载的 mpv-x86_64-*.7z 后运行
    /// `cargo test -- --ignored`，未设置时跳过。
    #[test]
    #[ignore = "需要 MPV_TEST_7Z 环境变量指向真实的 mpv 7z 包"]
    fn extract_real_mpv_archive() {
        let Some(path) = std::env::var_os("MPV_TEST_7Z") else {
            eprintln!("MPV_TEST_7Z 未设置，跳过");
            return;
        };
        let archive = PathBuf::from(path);
        let dest = archive.with_file_name("mpv-extracted.exe");
        extract_mpv_exe(&archive, &dest).expect("extract mpv.exe");
        let meta = std::fs::metadata(&dest).expect("mpv.exe exists");
        assert!(meta.len() > 10_000_000, "mpv.exe 体积异常: {}", meta.len());
    }
}
