//! 本地路径 <-> media:// URL 转换（对应 v3 的虚拟主机域名机制）。

use percent_encoding::{percent_decode_str, utf8_percent_encode, NON_ALPHANUMERIC};
use std::path::{Path, PathBuf};

/// 本地绝对路径 -> `http://media.localhost/<encoded>`（Windows WebView2 形态）。
pub fn path_to_media_url(path: &Path) -> String {
    let text = path.to_string_lossy();
    format!(
        "http://media.localhost/{}",
        utf8_percent_encode(&text, NON_ALPHANUMERIC)
    )
}

/// tmp 文件名 -> media URL。
pub fn tmp_name_to_media_url(name: &str) -> String {
    format!(
        "http://media.localhost/tmp/{}",
        utf8_percent_encode(name, NON_ALPHANUMERIC)
    )
}

/// media URL 解析结果。
#[derive(Debug, Clone)]
pub enum ResolvedUrl {
    /// `tmp/<name>` -> tmp 目录内文件。
    Tmp(PathBuf),
    /// 绝对路径（媒体库内）。
    Library(PathBuf),
}

/// media URL（或裸路径字符串）-> 本地路径。
pub fn resolve_media_url(url: &str, tmp_dir: &Path) -> Option<ResolvedUrl> {
    if let Some((_, rest)) = url.split_once("localhost/") {
        let encoded = rest.split('?').next().unwrap_or(rest);
        let decoded = percent_decode_str(encoded).decode_utf8_lossy().to_string();
        if let Some(name) = decoded.strip_prefix("tmp/") {
            if name.contains("..") {
                return None;
            }
            return Some(ResolvedUrl::Tmp(
                tmp_dir.join(name.replace('/', std::path::MAIN_SEPARATOR_STR)),
            ));
        }
        return Some(ResolvedUrl::Library(PathBuf::from(decoded)));
    }
    // 非 media URL：当作本地路径
    let path = PathBuf::from(url);
    if path.is_absolute() {
        Some(ResolvedUrl::Library(path))
    } else {
        None
    }
}

impl ResolvedUrl {
    pub fn into_path(self) -> PathBuf {
        match self {
            ResolvedUrl::Tmp(p) | ResolvedUrl::Library(p) => p,
        }
    }
}
