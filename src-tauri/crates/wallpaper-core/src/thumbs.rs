//! 封面缩略图：为超过[`THUMB_MAX_DIM`]的大封面生成 JPEG 边车文件
//! （与封面同目录、`<封面主名>.thumb.jpg`）；尺寸已达上限的小封面不出边车，
//! `?thumb=1` 持续回退原图——浏览器解码这种图毫无压力。
//!
//! 背景：视频封面是 mpv 原分辨率截帧、图片壁纸封面是原图复制，网格里每滚进
//! 一屏就要解码数张 4K 图，是封面滚动掉帧的主因；缩略图把解码成本降一个量级。
//!
//! 生成在单一后台线程排队执行，绝不阻塞扫描与协议请求；失败静默跳过，
//! 请求方（media 协议 `?thumb=1`）在缩略图缺失时回退原图。

use std::collections::VecDeque;
use std::path::{Path, PathBuf};

use image::{DynamicImage, ImageDecoder};
use parking_lot::Mutex;

/// 缩略图最长边。网格卡片最宽 ~550 CSS px × 2x DPR ≈ 1100 物理像素，留余量取整。
const THUMB_MAX_DIM: u32 = 1280;
const JPEG_QUALITY: u8 = 85;

/// 封面对应的缩略图边车路径：与封面同目录，`<封面主名>.thumb.jpg`。
/// 例：`.metadata/foo.cover.jpg` → `.metadata/foo.cover.thumb.jpg`。
pub fn thumb_path_for(cover: &Path) -> PathBuf {
    let stem = cover
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    cover.with_file_name(format!("{stem}.thumb.jpg"))
}

/// 仅对 `.metadata` 目录内的封面生成边车：库扫描会跳过该目录，边车不会
/// 被误收录为壁纸。`?thumb=1` 落在壁纸原文件 / 旧版散放封面时一律回退原图
fn sidecar_allowed(cover: &Path) -> bool {
    cover
        .parent()
        .and_then(|p| p.file_name())
        .is_some_and(|n| n == std::ffi::OsStr::new(".metadata"))
}

struct Queue {
    pending: VecDeque<PathBuf>,
    running: bool,
}

static QUEUE: Mutex<Queue> = Mutex::new(Queue {
    pending: VecDeque::new(),
    running: false,
});

/// 缩略图已存在则什么都不做；否则入队由后台线程生成。非阻塞、幂等。
pub fn enqueue_missing(cover: &Path) {
    if !sidecar_allowed(cover) || thumb_path_for(cover).is_file() {
        return;
    }
    let spawn = {
        let mut q = QUEUE.lock();
        if q.pending.iter().any(|p| p == cover) {
            return;
        }
        q.pending.push_back(cover.to_path_buf());
        if q.running {
            false
        } else {
            q.running = true;
            true
        }
    };
    if spawn {
        let _ = std::thread::Builder::new()
            .name("cover-thumbs".into())
            .spawn(worker_loop);
    }
}

fn worker_loop() {
    loop {
        // 单工作线程顺序生成：避免批量 4K 解码与壁纸引擎抢 CPU
        let cover = {
            let mut q = QUEUE.lock();
            match q.pending.pop_front() {
                Some(c) => c,
                None => {
                    q.running = false;
                    return;
                }
            }
        };
        let thumb = thumb_path_for(&cover);
        if thumb.is_file() {
            continue;
        }
        // 失败静默跳过（模块约定）：失败封面（AVIF 数据、v3 遗留 ?t= 路径）是
        // 永久性失败且每次扫描都会重新入队，打日志只会每轮刷屏；
        // ?thumb=1 请求在边车缺失时自动回退原图，功能不受影响
        let _ = generate(&cover, &thumb);
    }
}

