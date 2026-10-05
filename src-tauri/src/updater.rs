//! 更新体系共享工具：更新源 URL 校验、版本号比较、HTTP 客户端。
//!
//! 更新源地址由用户在设置界面配置，客户端按 http(s) 拉取清单与安装包。
//! 出于安全考虑：仅允许 http/https；release 构建拒绝 localhost、环回、
//! 私有与保留地址（debug 构建放行，便于 `wrangler dev` 等本地联调）。

use std::cmp::Ordering;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::time::Duration;

/// 更新检查用的 HTTP 客户端（UA + 连接/读取超时，与下载器一致）。
pub fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(concat!("GiantappWallpaper/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(15))
        .read_timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

/// 校验更新源 URL：仅 http/https；release 拒绝非公网地址。
/// 返回归一化后的 URL（去除尾随 `/`）。
pub fn validate_update_url(raw: &str) -> Result<reqwest::Url, String> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Err("地址为空".into());
    }
    let url = reqwest::Url::parse(raw).map_err(|e| format!("地址无效: {e}"))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(format!("仅支持 http/https 地址: {}", url.scheme()));
    }
    let host = url
        .host_str()
        .ok_or_else(|| "地址缺少主机名".to_string())?
        .to_lowercase();
    if !cfg!(debug_assertions) && is_non_public_host(&host) {
        return Err(format!("不允许的更新源地址: {host}"));
    }
    Ok(url)
}

/// 相对地址（如清单里的 `dl/xxx.exe`）以清单地址为 base 解析成绝对地址。
pub fn resolve_against(manifest_url: &str, target: &str) -> Result<reqwest::Url, String> {
    let target = target.trim();
    if target.is_empty() {
        return Err("清单缺少下载地址".into());
    }
    if let Ok(abs) = validate_update_url(target) {
        return Ok(abs);
    }
    let base = validate_update_url(manifest_url)?;
    base.join(target).map_err(|e| format!("地址无效: {e}"))
}

fn is_non_public_host(host: &str) -> bool {
    let host = host.trim_start_matches('[').trim_end_matches(']');
    if host == "localhost" || host.ends_with(".localhost") || host.ends_with(".local") {
        return true;
    }
    match host.parse::<IpAddr>() {
        Ok(IpAddr::V4(v4)) => !is_global_v4(v4),
        Ok(IpAddr::V6(v6)) => !is_global_v6(v6),
        Err(_) => false,
    }
}

fn is_global_v4(ip: Ipv4Addr) -> bool {
    let o = ip.octets();
    // 0.0.0.0/8、10/8、100.64/10（CGNAT）、127/8、169.254/16、172.16/12、
    // 192.0.0.0/24、192.0.2/24、192.168/16、198.18/15、198.51.100/24、
    // 203.0.113/24、224/4（组播）、240/4（保留）
    !(o[0] == 0
        || o[0] == 10
        || (o[0] == 100 && (64..=127).contains(&o[1]))
        || o[0] == 127
        || (o[0] == 169 && o[1] == 254)
        || (o[0] == 172 && (16..=31).contains(&o[1]))
        || (o[0] == 192 && o[1] == 0 && o[2] == 0)
        || (o[0] == 192 && o[1] == 0 && o[2] == 2)
        || (o[0] == 192 && o[1] == 168)
        || (o[0] == 198 && (o[1] == 18 || o[1] == 19))
        || (o[0] == 198 && o[1] == 51 && o[2] == 100)
        || (o[0] == 203 && o[1] == 0 && o[2] == 113)
        || o[0] >= 224)
}

fn is_global_v6(ip: Ipv6Addr) -> bool {
    let seg = ip.segments();
    // ::1、::、fc00::/7（ULA）、fe80::/10（链路本地）、ff00::/8（组播）
    let first = seg[0];
    !(ip.is_loopback()
        || ip.is_unspecified()
        || (first & 0xfe00) == 0xfc00
        || (first & 0xffc0) == 0xfe80
        || (first & 0xff00) == 0xff00)
}

/// 宽松 semver 比较（`4.0.1` / `4.0.1-alpha.3` / `1.2`）。
/// 无预发布段 > 有预发布段；预发布段逐标识符比较（数字段按数值，`alpha.2 < alpha.10`）。
pub fn compare_versions(a: &str, b: &str) -> Ordering {
    let (core_a, pre_a) = split_version(a);
    let (core_b, pre_b) = split_version(b);
    let ord = compare_core(&core_a, &core_b);
    if ord != Ordering::Equal {
        return ord;
    }
    match (pre_a, pre_b) {
        (None, None) => Ordering::Equal,
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (Some(pa), Some(pb)) => compare_prerelease(pa, pb),
    }
}

