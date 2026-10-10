//! 程序自动更新：从检查地址按通道（正式版 stable / 预览版 preview）拉取更新
//! 清单，发现新版本后（可选）自动下载安装包到数据目录 `update/`；安装始终
//! 由用户在界面上确认（点击「安装并重启」），也可以选择暂不安装。
//!
//! 清单约定（发布渠道提供，见 scripts/publish.ts 与 docs/6.更新与发布.md）：
//! - `<base>/stable.json`  正式版通道
//! - `<base>/preview.json` 预览版通道
//! - 字段：`version` / `url`（安装包地址，相对地址以清单为 base） / `notes` / `date`
//!
//! stable 通道忽略预发布版本；preview 通道两者都可。版本比较为宽松 semver
//! （`4.0.1-alpha.3 < 4.0.1`），见 [`crate::updater::compare_versions`]。

use crate::updater;
use crate::updater::compare_versions;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};
use wallpaper_core::AppDirs;

/// 更新通道。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Channel {
    Off,
    Stable,
    Preview,
}

impl Channel {
    pub fn parse(value: &str) -> Self {
        match value {
            "preview" => Channel::Preview,
            "stable" => Channel::Stable,
            _ => Channel::Off,
        }
    }

    fn manifest_name(self) -> &'static str {
        match self {
            Channel::Preview => "preview.json",
            _ => "stable.json",
        }
    }
}

/// 远程更新信息（清单内容 + 所属通道）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppUpdateInfo {
    pub version: String,
    /// 安装包地址；相对地址以清单地址为 base 解析。
    pub url: String,
    pub notes: String,
    pub date: String,
    pub channel: String,
}

impl Default for AppUpdateInfo {
    fn default() -> Self {
        Self {
            version: String::new(),
            url: String::new(),
            notes: String::new(),
            date: String::new(),
            channel: String::new(),
        }
    }
}

/// 安装状态快照（设置页渲染用；下载进度经 app-update-event 实时推送）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateState {
    pub channel: String,
    pub auto_download: bool,
    /// idle | available | downloading | downloaded | error
    pub phase: String,
    pub percent: f64,
    pub info: Option<AppUpdateInfo>,
    pub error: Option<String>,
    pub downloaded_version: Option<String>,
}

/// 前端事件载荷（tag = state，便于按分支解构）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum AppUpdateEvent {
    Checking,
    UpToDate,
    Available {
        version: String,
        notes: String,
        channel: String,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        percent: f64,
        received_bytes: u64,
        total_bytes: u64,
    },
    Downloaded {
        version: String,
    },
    Error {
        message: String,
    },
}

static DOWNLOADING: AtomicBool = AtomicBool::new(false);
static LAST_INFO: Mutex<Option<AppUpdateInfo>> = Mutex::new(None);
static LAST_ERROR: Mutex<Option<String>> = Mutex::new(None);
static DOWNLOADED: Mutex<Option<(String, std::path::PathBuf)>> = Mutex::new(None);

fn publish(app: &AppHandle, event: AppUpdateEvent) {
    crate::publish_event(app, "app-update-event", event);
}

fn update_dir(dirs: &AppDirs) -> std::path::PathBuf {
    dirs.root.join("update")
}

fn installer_path(dirs: &AppDirs, version: &str) -> std::path::PathBuf {
    update_dir(dirs).join(format!("GiantappWallpaper_{version}_x64-setup.exe"))
}

fn app_dirs(app: &AppHandle) -> AppDirs {
    app.try_state::<crate::state::AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve)
}

/// 当前设置快照。
pub fn current_state(app: &AppHandle) -> AppUpdateState {
    let dirs = app_dirs(app);
    let (channel, auto_download) = read_config(&dirs);
    let info = LAST_INFO.lock().clone();
    let error = LAST_ERROR.lock().clone();
    let downloaded = DOWNLOADED.lock().clone().map(|(v, _)| v);
    let phase = if DOWNLOADING.load(Ordering::SeqCst) {
        "downloading"
    } else if downloaded.is_some() {
        "downloaded"
    } else if error.is_some() {
        "error"
    } else if info.is_some() {
        "available"
    } else {
        "idle"
    };
    AppUpdateState {
        channel,
        auto_download,
        phase: phase.into(),
        percent: 0.0,
        info,
        error,
        downloaded_version: downloaded,
    }
}

fn read_config(dirs: &AppDirs) -> (String, bool) {
    let config: Option<wallpaper_core::ConfigUpdate> = std::fs::read_to_string(dirs.config_file("update"))
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok());
    match config {
        Some(c) => (c.normalized_channel(), c.app_auto_download),
        None => ("stable".to_string(), true),
    }
}

/// 检查用清单地址：`<base>/<stable|preview>.json`。
/// base 允许带路径段（多产品共用发布桶后为 `https://<worker>/wallpaper`），
/// 不能用 `Url::join` 直接拼——base 无尾斜杠时 RFC 语义会吞掉最后一段。
fn manifest_url_for(base: &str, manifest_name: &str) -> Result<reqwest::Url, String> {
    let mut url = updater::validate_update_url(base)?;
    if !url.path().ends_with('/') {
        url.set_path(&format!("{}/", url.path()));
    }
    url.join(manifest_name).map_err(|e| format!("地址无效: {e}"))
}

