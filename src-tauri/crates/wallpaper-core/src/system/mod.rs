//! Win32 集成层：显示器、WorkerW 桌面嵌入、系统壁纸、注册表、系统事件。
//! 全部封装为安全的高层 API，禁止散落的 unsafe。

pub mod events;
pub mod registry;
pub mod screens;
pub mod syswallpaper;
pub mod workerw;

use windows::core::HSTRING;

/// 构造以 NUL 结尾的 UTF-16 字符串。
pub fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn hstring(s: &str) -> HSTRING {
    HSTRING::from(s)
}

/// "x, y, w, h"（与 v3 `Rectangle.ToString()` 一致）。
pub fn rect_string(x: i32, y: i32, w: i32, h: i32) -> String {
    format!("{x}, {y}, {w}, {h}")
}

/// 以 Explorer 打开文件所在目录并选中。
pub fn reveal_in_explorer(path: &std::path::Path) -> Result<(), String> {
    use std::process::Command;
    Command::new("explorer.exe")
        .arg(format!("/select,{}", path.display()))
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// 用默认程序打开 URL（默认浏览器）。
pub fn open_url(url: &str) -> Result<(), String> {
    use std::process::Command;
    // `start` 是 cmd 内建命令
    Command::new("cmd")
        .args(["/C", "start", "", url])
        .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

trait CmdNoWindow {
    fn creation_flags(&mut self, flags: u32) -> &mut Self;
}

#[cfg(windows)]
impl CmdNoWindow for std::process::Command {
    fn creation_flags(&mut self, flags: u32) -> &mut Self {
        std::os::windows::process::CommandExt::creation_flags(self, flags)
    }
}

#[cfg(not(windows))]
impl CmdNoWindow for std::process::Command {
    fn creation_flags(&mut self, _flags: u32) -> &mut Self {
        self
    }
}
