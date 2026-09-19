//! 皮肤系统：皮肤 = 数据目录 `skins/<id>/` 下的一个文件夹
//! （`skin.json` 清单 + 任意技术栈的静态前端）。
//!
//! - `app` 型：完整替换主窗口界面，经 `http://skin.localhost/<id>/<entry>` 加载
//!   （Windows WebView2 下自定义协议的形态，与 media 协议一致）。
//! - `style` 型：仅注入一个 CSS 覆盖默认皮肤外观。
//! - 内置默认皮肤即现有 React 应用（`index.html`），清单非法 / entry 缺失一律
//!   回退默认，保证主窗口永不白屏。
//!
//! 皮肤与默认 UI 同权调用应用命令（Tauri invoke）与事件；SDK 以
//! `/_sdk/client.js` 相对路径引入（由本模块的协议处理器提供）。

use percent_encoding::percent_decode_str;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Manager, UriSchemeContext, WebviewUrl};
use wallpaper_core::AppDirs;

pub const DEFAULT_SKIN_ID: &str = "default";
/// 清单兼容版本（应用大版本）。
const SKIN_COMPAT: u32 = 4;
/// Windows WebView2 下自定义协议的 URL 形态（与 media 协议一致）。
pub const SKIN_ORIGIN: &str = "http://skin.localhost";

/// skin.json 清单。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SkinManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    /// `app`（完整界面）| `style`（仅 CSS 覆盖）
    #[serde(rename = "type")]
    pub kind: String,
    /// app 型为 HTML 入口；style 型为 CSS 文件。
    pub entry: String,
    pub compat: u32,
}

impl Default for SkinManifest {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            version: "0.0.0".into(),
            author: String::new(),
            description: String::new(),
            kind: "app".into(),
            entry: "index.html".into(),
            compat: SKIN_COMPAT,
        }
    }
}

/// 皮肤列表项（含无效项，便于设置页展示失败原因）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub entry: String,
    /// 内置默认皮肤。
    pub builtin: bool,
    pub valid: bool,
    pub invalid_reason: Option<String>,
}

pub fn skins_dir(dirs: &AppDirs) -> PathBuf {
    dirs.root.join("skins")
}

/// id 白名单：字母数字与 `-_.`，防止路径穿越 / 非法协议 URL。
fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id != DEFAULT_SKIN_ID
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '.')
        && !id.starts_with('.')
}

fn parse_manifest(dir: &Path) -> Result<SkinManifest, String> {
    let text = std::fs::read_to_string(dir.join("skin.json"))
        .map_err(|e| format!("读取 skin.json 失败: {e}"))?;
    let manifest: SkinManifest =
        serde_json::from_str(&text).map_err(|e| format!("解析 skin.json 失败: {e}"))?;
    if !valid_id(&manifest.id) {
        return Err(format!("非法皮肤 id: {:?}", manifest.id));
    }
    if manifest.compat != SKIN_COMPAT {
        return Err(format!(
            "不兼容的清单版本 {}（需要 {SKIN_COMPAT}）",
            manifest.compat
        ));
    }
    if manifest.kind != "app" && manifest.kind != "style" {
        return Err(format!("未知皮肤类型: {}", manifest.kind));
    }
    if manifest.entry.is_empty()
        || manifest.entry.contains("..")
        || manifest.entry.starts_with('/')
        || manifest.entry.starts_with('\\')
    {
        return Err(format!("非法 entry: {:?}", manifest.entry));
    }
    if manifest.name.is_empty() {
        return Err("缺少皮肤名称".into());
    }
    Ok(manifest)
}

/// 校验皮肤目录的清单（供 set_active_skin 预检）。
pub fn parse_manifest_pub(dir: &Path) -> Result<SkinManifest, String> {
    parse_manifest(dir)
}