/// 按当前配置的地址与通道检查更新。
/// 返回 Some(信息) 表示有比当前程序更新的版本（已缓存到 LAST_INFO 并广播事件）。
pub async fn check(app: &AppHandle) -> Result<Option<AppUpdateInfo>, String> {
    let dirs = app_dirs(app);
    let (channel_raw, _) = read_config(&dirs);
    let channel = Channel::parse(&channel_raw);
    LAST_ERROR.lock().take();
    if channel == Channel::Off {
        return Ok(None);
    }
    let base = {
        let st = app.try_state::<crate::state::AppState>();
        let url = st
            .map(|s| s.config.lock().update.app_url.clone())
            .unwrap_or_default();
        if url.trim().is_empty() {
            return Ok(None);
        }
        url
    };
    publish(app, AppUpdateEvent::Checking);

    let manifest_url = manifest_url_for(&base, channel.manifest_name())?;
    let mut info: AppUpdateInfo = updater::http_client()?
        .get(manifest_url.clone())
        .send()
        .await
        .map_err(|e| format!("请求更新清单失败: {e}"))?
        .error_for_status()
        .map_err(|e| format!("更新清单请求失败: {e}"))?
        .json()
        .await
        .map_err(|e| format!("解析更新清单失败: {e}"))?;
    if info.version.trim().is_empty() || info.url.trim().is_empty() {
        return Err("更新清单缺少 version / url 字段".into());
    }
    // stable 通道忽略预发布版本（预发布走 preview 通道发布）
    if channel == Channel::Stable && updater::is_prerelease(&info.version) {
        publish(app, AppUpdateEvent::UpToDate);
        return Ok(None);
    }
    info.channel = channel_raw.clone();
    if compare_versions(&info.version, crate::APP_VERSION) != std::cmp::Ordering::Greater {
        publish(app, AppUpdateEvent::UpToDate);
        return Ok(None);
    }
    *LAST_INFO.lock() = Some(info.clone());
    // 已下载过同一版本则直接进入 downloaded 状态
    if installer_path(&dirs, &info.version).exists() {
        *DOWNLOADED.lock() = Some((info.version.clone(), installer_path(&dirs, &info.version)));
        publish(app, AppUpdateEvent::Downloaded { version: info.version.clone() });
    } else {
        publish(
            app,
            AppUpdateEvent::Available {
                version: info.version.clone(),
                notes: info.notes.clone(),
                channel: info.channel.clone(),
            },
        );
    }
    Ok(Some(info))
}

