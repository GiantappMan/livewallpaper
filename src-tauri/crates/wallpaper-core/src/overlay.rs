//! 画面叠加元素（封面"叠加"设置，`models::OverlayConfig`）：各引擎共用的
//! 常量与时钟文本。webview 系画 DOM、mpv 系走 osd-overlay（ASS）。

/// osd-overlay 元素 id（按 id 复用/替换/清除）。
pub const OVERLAY_ID: i64 = 1;

/// 当前系统时间的 ASS 叠加文本：右上角（\an9）、白字黑描边、加粗。
/// ASS 颜色为 &HBBGGRR；字号基于 OSD 脚本分辨率（约占屏高 1/7）。
pub fn clock_ass_now() -> String {
    let now = chrono::Local::now();
    format!(
        "{{\\an9\\fs42\\fnMicrosoft YaHei\\b1\\bord2\\shad1\\1c&HFFFFFF&\\3c&H000000&}}{}",
        now.format("%H:%M:%S")
    )
}

/// 当前系统时间文本（webview DOM 叠加用）。
pub fn clock_text_now() -> String {
    chrono::Local::now().format("%H:%M:%S").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// ASS 时钟文本包含时间且带右上角对齐与描边样式。
    #[test]
    fn clock_ass_shape() {
        let text = clock_ass_now();
        assert!(text.starts_with("{\\an9"), "应右上角对齐: {text}");
        assert!(text.contains("bord2"), "应有描边: {text}");
        // 尾部是 HH:MM:SS
        let body = text.rsplit('}').next().unwrap();
        assert_eq!(body.len(), 8, "HH:MM:SS 共 8 字符: {body}");
        assert_eq!(body.matches(':').count(), 2);
    }
}
