//! 界面热更新：内置前端（随安装包分发的 dist）之外，支持从远程检查地址
//! 拉取新版界面（zip 包）替换主窗口加载目标，无需升级程序本体。
//!
//! - 数据目录 `ui/` 存放已下载的界面（`index.html` + 资源 + `ui.json` 清单）；
//! - 经 `ui://` 协议（Windows 实际形态 `http://ui.localhost/`）对外服务；
//! - 生效时主窗口优先加载 `ui://`（见 `active_target`，在 `skin::main_window_target`
//!   最前面接管）；还原机制删除该目录并清除生效标记，回到内置前端 / 皮肤。
//! - 「内置 html 前端」始终兜底：目录缺失或损坏时自动回退，主窗口永不白屏。

use crate::updater;
use crate::updater::compare_versions;
use percent_encoding::percent_decode_str;
use serde::{Deserialize, Serialize};
use tauri::http::{header, Request, Response, StatusCode};
use tauri::{AppHandle, Manager, UriSchemeContext, WebviewUrl};
use wallpaper_core::AppDirs;

/// Windows WebView2 下自定义协议的 URL 形态（与 skin / media 协议一致）。
pub const UI_ORIGIN: &str = "http://ui.localhost";
/// 界面条目文件。
pub const UI_ENTRY: &str = "index.html";
/// 已安装界面的清单文件名（应用更新时落盘，记录版本与来源）。
const MANIFEST_FILE: &str = "ui.json";

/// 远程更新清单（发布渠道提供的 `ui.json`）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UiRemoteManifest {
    pub version: String,
    /// zip 包地址；相对地址以清单地址为 base 解析。
    pub url: String,
    pub notes: String,
    pub date: String,
}

impl Default for UiRemoteManifest {
    fn default() -> Self {
        Self {
            version: String::new(),
            url: String::new(),
            notes: String::new(),
            date: String::new(),
        }
    }
}

/// 已安装界面的本地清单（`ui/ui.json`）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UiInstalledManifest {
    pub version: String,
    pub notes: String,
    pub date: String,
    pub source_url: String,
    pub applied_at: String,
}

impl Default for UiInstalledManifest {
    fn default() -> Self {
        Self {
            version: String::new(),
            notes: String::new(),
            date: String::new(),
            source_url: String::new(),
            applied_at: String::new(),
        }
    }
}

/// 前端事件载荷（tag = state，便于按分支解构）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum UiUpdateEvent {
    Checking,
    Available {
        version: String,
        notes: String,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        percent: f64,
        received_bytes: u64,
        total_bytes: u64,
    },
    Applied {
        version: String,
    },
    Restored,
    Error {
        message: String,
    },
}

fn publish(app: &AppHandle, event: UiUpdateEvent) {
    crate::publish_event(app, "ui-update-event", event);
}

pub fn ui_dir(dirs: &AppDirs) -> std::path::PathBuf {
    dirs.root.join("ui")
}

pub fn read_installed_manifest(dirs: &AppDirs) -> Option<UiInstalledManifest> {
    let text = std::fs::read_to_string(ui_dir(dirs).join(MANIFEST_FILE)).ok()?;
    serde_json::from_str(&text).ok()
}

/// 界面目录是否可用（清单 + 入口文件齐备）。
pub fn installed_valid(dirs: &AppDirs) -> bool {
    ui_dir(dirs).join(UI_ENTRY).is_file()
}

