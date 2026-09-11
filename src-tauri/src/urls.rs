//! 本地路径 <-> media:// URL 转换（对应 v3 的虚拟主机域名机制）。

use percent_encoding::{percent_decode_str, utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use std::path::{Path, PathBuf};

/// media URL 路径编码：在 NON_ALPHANUMERIC 基础上保留 `/`。
/// web 壁纸页面以相对路径（./assets/...）引用资源，页内解析按字面 `/` 分段，
/// 若把 `/` 编码成 %2F，相对资源会解析到错误的顶层路径。
const MEDIA_PATH: &AsciiSet = &NON_ALPHANUMERIC.remove(b'/');

/// 本地绝对路径 -> `http://media.localhost/<encoded>`（Windows WebView2 形态）。
/// 分隔符统一为 `/` 并保留：web 壁纸页内相对资源（./assets/...）靠字面 `/` 分段解析。
pub fn path_to_media_url(path: &Path) -> String {
    let text = path.to_string_lossy().replace('\\', "/");
    format!(
        "http://media.localhost/{}",
        utf8_percent_encode(&text, MEDIA_PATH)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_url_keeps_slashes_for_relative_resources() {
        let p = PathBuf::from(r"D:\LiveWallpaper\2905017768\index.html");
        let url = path_to_media_url(&p);
        assert_eq!(
            url,
            "http://media.localhost/D%3A/LiveWallpaper/2905017768/index%2Ehtml"
        );
        // 页内 ./static/x.js 的解析结果也能被协议处理器还原为库内文件
        let base = url.rsplit_once('/').unwrap().0;
        let sub = format!("{base}/static/js/main.js");
        let resolved = resolve_media_url(&sub, Path::new("tmp")).unwrap();
        assert_eq!(
            resolved.into_path(),
            PathBuf::from(r"D:\LiveWallpaper\2905017768\static\js\main.js")
        );
        // 整条 URL 反解回原路径
        let resolved = resolve_media_url(&url, Path::new("tmp")).unwrap();
        assert_eq!(resolved.into_path(), p);
    }
}
