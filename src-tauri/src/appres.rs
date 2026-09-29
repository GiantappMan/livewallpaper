//! 应用外壳页协议：`appres://`（Windows 实际形态 `http://appres.localhost/<name>`）。
//!
//! splash / hub-detail 两个自包含外壳页此前经 `WebviewUrl::App` 加载。dev 配置
//! 构建出的二进制（直接运行 target/debug 产物、Vite 未启动）里，App 会解析到
//! devUrl（localhost:5173），服务不在就连接被拒——主界面走 `skin://` 照常，
//! 问题只在启动屏、社区详情弹窗这类外壳页上暴露。改为协议直接应答内嵌内容，
//! dev（有无 Vite 均可）与 release 行为一致。
//!
//! 内容源是前端项目的 `public/`（发布构建同样从这里拷进 dist），避免双份漂移。

use percent_encoding::percent_decode_str;
use tauri::http::{header, Request, Response, StatusCode};
use tauri::UriSchemeContext;

/// Windows 下 WebView2 把自定义协议映射为 `http://<scheme>.localhost`。
pub const APPRES_ORIGIN: &str = "http://appres.localhost";

const PAGES: &[(&str, &str)] = &[
    (
        "splash.html",
        include_str!("../../src/giantapp-wallpaper-ui/public/splash.html"),
    ),
    (
        "hub-detail.html",
        include_str!("../../src/giantapp-wallpaper-ui/public/hub-detail.html"),
    ),
];

const LOGO_PNG: &[u8] = include_bytes!("../../src/giantapp-wallpaper-ui/public/logo.png");

pub fn handle<R: tauri::Runtime>(
    _ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    // `http://appres.localhost/<name>` -> `<name>`（query 不参与路由，fragment 不会发到这里）
    let name = request
        .uri()
        .to_string()
        .split_once("://")
        .and_then(|(_, rest)| rest.split_once('/'))
        .map(|(_, path)| path.split(['?', '#']).next().unwrap_or(path))
        .map(|p| percent_decode_str(p).decode_utf8_lossy().to_string())
        .unwrap_or_default();

    let not_found = || {
        Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(b"not found".to_vec())
            .unwrap()
    };

    match name.as_str() {
        "logo.png" => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "image/png")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(LOGO_PNG.to_vec())
            .unwrap(),
        _ => match PAGES.iter().find(|(n, _)| *n == name.as_str()) {
            Some((_, html)) => Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .header(header::CACHE_CONTROL, "no-cache")
                .body(html.as_bytes().to_vec())
                .unwrap(),
            None => not_found(),
        },
    }
}