/// 直接读配置文件（不依赖 AppState；建窗时 state 可能尚未就绪，
/// 与 `skin::configured_skin_id` 同一模式）。
fn config_file_update(dirs: &AppDirs) -> wallpaper_core::ConfigUpdate {
    std::fs::read_to_string(dirs.config_file("update"))
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

/// 热更新界面生效时返回主窗口加载目标（在 `skin::main_window_target` 最前面接管）。
/// 仅当配置 `uiActive` 且界面目录可用时生效，否则 None 走常规皮肤解析。
pub fn active_target(dirs: &AppDirs) -> Option<crate::skin::MainWindowTarget> {
    if !config_file_update(dirs).ui_active {
        return None;
    }
    if !installed_valid(dirs) {
        log::warn!("热更新界面目录不可用，回退常规皮肤解析");
        return None;
    }
    let url: tauri::Url = format!("{UI_ORIGIN}/{UI_ENTRY}").parse().ok()?;
    Some(crate::skin::MainWindowTarget {
        url: WebviewUrl::External(url),
        extra_init_scripts: Vec::new(),
    })
}

// ---------- 检查 / 应用 / 还原 ----------

/// 拉取远程更新清单，返回（清单, 归一化清单地址）。
pub async fn fetch_manifest(url: &str) -> Result<(UiRemoteManifest, String), String> {
    let manifest_url = updater::validate_update_url(url)?;
    let remote: UiRemoteManifest = updater::http_client()?
        .get(manifest_url.clone())
        .send()
        .await
        .map_err(|e| format!("请求更新清单失败: {e}"))?
        .error_for_status()
        .map_err(|e| format!("更新清单请求失败: {e}"))?
        .json()
        .await
        .map_err(|e| format!("解析更新清单失败: {e}"))?;
    if remote.version.trim().is_empty() || remote.url.trim().is_empty() {
        return Err("更新清单缺少 version / url 字段".into());
    }
    Ok((remote, manifest_url.to_string()))
}

/// 检查远程是否有比已安装版本更新的界面。返回 Some(清单) 表示有更新。
pub async fn check(dirs: &AppDirs, url: &str) -> Result<Option<UiRemoteManifest>, String> {
    let (remote, _) = fetch_manifest(url).await?;
    let installed = read_installed_manifest(dirs)
        .map(|m| m.version)
        .unwrap_or_else(|| "0.0.0".into());
    if compare_versions(&remote.version, &installed) == std::cmp::Ordering::Greater {
        Ok(Some(remote))
    } else {
        Ok(None)
    }
}

/// 下载并应用界面更新（zip -> `ui/` 原子换装 -> 置生效标记 -> 广播事件）。
/// 返回新版本号。调用方负责应用后刷新主窗口。
pub async fn apply(app: &AppHandle, manifest: &UiRemoteManifest, manifest_url: &str) -> Result<String, String> {
    let dirs = app_dirs(app);
    publish(app, UiUpdateEvent::Progress { percent: 0.0, received_bytes: 0, total_bytes: 0 });

    // 1. 下载 zip 到 tmp
    let target = updater::resolve_against(manifest_url, &manifest.url)?;
    let client = updater::http_client()?;
    let zip_path = dirs.tmp_dir().join("ui-update.zip");
    let _ = std::fs::create_dir_all(dirs.tmp_dir());
    {
        let mut resp = client
            .get(target.clone())
            .send()
            .await
            .map_err(|e| format!("下载界面更新失败: {e}"))?
            .error_for_status()
            .map_err(|e| format!("下载界面更新失败: {e}"))?;
        let total = resp.content_length().unwrap_or(0);
        let mut file = std::fs::File::create(&zip_path).map_err(|e| format!("创建文件失败: {e}"))?;
        let mut received: u64 = 0;
        use std::io::Write;
        use std::time::{Duration, Instant};
        let mut last_notify = Instant::now() - Duration::from_secs(1);
        while let Some(chunk) = resp
            .chunk()
            .await
            .map_err(|e| format!("下载界面更新失败: {e}"))?
        {
            file.write_all(&chunk).map_err(|e| format!("写入文件失败: {e}"))?;
            received += chunk.len() as u64;
            let now = Instant::now();
            if now.duration_since(last_notify) >= Duration::from_millis(200) {
                last_notify = now;
                let percent = if total > 0 { received as f64 / total as f64 * 100.0 } else { 0.0 };
                publish(app, UiUpdateEvent::Progress { percent, received_bytes: received, total_bytes: total });
            }
        }
        file.flush().map_err(|e| format!("写入文件失败: {e}"))?;
    }

    // 2. 解压到 staging（zip-slip 防护），入口文件齐备才允许换装
    let staging = dirs.root.join("ui.staging");
    let _ = std::fs::remove_dir_all(&staging);
    std::fs::create_dir_all(&staging).map_err(|e| format!("创建目录失败: {e}"))?;
    let staging2 = staging.clone();
    let zip2 = zip_path.clone();
    tauri::async_runtime::spawn_blocking(move || extract_zip(&zip2, &staging2))
        .await
        .map_err(|e| format!("解压任务失败: {e}"))??;
    if !staging.join(UI_ENTRY).is_file() {
        let _ = std::fs::remove_dir_all(&staging);
        let _ = std::fs::remove_file(&zip_path);
        return Err(format!("更新包缺少入口文件 {UI_ENTRY}"));
    }

    // 3. 原子换装：ui -> ui.old -> 删除；staging -> ui
    let installed = ui_dir(&dirs);
    let backup = dirs.root.join("ui.old");
    let _ = std::fs::remove_dir_all(&backup);
    if installed.exists() {
        std::fs::rename(&installed, &backup).map_err(|e| format!("备份旧界面失败: {e}"))?;
    }
    if let Err(e) = std::fs::rename(&staging, &installed) {
        // 换装失败则回滚备份，保住可用界面
        if backup.exists() {
            let _ = std::fs::rename(&backup, &installed);
        }
        let _ = std::fs::remove_dir_all(&staging);
        return Err(format!("应用界面更新失败: {e}"));
    }
    let _ = std::fs::remove_dir_all(&backup);
    let _ = std::fs::remove_file(&zip_path);

    // 4. 落盘本地清单 + 置生效标记
    let record = UiInstalledManifest {
        version: manifest.version.clone(),
        notes: manifest.notes.clone(),
        date: manifest.date.clone(),
        source_url: manifest_url.to_string(),
        applied_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };
    std::fs::write(
        installed.join(MANIFEST_FILE),
        serde_json::to_string_pretty(&record).unwrap_or_default(),
    )
    .map_err(|e| format!("写入清单失败: {e}"))?;
    set_ui_active(app, true);
    publish(app, UiUpdateEvent::Applied { version: manifest.version.clone() });
    log::info!("ui update applied: v{}", manifest.version);
    Ok(manifest.version.clone())
}

/// 还原内置界面：删除 `ui/`、清除生效标记、广播事件。
pub fn restore(app: &AppHandle) -> Result<(), String> {
    let dirs = app_dirs(app);
    let _ = std::fs::remove_dir_all(ui_dir(&dirs));
    let _ = std::fs::remove_dir_all(dirs.root.join("ui.old"));
    let _ = std::fs::remove_dir_all(dirs.root.join("ui.staging"));
    set_ui_active(app, false);
    publish(app, UiUpdateEvent::Restored);
    log::info!("ui update restored to builtin frontend");
    Ok(())
}

fn app_dirs(app: &AppHandle) -> AppDirs {
    app.try_state::<crate::state::AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve)
}