fn generate(cover: &Path, thumb: &Path) -> anyhow::Result<()> {
    if !sidecar_allowed(cover) {
        anyhow::bail!("cover outside .metadata");
    }
    // 先只读头部拿尺寸：小封面不出边车（无需缩小），AVIF 等不支持的格式也在
    // 这一步廉价失败跳过，都避免了全量解码 + 重编码的浪费
    let (w, h) = image::ImageReader::open(cover)?
        .with_guessed_format()?
        .into_dimensions()?;
    if w.max(h) <= THUMB_MAX_DIM {
        return Ok(());
    }

    // 尊重 EXIF 旋转（手机照片类封面），与浏览器显示原图的行为一致
    let mut decoder = image::ImageReader::open(cover)?
        .with_guessed_format()?
        .into_decoder()?;
    let orientation = decoder
        .orientation()
        .unwrap_or(image::metadata::Orientation::NoTransforms);
    let mut img = DynamicImage::from_decoder(decoder)?;
    img.apply_orientation(orientation);

    // 走到这里必然超过上限，等比缩到最长边 = THUMB_MAX_DIM
    let (w, h) = (img.width(), img.height());
    let (tw, th) = fit_within(w, h, THUMB_MAX_DIM);
    let img = img.resize_exact(tw, th, image::imageops::FilterType::Triangle);
    // JPEG 无 alpha；封面是照片类内容，直接丢 alpha 即可
    let rgb = img.to_rgb8();

    // 临时文件 + 原子改名：并发请求方不会读到半张图
    let tmp = thumb.with_extension("thumb.jpg.part");
    {
        let mut f = std::fs::File::create(&tmp)?;
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut f, JPEG_QUALITY)
            .encode_image(&DynamicImage::ImageRgb8(rgb))?;
        f.sync_all().ok();
    }
    std::fs::rename(&tmp, thumb)?;
    Ok(())
}

/// 等比缩放到最长边 = max 的目标尺寸（至少 1px）。
fn fit_within(w: u32, h: u32, max: u32) -> (u32, u32) {
    let long = w.max(h) as f32;
    let scale = max as f32 / long;
    (
        (w as f32 * scale).round().max(1.0) as u32,
        (h as f32 * scale).round().max(1.0) as u32,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn thumb_path_sits_next_to_cover() {
        let cover = Path::new(r"D:\lib\.metadata\foo.cover.jpg");
        assert_eq!(
            thumb_path_for(cover),
            PathBuf::from(r"D:\lib\.metadata\foo.cover.thumb.jpg")
        );
    }

    fn write_test_image(path: &Path, w: u32, h: u32, format: image::ImageFormat) {
        DynamicImage::new_rgb8(w, h)
            .write_to(&mut std::fs::File::create(path).unwrap(), format)
            .unwrap();
    }

    /// 测试用 `.metadata` 目录（边车只允许生成在该目录内）
    fn meta_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lw-thumbs-{tag}-{}", std::process::id()));
        std::fs::create_dir_all(dir.join(".metadata")).unwrap();
        dir.join(".metadata")
    }

    #[test]
    fn rejects_cover_outside_metadata() {
        let dir = std::env::temp_dir().join(format!("lw-thumbs-out-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let cover = dir.join("plain.cover.png");
        write_test_image(&cover, 2000, 1000, image::ImageFormat::Png);
        assert!(!sidecar_allowed(&cover));
        assert!(generate(&cover, &thumb_path_for(&cover)).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn generates_downscaled_jpeg_sidecar() {
        let meta = meta_dir("test");
        let cover = meta.join("big.cover.png");
        // 2000×1000 测试图 → 缩略图最长边应为 1280
        write_test_image(&cover, 2000, 1000, image::ImageFormat::Png);
        let thumb = thumb_path_for(&cover);
        let _ = std::fs::remove_file(&thumb);
        generate(&cover, &thumb).unwrap();
        let dims = image::ImageReader::open(&thumb)
            .unwrap()
            .into_dimensions()
            .unwrap();
        assert_eq!(dims, (1280, 640));
        let _ = std::fs::remove_dir_all(meta.parent().unwrap());
    }

    #[test]
    fn small_cover_gets_no_sidecar() {
        let meta = meta_dir("small");
        let cover = meta.join("small.cover.webp");
        write_test_image(&cover, 400, 300, image::ImageFormat::WebP);
        let thumb = thumb_path_for(&cover);
        generate(&cover, &thumb).unwrap();
        assert!(!thumb.exists());
        let _ = std::fs::remove_dir_all(meta.parent().unwrap());
    }
}