/// 下载指定更新（默认用最近一次检查结果）到 `update/` 目录，进度经事件广播。
pub async fn download(app: &AppHandle, info: Option<AppUpdateInfo>) -> Result<(), String> {
    let resolved = match info {
        Some(i) => i,
        None => LAST_INFO
            .lock()
            .clone()
            .ok_or_else(|| "请先检查更新".to_string())?,
    };
    if DOWNLOADING.swap(true, Ordering::SeqCst) {
        return Err("正在下载更新".into());
    }
    let result = download_inner(app, resolved).await;
    DOWNLOADING.store(false, Ordering::SeqCst);
    match result {
        Ok((version, path)) => {
            *DOWNLOADED.lock() = Some((version.clone(), path));
            publish(app, AppUpdateEvent::Downloaded { version });
            Ok(())
        }
        Err(e) => {
            *LAST_ERROR.lock() = Some(e.clone());
            publish(app, AppUpdateEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

async fn download_inner(app: &AppHandle, info: AppUpdateInfo) -> Result<(String, std::path::PathBuf), String> {
    let dirs = app_dirs(app);
    let manifest_url = {
        let st = app.try_state::<crate::state::AppState>();
        st.map(|s| s.config.lock().update.app_url.clone()).unwrap_or_default()
    };
    let target = updater::resolve_against(&manifest_url, &info.url)?;
    let dest = installer_path(&dirs, &info.version);
    std::fs::create_dir_all(update_dir(&dirs)).map_err(|e| format!("创建目录失败: {e}"))?;

    let client = updater::http_client()?;
    let mut resp = client
        .get(target.clone())
        .send()
        .await
        .map_err(|e| format!("下载安装包失败: {e}"))?
        .error_for_status()
        .map_err(|e| format!("下载安装包失败: {e}"))?;
    let total = resp.content_length().unwrap_or(0);
    let tmp = dest.with_extension("part");
    let mut file = std::fs::File::create(&tmp).map_err(|e| format!("创建文件失败: {e}"))?;
    use std::io::Write;
    use std::time::{Duration, Instant};
    let mut received: u64 = 0;
    let mut last_notify = Instant::now() - Duration::from_secs(1);
    publish(app, AppUpdateEvent::Progress { percent: 0.0, received_bytes: 0, total_bytes: total });
    while let Some(chunk) = resp
        .chunk()
        .await
        .map_err(|e| format!("下载安装包失败: {e}"))?
    {
        file.write_all(&chunk).map_err(|e| format!("写入文件失败: {e}"))?;
        received += chunk.len() as u64;
        let now = Instant::now();
        if now.duration_since(last_notify) >= Duration::from_millis(200) {
            last_notify = now;
            let percent = if total > 0 { received as f64 / total as f64 * 100.0 } else { 0.0 };
            publish(app, AppUpdateEvent::Progress { percent, received_bytes: received, total_bytes: total });
        }
    }
    file.flush().map_err(|e| format!("写入文件失败: {e}"))?;
    drop(file);
    std::fs::rename(&tmp, &dest).map_err(|e| format!("保存安装包失败: {e}"))?;
    Ok((info.version.clone(), dest))
}

/// 安装已下载的更新：写批处理（等待安装器静默完成后重启应用）→ 分离进程执行
/// → 走托盘退出语义（持久化窗口状态 / 按配置处理壁纸）退出应用。
/// perMachine 安装器需要提权，UAC 弹窗由安装器清单触发。
pub fn install(app: &AppHandle) -> Result<(), String> {
    let (version, path) = DOWNLOADED
        .lock()
        .clone()
        .ok_or_else(|| "没有已下载的更新".to_string())?;
    if !path.exists() {
        *DOWNLOADED.lock() = None;
        return Err("安装包不存在，请重新下载".into());
    }
    let exe = std::env::current_exe().map_err(|e| format!("定位程序失败: {e}"))?;
    let dirs = app_dirs(app);
    let script_path = dirs.tmp_dir().join("apply-update.cmd");
    let script = format!(
        "@echo off\r\nstart \"\" /wait \"{}\" /S\r\nstart \"\" \"{}\"\r\ndel \"%~f0\"\r\n",
        path.display(),
        exe.display()
    );
    std::fs::create_dir_all(dirs.tmp_dir()).map_err(|e| format!("创建目录失败: {e}"))?;
    std::fs::write(&script_path, script).map_err(|e| format!("写入安装脚本失败: {e}"))?;

    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    const DETACHED_PROCESS: u32 = 0x0000_0008;
    std::process::Command::new("cmd")
        .arg("/C")
        .arg(&script_path)
        .creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS)
        .spawn()
        .map_err(|e| format!("启动安装程序失败: {e}"))?;
    log::info!("app update install launched: v{version}");
    // 走托盘退出语义：持久化窗口状态 + 按配置保留/清理壁纸（与 exit_app 一致）
    crate::tray::quit(app.clone());
    Ok(())
}

// ---------- 启动自动检查 ----------

/// 启动后台检查：通道开启时拉清单；发现新版本且允许自动下载则直接下载，
/// 下载完成后界面上提示用户确认安装（用户可以选择暂不安装）。
pub fn start_background(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let dirs = app_dirs(&app);
        let (channel_raw, auto_download) = read_config(&dirs);
        let channel = Channel::parse(&channel_raw);
        if channel == Channel::Off {
            return;
        }
        match check(&app).await {
            Ok(Some(info)) => {
                if auto_download {
                    if let Err(e) = download(&app, Some(info)).await {
                        log::warn!("app update auto download failed: {e}");
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                log::warn!("startup app update check failed: {e}");
                *LAST_ERROR.lock() = Some(e);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn channel_parse_and_manifest() {
        assert_eq!(Channel::parse("stable"), Channel::Stable);
        assert_eq!(Channel::parse("preview"), Channel::Preview);
        assert_eq!(Channel::parse("off"), Channel::Off);
        assert_eq!(Channel::parse("whatever"), Channel::Off);
        assert_eq!(Channel::Stable.manifest_name(), "stable.json");
        assert_eq!(Channel::Preview.manifest_name(), "preview.json");
    }

    #[test]
    fn manifest_url_keeps_base_path() {
        // 多产品共用发布桶后 base 带产品前缀（如 .../wallpaper）：
        // 尾斜杠有无都必须保住路径段，清单地址落在前缀内而非根（2026-10-10 回归）。
        for base in ["https://x.example.com/wallpaper", "https://x.example.com/wallpaper/"] {
            assert_eq!(
                manifest_url_for(base, "stable.json").unwrap().as_str(),
                "https://x.example.com/wallpaper/stable.json"
            );
        }
        assert_eq!(
            manifest_url_for("https://x.example.com", "preview.json").unwrap().as_str(),
            "https://x.example.com/preview.json"
        );
        assert!(manifest_url_for("ftp://x.example.com", "stable.json").is_err());
    }

    #[test]
    fn installer_path_layout() {
        let root = std::env::temp_dir().join(format!("wp4-appupd-test-{}", std::process::id()));
        let dirs = AppDirs::new(root);
        assert_eq!(
            installer_path(&dirs, "4.0.2"),
            dirs.root.join("update").join("GiantappWallpaper_4.0.2_x64-setup.exe")
        );
    }
}
