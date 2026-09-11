//! media:// 协议：把本地媒体库 / tmp / 资源文件以 URL 形式提供给前端。
//! Windows 下实际形态为 `http://media.localhost/<percent-encoded 绝对路径>`
//! 与 `http://media.localhost/tmp/<name>`。
//! 带 Range 支持（<video> 拖动进度必需），并做目录白名单校验。

use percent_encoding::percent_decode_str;
use std::path::PathBuf;
use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Manager, UriSchemeContext};
use wallpaper_core::AppDirs;

fn ok_response(status: tauri::http::StatusCode, builder: tauri::http::response::Builder, body: Vec<u8>) -> Result<tauri::http::Response<Vec<u8>>, tauri::Error> {
    builder
        .status(status)
        .header(tauri::http::header::CONTENT_LENGTH, body.len())
        // 播放器窗口 / 皮肤页面（tauri.localhost、localhost:5173、skin.localhost）
        // 与 media.localhost 跨源：<video>/<audio> 受 CORS 约束，必须放行
        .header(tauri::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(body)
        .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))
}

fn err_response(status: tauri::http::StatusCode) -> Result<tauri::http::Response<Vec<u8>>, tauri::Error> {
    tauri::http::Response::builder()
        .status(status)
        .header(tauri::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(b"error".to_vec())
        .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))
}

pub fn handle<R: tauri::Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let app = ctx.app_handle().clone();
    respond(app, request).unwrap_or_else(|_| {
        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(b"internal error".to_vec())
            .unwrap_or_else(|_| Response::new(b"error".to_vec()))
    })
}

fn respond<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    request: Request<Vec<u8>>,
) -> Result<Response<Vec<u8>>, tauri::Error> {
    let dirs: AppDirs = app
        .try_state::<crate::state::AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve);

    let uri = request.uri().to_string();
    let path_part = uri
        .split_once("://")
        .and_then(|(_, rest)| rest.split_once('/'))
        .map(|(_, path)| path.split('?').next().unwrap_or(path))
        .unwrap_or("");
    let decoded = percent_decode_str(path_part).decode_utf8_lossy().to_string();

    let file = resolve_path(&decoded, &dirs);

    let Some(file) = file.filter(|f| f.is_file()) else {
        return err_response(StatusCode::NOT_FOUND);
    };

    let Ok(meta) = std::fs::metadata(&file) else {
        return err_response(StatusCode::NOT_FOUND);
    };
    let total = meta.len();
    let mime = mime_of(&file).to_string();

    // Range 请求
    let range = request
        .headers()
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok())
        .and_then(parse_range);

    // 开放式 / 大范围 Range 请求限幅：本协议处理器是同步的、跑在 UI 线程上，
    // 全量缓冲大文件会阻塞事件循环并饿死媒体栈的后续 Range 请求（视频表现为
    // DEMUXER_ERROR_COULD_NOT_OPEN）。限幅为固定窗口，Chromium 会自动跟进请求。
    const MAX_RANGE_CHUNK: u64 = 4 * 1024 * 1024;

    if let Some((start, _)) = range {
        if start >= total {
            return err_response(StatusCode::RANGE_NOT_SATISFIABLE);
        }
    }

    let (status, start, end) = match range {
        Some((start, end)) => {
            let req_end = end.unwrap_or(total.saturating_sub(1)).min(total.saturating_sub(1));
            let capped_end = req_end.min(start.saturating_add(MAX_RANGE_CHUNK - 1));
            (StatusCode::PARTIAL_CONTENT, start, capped_end)
        }
        None => (StatusCode::OK, 0u64, total.saturating_sub(1)),
    };

    use std::io::{Read, Seek, SeekFrom};
    let mut f = match std::fs::File::open(&file) {
        Ok(f) => f,
        Err(_) => return err_response(StatusCode::NOT_FOUND),
    };
    let _ = f.seek(SeekFrom::Start(start));
    let length = end.saturating_sub(start) + 1;
    let mut buffer = vec![0u8; length as usize];
    let mut read_total = 0usize;
    while read_total < buffer.len() {
        match f.read(&mut buffer[read_total..]) {
            Ok(0) => break,
            Ok(n) => read_total += n,
            Err(_) => break,
        }
    }
    buffer.truncate(read_total);

    let mut builder = Response::builder()
        .header(header::CONTENT_TYPE, mime)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CACHE_CONTROL, "no-cache");

    if status == StatusCode::PARTIAL_CONTENT {
        builder = builder.header(
            header::CONTENT_RANGE,
            format!("bytes {start}-{end}/{total}"),
        );
    }

    ok_response(status, builder, buffer)
}

/// 白名单：媒体库目录、tmp 目录。
fn resolve_path(decoded: &str, dirs: &AppDirs) -> Option<PathBuf> {
    if let Some(name) = decoded.strip_prefix("tmp/") {
        let name = name.replace('/', std::path::MAIN_SEPARATOR_STR);
        if name.contains("..") {
            return None;
        }
        return Some(dirs.tmp_dir().join(name));
    }

    let path = PathBuf::from(decoded);
    if !path.is_absolute() {
        return None;
    }

    // 配置的媒体库目录
    let allowed = library_directories(dirs);
    let canonical = path.canonicalize().ok()?;
    for dir in allowed {
        if let Ok(dir_canonical) = dir.canonicalize() {
            if canonical.starts_with(&dir_canonical) {
                return Some(canonical);
            }
        }
    }
    None
}

fn library_directories(dirs: &AppDirs) -> Vec<PathBuf> {
    // 直接读取配置文件（避免依赖 AppState 的可变性）
    let file = dirs.config_file("wallpaper");
    if let Ok(text) = std::fs::read_to_string(&file) {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
            let dirs: Vec<PathBuf> = value
                .get("directories")
                .and_then(|d| d.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(PathBuf::from)).collect())
                .unwrap_or_default();
            if !dirs.is_empty() {
                return dirs;
            }
        }
    }
    vec![wallpaper_core::config::default_save_directory()]
}

fn parse_range(header: &str) -> Option<(u64, Option<u64>)> {
    let rest = header.strip_prefix("bytes=")?;
    let (start, end) = rest.split_once('-')?;
    let start: u64 = start.parse().ok()?;
    let end: Option<u64> = if end.is_empty() {
        None
    } else {
        end.parse().ok()
    };
    Some((start, end))
}

fn mime_of(path: &std::path::Path) -> &'static str {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "bmp" => "image/bmp",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "jfif" => "image/jpeg",
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        "mov" => "video/quicktime",
        "flv" | "blv" => "video/x-flv",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" => "text/javascript",
        _ => "application/octet-stream",
    }
}