fn set_ui_active(app: &AppHandle, active: bool) {
    if let Some(st) = app.try_state::<crate::state::AppState>() {
        let mut config = st.config.lock();
        config.update.ui_active = active;
        config.save_all();
    }
}

/// 解压界面更新包（zip）。防 zip-slip：拒绝绝对路径、`..` 段与非法文件名。
fn extract_zip(archive: &std::path::Path, dest: &std::path::Path) -> Result<(), String> {
    let file = std::fs::File::open(archive).map_err(|e| format!("打开更新包失败: {e}"))?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("读取更新包失败: {e}"))?;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|e| format!("读取更新包失败: {e}"))?;
        if entry.is_dir() {
            continue;
        }
        let name = entry.name().replace('\\', "/");
        let rel = name.trim_start_matches('/');
        if rel.is_empty()
            || rel.split('/').any(|seg| seg.is_empty() || seg == "..")
            || rel.contains(':')
        {
            return Err(format!("更新包包含非法路径: {name}"));
        }
        let out = dest.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
        }
        let mut out_file =
            std::fs::File::create(&out).map_err(|e| format!("创建文件失败: {e}"))?;
        std::io::copy(&mut entry, &mut out_file).map_err(|e| format!("解压文件失败: {e}"))?;
    }
    Ok(())
}