fn info_of(dir: &Path) -> SkinInfo {
    let invalid = |reason: String| SkinInfo {
        id: dir
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default(),
        name: dir
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default(),
        version: String::new(),
        author: String::new(),
        description: String::new(),
        kind: "app".into(),
        entry: String::new(),
        builtin: false,
        valid: false,
        invalid_reason: Some(reason),
    };
    match parse_manifest(dir) {
        Ok(m) => {
            let entry_exists = dir.join(&m.entry).is_file();
            let missing_entry = (!entry_exists)
                .then(|| format!("入口文件缺失: {}", m.entry));
            SkinInfo {
                id: m.id,
                name: m.name,
                version: m.version,
                author: m.author,
                description: m.description,
                kind: m.kind,
                entry: m.entry,
                builtin: false,
                valid: entry_exists,
                invalid_reason: missing_entry,
            }
        }
        Err(e) => invalid(e),
    }
}

/// 列出全部皮肤（默认皮肤固定在首位）。
pub fn list_skins(dirs: &AppDirs) -> Vec<SkinInfo> {
    let mut out = vec![SkinInfo {
        id: DEFAULT_SKIN_ID.into(),
        name: "默认皮肤".into(),
        version: crate::APP_VERSION.into(),
        author: "GiantappMan".into(),
        description: "应用内置界面".into(),
        kind: "app".into(),
        entry: "index.html".into(),
        builtin: true,
        valid: true,
        invalid_reason: None,
    }];
    let dir = skins_dir(dirs);
    if let Ok(entries) = std::fs::read_dir(&dir) {
        let mut infos: Vec<SkinInfo> = entries
            .flatten()
            .filter(|e| e.path().is_dir())
            .map(|e| info_of(&e.path()))
            .collect();
        infos.sort_by(|a, b| a.id.cmp(&b.id));
        out.extend(infos);
    }
    out
}

/// 主窗口加载目标：URL + 附加初始化脚本。
pub struct MainWindowTarget {
    pub url: WebviewUrl,
    pub extra_init_scripts: Vec<String>,
}

/// 解析当前生效皮肤 -> 主窗口加载目标。
/// 任何无效情形（清单坏 / entry 缺失 / id 未知）回退默认皮肤。
pub fn main_window_target(dirs: &AppDirs, configured: &str) -> MainWindowTarget {
    let fallback = MainWindowTarget {
        url: WebviewUrl::App("index.html".into()),
        extra_init_scripts: Vec::new(),
    };
    if configured.is_empty() || configured == DEFAULT_SKIN_ID || !valid_id(configured) {
        return fallback;
    }
    let dir = skins_dir(dirs).join(configured);
    let Ok(manifest) = parse_manifest(&dir) else {
        log::warn!("皮肤 {configured} 清单无效，回退默认皮肤");
        return fallback;
    };
    if !dir.join(&manifest.entry).is_file() {
        log::warn!("皮肤 {configured} 入口 {} 缺失，回退默认皮肤", manifest.entry);
        return fallback;
    }
    match manifest.kind.as_str() {
        "app" => {
            let url: tauri::Url = skin_file_url(configured, &manifest.entry)
                .parse()
                .unwrap_or_else(|_| "http://skin.localhost/".parse().unwrap());
            MainWindowTarget {
                url: WebviewUrl::External(url),
                extra_init_scripts: Vec::new(),
            }
        }
        "style" => MainWindowTarget {
            url: WebviewUrl::App("index.html".into()),
            extra_init_scripts: vec![style_link_script(
                &skin_file_url(configured, &manifest.entry),
            )],
        },
        _ => fallback,
    }
}

fn skin_file_url(id: &str, rel: &str) -> String {
    format!("{SKIN_ORIGIN}/{id}/{rel}")
}

/// style 型皮肤：向默认皮肤注入 `<link>`。
fn style_link_script(href: &str) -> String {
    format!(
        "(function(){{var h={href:?};function add(){{var l=document.createElement('link');\
         l.rel='stylesheet';l.href=h;document.head.appendChild(l);}}\
         if(document.head){{add()}}else{{document.addEventListener('DOMContentLoaded',add)}}}})();",
        href = href
    )
}

/// `skin://` 协议处理器（Windows 实际形态 `http://skin.localhost/<id>/<path>`）。
/// `_sdk` 段特殊：`/_sdk/client.js` 返回内置客户端 SDK。
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
            .unwrap_or_else(|_| Response::new(b"error".to_vec()))
    })
}

/// 内置客户端 SDK（构建期由 `src/client-sdk/` 生成，见 vite.sdk.config.ts）。
pub const CLIENT_SDK_JS: &str = include_str!("generated/client-sdk.js");