fn split_version(v: &str) -> (Vec<u64>, Option<&str>) {
    let v = v.trim().trim_start_matches('v');
    let v = v.split('+').next().unwrap_or(v);
    match v.split_once('-') {
        Some((core, pre)) => (parse_core(core), Some(pre)),
        None => (parse_core(v), None),
    }
}

fn parse_core(core: &str) -> Vec<u64> {
    core.split('.').map(|s| s.parse().unwrap_or(0)).collect()
}

fn compare_core(a: &[u64], b: &[u64]) -> Ordering {
    let len = a.len().max(b.len());
    for i in 0..len {
        let x = a.get(i).copied().unwrap_or(0);
        let y = b.get(i).copied().unwrap_or(0);
        if x != y {
            return x.cmp(&y);
        }
    }
    Ordering::Equal
}

fn compare_prerelease(a: &str, b: &str) -> Ordering {
    let mut ia = a.split('.');
    let mut ib = b.split('.');
    loop {
        match (ia.next(), ib.next()) {
            (None, None) => return Ordering::Equal,
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(x), Some(y)) => {
                let ord = match (x.parse::<u64>(), y.parse::<u64>()) {
                    (Ok(nx), Ok(ny)) => nx.cmp(&ny),
                    (Ok(_), Err(_)) => Ordering::Less,
                    (Err(_), Ok(_)) => Ordering::Greater,
                    (Err(_), Err(_)) => x.cmp(y),
                };
                if ord != Ordering::Equal {
                    return ord;
                }
            }
        }
    }
}

/// 版本是否带预发布段（`-alpha.1` 等）。
pub fn is_prerelease(version: &str) -> bool {
    let v = version.trim().trim_start_matches('v');
    v.split('+').next().unwrap_or(v).contains('-')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_ordering() {
        use Ordering::*;
        assert_eq!(compare_versions("4.0.1", "4.0.0"), Greater);
        assert_eq!(compare_versions("4.0.1", "4.0.1"), Equal);
        assert_eq!(compare_versions("4.0.1-alpha.1", "4.0.1"), Less);
        assert_eq!(compare_versions("4.0.1-alpha.3", "4.0.1-alpha.2"), Greater);
        assert_eq!(compare_versions("4.0.1-alpha.10", "4.0.1-alpha.9"), Greater);
        assert_eq!(compare_versions("4.0.1-beta.1", "4.0.1-alpha.9"), Greater);
        assert_eq!(compare_versions("4.1.0", "4.0.9"), Greater);
        assert_eq!(compare_versions("4.0", "4.0.0"), Equal);
        assert_eq!(compare_versions("v4.0.2", "4.0.1"), Greater);
        assert!(is_prerelease("4.0.1-alpha.3"));
        assert!(!is_prerelease("4.0.1"));
    }

    #[test]
    fn url_validation() {
        assert!(validate_update_url("https://example.com/updates/ui.json").is_ok());
        assert!(validate_update_url("ftp://example.com/x").is_err());
        assert!(validate_update_url("not a url").is_err());
        assert!(validate_update_url("").is_err());
        // release 构建拒绝本地 / 私有地址；debug 构建放行便于联调
        let localhost = validate_update_url("http://localhost:8787/ui.json");
        let private = validate_update_url("http://192.168.1.10/ui.json");
        if cfg!(debug_assertions) {
            assert!(localhost.is_ok());
            assert!(private.is_ok());
        } else {
            assert!(localhost.is_err());
            assert!(private.is_err());
        }
    }

    #[test]
    fn resolve_relative_targets() {
        let abs = resolve_against("https://cdn.example.com/updates/stable.json", "https://other.com/x.exe").unwrap();
        assert_eq!(abs.as_str(), "https://other.com/x.exe");
        let rel = resolve_against("https://cdn.example.com/updates/stable.json", "dl/app.exe").unwrap();
        assert_eq!(rel.as_str(), "https://cdn.example.com/updates/dl/app.exe");
        assert!(resolve_against("https://cdn.example.com/m.json", "").is_err());
    }

    #[test]
    fn non_public_hosts() {
        assert!(is_non_public_host("localhost"));
        assert!(is_non_public_host("api.localhost"));
        assert!(is_non_public_host("127.0.0.1"));
        assert!(is_non_public_host("10.0.0.1"));
        assert!(is_non_public_host("172.16.0.1"));
        assert!(is_non_public_host("172.31.255.255"));
        assert!(is_non_public_host("192.168.0.1"));
        assert!(is_non_public_host("169.254.1.1"));
        assert!(is_non_public_host("::1"));
        assert!(is_non_public_host("fe80::1"));
        assert!(is_non_public_host("fd00::1"));
        assert!(!is_non_public_host("example.com"));
        assert!(!is_non_public_host("8.8.8.8"));
        assert!(!is_non_public_host("172.32.0.1"));
        assert!(!is_non_public_host("2606:4700::1"));
    }
}