// ---------- 启动自动检查 ----------

/// 启动后台检查（配置 uiAuto 且配置了地址时）：有新版本即下载应用并刷新主窗口。
pub fn start_background(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let dirs = app_dirs(&app);
        let (url, auto) = {
            let config = config_file_update(&dirs);
            (config.ui_url.clone(), config.ui_auto)
        };
        if !auto || url.trim().is_empty() {
            return;
        }
        publish(&app, UiUpdateEvent::Checking);
        match check(&dirs, &url).await {
            Ok(Some(manifest)) => {
                publish(
                    &app,
                    UiUpdateEvent::Available {
                        version: manifest.version.clone(),
                        notes: manifest.notes.clone(),
                    },
                );
                match apply(&app, &manifest, &url).await {
                    Ok(_) => refresh_main_window(&app),
                    Err(e) => {
                        log::warn!("startup ui update failed: {e}");
                        publish(&app, UiUpdateEvent::Error { message: e });
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                log::warn!("startup ui update check failed: {e}");
                publish(&app, UiUpdateEvent::Error { message: e });
            }
        }
    });
}

/// 应用界面更新后刷新主窗口。仅当窗口已存在（GUI 模式）时原地 navigate；
/// headless 下不建窗，下次唤起自然加载新界面。
fn refresh_main_window(app: &AppHandle) {
    if app.get_webview("main").is_some() {
        crate::recreate_main_window(app);
    }
}

// ---------- `ui://` 协议 ----------

pub fn handle<R: tauri::Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let dirs = ctx
        .app_handle()
        .try_state::<crate::state::AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve);
    respond(&dirs, request).unwrap_or_else(|_| {
        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(b"internal error".to_vec())
            .unwrap()
    })
}

fn respond(dirs: &AppDirs, request: Request<Vec<u8>>) -> Result<Response<Vec<u8>>, tauri::Error> {
    let uri = request.uri().to_string();
    // `http://ui.localhost/<path>` -> `<path>`
    let path = uri
        .split_once("://")
        .and_then(|(_, rest)| rest.split_once('/'))
        .map(|(_, path)| path.split(['?', '#']).next().unwrap_or(path))
        .unwrap_or("");
    let decoded = percent_decode_str(path).decode_utf8_lossy().replace('\\', "/");
    let rel = decoded.trim_start_matches('/');
    if rel.is_empty() || rel.split('/').any(|seg| seg.is_empty() || seg == "..") || rel.contains(':')
    {
        return not_found();
    }
    let file = ui_dir(dirs).join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
    if !file.is_file() {
        return not_found();
    }
    match std::fs::read(&file) {
        Ok(bytes) => {
            let mime = crate::skin::mime_of(&file);
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime)
                .header(header::CACHE_CONTROL, "no-cache")
                .header(header::CONTENT_LENGTH, bytes.len())
                .body(bytes)
                .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))
        }
        Err(_) => not_found(),
    }
}