fn respond(dirs: &AppDirs, request: Request<Vec<u8>>) -> Result<Response<Vec<u8>>, tauri::Error> {
    let uri = request.uri().to_string();
    // `http://skin.localhost/<id>/<path>` -> `<id>/<path>`
    let path_part = uri
        .split_once("://")
        .and_then(|(_, rest)| rest.split_once('/'))
        .map(|(_, path)| path.split('?').next().unwrap_or(path))
        .unwrap_or("");
    let decoded = percent_decode_str(path_part).decode_utf8_lossy().to_string();
    let decoded = decoded.replace('\\', "/");

    let Some((id, rel)) = decoded.split_once('/') else {
        return not_found();
    };
    let rel = rel.trim_start_matches('/');

    // SDK：`_sdk/client.js`
    if id == "_sdk" {
        if rel == "client.js" {
            return ok(
                CLIENT_SDK_JS.as_bytes().to_vec(),
                "text/javascript",
                "no-cache",
            );
        }
        return not_found();
    }

    // 常规皮肤静态文件：id 白名单 + 逐段拒绝 `..` / 空段
    if !valid_id(id) || rel.is_empty() || rel.split('/').any(|seg| seg.is_empty() || seg == "..")
    {
        return not_found();
    }
    let file = skins_dir(dirs)
        .join(id)
        .join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
    if !file.is_file() {
        return not_found();
    }
    match std::fs::read(&file) {
        Ok(bytes) => ok(bytes, mime_of(&file), "no-cache"),
        Err(_) => not_found(),
    }
}

fn ok(body: Vec<u8>, mime: &str, cache: &str) -> Result<Response<Vec<u8>>, tauri::Error> {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, cache)
        .header(header::CONTENT_LENGTH, body.len())
        .body(body)
        .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))
}

fn not_found() -> Result<Response<Vec<u8>>, tauri::Error> {
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(b"not found".to_vec())
        .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))
}

fn mime_of(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "mjs" => "text/javascript",
        "json" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "mp3" => "audio/mpeg",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        _ => "application/octet-stream",
    }
}

/// 供主窗口创建：解析配置的皮肤 id（来自 Appearance 配置文件，避免依赖 AppState）。
pub fn configured_skin_id(dirs: &AppDirs) -> String {
    let file = dirs.config_file("appearance");
    std::fs::read_to_string(&file)
        .ok()
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
        .and_then(|v| {
            v.get("skin")
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| DEFAULT_SKIN_ID.into())
}

/// 当前生效皮肤的展示信息（headless app_info / 日志用）。
pub fn active_skin_summary(dirs: &AppDirs) -> String {
    configured_skin_id(dirs)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::http::Request;

    fn temp_dirs(tag: &str) -> AppDirs {
        let root = std::env::temp_dir().join(format!("wp4-skin-test-{}-{tag}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        AppDirs::new(root)
    }

    fn request(uri: &str) -> Request<Vec<u8>> {
        Request::builder().uri(uri).body(Vec::new()).unwrap()
    }

    fn status_of(response: &Response<Vec<u8>>) -> u16 {
        response.status().as_u16()
    }

    #[test]
    fn valid_id_rules() {
        assert!(valid_id("my-skin"));
        assert!(valid_id("a_1"));
        assert!(valid_id("x.y"));
        assert!(!valid_id(""));
        assert!(!valid_id(DEFAULT_SKIN_ID));
        assert!(!valid_id(".."));
        assert!(!valid_id(".hidden"));
        assert!(!valid_id("a/b"));
        assert!(!valid_id(&"x".repeat(65)));
    }

    #[test]
    fn manifest_validation() {
        let dirs = temp_dirs("manifest");
        let dir = skins_dir(&dirs).join("good");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"good","name":"Good","version":"1.0.0","type":"app","entry":"index.html","compat":4}"#,
        )
        .unwrap();
        assert!(parse_manifest_pub(&dir).is_ok());

        // compat 不符
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"good","name":"Good","type":"app","entry":"index.html","compat":3}"#,
        )
        .unwrap();
        assert!(parse_manifest_pub(&dir).is_err());

        // id 为保留值
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"default","name":"X","type":"app","entry":"index.html","compat":4}"#,
        )
        .unwrap();
        assert!(parse_manifest_pub(&dir).is_err());

        // entry 路径穿越
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"good","name":"X","type":"app","entry":"../x.html","compat":4}"#,
        )
        .unwrap();
        assert!(parse_manifest_pub(&dir).is_err());

        let _ = std::fs::remove_dir_all(&dirs.root);
    }

    #[test]
    fn list_marks_missing_entry_invalid() {
        let dirs = temp_dirs("listing");
        let dir = skins_dir(&dirs).join("broken");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"broken","name":"Broken","type":"app","entry":"index.html","compat":4}"#,
        )
        .unwrap();
        let list = list_skins(&dirs);
        assert_eq!(list.len(), 2);
        assert!(list[0].builtin);
        assert!(!list[1].valid);
        assert!(list[1].invalid_reason.is_some());
        let _ = std::fs::remove_dir_all(&dirs.root);
    }

    #[test]
    fn protocol_serves_sdk_files_and_blocks_traversal() {
        let dirs = temp_dirs("protocol");
        let dir = skins_dir(&dirs).join("demo");
        std::fs::create_dir_all(dir.join("assets")).unwrap();
        std::fs::write(dir.join("index.html"), b"<h1>demo</h1>").unwrap();
        std::fs::write(dir.join("assets").join("app.css"), b"body{}").unwrap();

        // 内置 SDK
        let res = respond(&dirs, request("http://skin.localhost/_sdk/client.js")).unwrap();
        assert_eq!(status_of(&res), 200);
        assert!(String::from_utf8_lossy(res.body()).contains("WallpaperClient"));

        // 皮肤静态文件 + MIME
        let res = respond(&dirs, request("http://skin.localhost/demo/index.html")).unwrap();
        assert_eq!(status_of(&res), 200);
        assert_eq!(res.headers()["content-type"], "text/html");
        let res = respond(&dirs, request("http://skin.localhost/demo/assets/app.css")).unwrap();
        assert_eq!(status_of(&res), 200);
        assert_eq!(res.headers()["content-type"], "text/css");

        // 路径穿越 / 非法 id / 缺失文件 -> 404
        for uri in [
            "http://skin.localhost/demo/../secret.txt",
            "http://skin.localhost/.hidden/index.html",
            "http://skin.localhost/demo/missing.html",
            "http://skin.localhost/nosegment",
        ] {
            let res = respond(&dirs, request(uri)).unwrap();
            assert_eq!(status_of(&res), 404, "should 404: {uri}");
        }

        let _ = std::fs::remove_dir_all(&dirs.root);
    }

    #[test]
    fn main_window_target_falls_back_to_default() {
        let dirs = temp_dirs("target");
        // 未配置 -> 默认
        let t = main_window_target(&dirs, DEFAULT_SKIN_ID);
        assert!(matches!(t.url, WebviewUrl::App(_)));
        // 非法 id -> 默认
        let t = main_window_target(&dirs, "../evil");
        assert!(matches!(t.url, WebviewUrl::App(_)));

        // 合法 app 型 -> 外部 skin URL
        let dir = skins_dir(&dirs).join("appskin");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), b"<h1></h1>").unwrap();
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"appskin","name":"A","type":"app","entry":"index.html","compat":4}"#,
        )
        .unwrap();
        let t = main_window_target(&dirs, "appskin");
        match t.url {
            WebviewUrl::External(url) => {
                assert_eq!(url.as_str(), "http://skin.localhost/appskin/index.html");
            }
            _ => panic!("expected external skin url"),
        }

        // style 型 -> 默认入口 + 注入 <link> 脚本
        let dir = skins_dir(&dirs).join("styleskin");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("overlay.css"), b"body{}").unwrap();
        std::fs::write(
            dir.join("skin.json"),
            r#"{"id":"styleskin","name":"S","type":"style","entry":"overlay.css","compat":4}"#,
        )
        .unwrap();
        let t = main_window_target(&dirs, "styleskin");
        assert!(matches!(t.url, WebviewUrl::App(_)));
        assert_eq!(t.extra_init_scripts.len(), 1);
        assert!(t.extra_init_scripts[0].contains("skin.localhost/styleskin/overlay.css"));

        let _ = std::fs::remove_dir_all(&dirs.root);
    }
}