fn not_found() -> Result<Response<Vec<u8>>, tauri::Error> {
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(b"not found".to_vec())
        .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use wallpaper_core::AppDirs;

    fn temp_dirs(tag: &str) -> AppDirs {
        let root = std::env::temp_dir().join(format!("wp4-uiupd-test-{}-{tag}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        AppDirs::new(root)
    }

    #[test]
    fn extract_zip_blocks_slip_and_unpacks() {
        let dirs = temp_dirs("extract");
        let src = dirs.root.join("src");
        std::fs::create_dir_all(src.join("assets")).unwrap();
        std::fs::write(src.join(UI_ENTRY), b"<h1>hi</h1>").unwrap();
        std::fs::write(src.join("assets").join("a.css"), b"body{}").unwrap();
        let zip_path = dirs.root.join("ui.zip");
        make_zip(&src, &zip_path);
        let dest = dirs.root.join("out");
        std::fs::create_dir_all(&dest).unwrap();
        extract_zip(&zip_path, &dest).unwrap();
        assert!(dest.join(UI_ENTRY).is_file());
        assert!(dest.join("assets").join("a.css").is_file());
    }

    /// 真实发布包解压验证：设置 UI_TEST_ZIP 指向 publish 脚本产出的
    /// `ui-<version>.zip` 后运行 `cargo test -- --ignored`，未设置时跳过。
    #[test]
    #[ignore = "需要 UI_TEST_ZIP 环境变量指向真实的界面更新 zip 包"]
    fn extract_real_ui_archive() {
        let Some(path) = std::env::var_os("UI_TEST_ZIP") else {
            eprintln!("UI_TEST_ZIP 未设置，跳过");
            return;
        };
        let dest = std::env::temp_dir().join(format!("wp4-ui-real-extract-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dest);
        std::fs::create_dir_all(&dest).unwrap();
        extract_zip(std::path::Path::new(&path), &dest).expect("extract real ui zip");
        assert!(dest.join(UI_ENTRY).is_file(), "入口 index.html 应存在");
        let _ = std::fs::remove_dir_all(&dest);
    }

    /// 用 zip crate 自打测试包（发布端等价物是 Compress-Archive / tar -a）。
    fn make_zip(src: &std::path::Path, out: &std::path::Path) {
        let file = std::fs::File::create(out).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options: zip::write::SimpleFileOptions = Default::default();
        for entry in walk(src, src) {
            let rel = entry.strip_prefix(src).unwrap().to_string_lossy().replace('\\', "/");
            if entry.is_dir() {
                zip.add_directory(rel, options).unwrap();
            } else {
                zip.start_file(rel, options).unwrap();
                std::io::copy(&mut std::fs::File::open(&entry).unwrap(), &mut zip).unwrap();
            }
        }
        zip.finish().unwrap();
    }

    fn walk(dir: &std::path::Path, root: &std::path::Path) -> Vec<std::path::PathBuf> {
        let mut out = Vec::new();
        for entry in std::fs::read_dir(dir).unwrap().flatten() {
            let path = entry.path();
            if path.is_dir() {
                out.extend(walk(&path, root));
            } else {
                out.push(path);
            }
        }
        let _ = root;
        out
    }

    #[test]
    fn active_target_requires_config_and_entry() {
        let dirs = temp_dirs("active");
        // 未生效 -> None
        assert!(active_target(&dirs).is_none());
        // 写生效标记但目录为空 -> None（回退，不白屏）
        std::fs::create_dir_all(dirs.configs_dir()).unwrap();
        std::fs::write(
            dirs.config_file("update"),
            r#"{"uiUrl":"","uiAuto":true,"uiActive":true,"appUrl":"","appChannel":"stable","appAutoDownload":true}"#,
        )
        .unwrap();
        assert!(active_target(&dirs).is_none());
        // 目录齐备 -> External(ui origin)
        std::fs::create_dir_all(ui_dir(&dirs)).unwrap();
        std::fs::write(ui_dir(&dirs).join(UI_ENTRY), b"<h1></h1>").unwrap();
        let target = active_target(&dirs).unwrap();
        match target.url {
            WebviewUrl::External(url) => {
                assert_eq!(url.as_str(), format!("{UI_ORIGIN}/{UI_ENTRY}"));
            }
            _ => panic!("expected external ui url"),
        }
        let _ = std::fs::remove_dir_all(&dirs.root);
    }

    #[test]
    fn installed_version_compare_semantics() {
        // check 的版本比较逻辑（已安装 vs 远程）走 updater::compare_versions
        assert_eq!(
            compare_versions("1.0.1", "1.0.0"),
            std::cmp::Ordering::Greater
        );
    }
}
