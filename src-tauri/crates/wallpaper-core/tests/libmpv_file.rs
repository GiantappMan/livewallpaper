//! libmpv 引擎 + 真实媒体文件的端到端验证（区别于单元测试里的 lavfi 合成源：
//! 若 lavfi 加载卡住而本测试通过，则问题在该 DLL 的 avdevice/lavfi 支持，
//! 而非引擎窗口嵌入链路）。
//!
//! 运行（默认忽略）：
//! `MPV_TEST_VIDEO=D:/path/video.mp4 cargo test -p wallpaper-core --test libmpv_file -- --ignored`
//! DLL 默认取开发树 assets/players/libmpv/libmpv-2.dll，可用 MPV_TEST_DLL 覆盖。

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use wallpaper_core::host::EngineHost;
use wallpaper_core::models::VideoPlayer;
use wallpaper_core::player::{
    MediaSource, PlayerConfig, PlayerFactory, PlayerRegistry,
};
use wallpaper_core::AppDirs;

struct TestHost;

impl EngineHost for TestHost {
    fn mpv_path(&self) -> PathBuf {
        PathBuf::new()
    }
    fn libmpv_path(&self) -> PathBuf {
        if let Some(p) = std::env::var_os("MPV_TEST_DLL") {
            return PathBuf::from(p);
        }
        // 本测试的 CARGO_MANIFEST_DIR 是 crates/wallpaper-core，回退两级到 src-tauri/assets
        let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../assets/players/libmpv/libmpv-2.dll");
        dev.exists().then_some(dev).unwrap_or_default()
    }
    fn default_cover(&self) -> PathBuf {
        PathBuf::new()
    }
}

#[tokio::test]
#[ignore = "需要 MPV_TEST_VIDEO 指向真实视频文件与本机 libmpv-2.dll"]
async fn libmpv_plays_real_file() {
    let Some(video) = std::env::var_os("MPV_TEST_VIDEO").map(PathBuf::from) else {
        eprintln!("MPV_TEST_VIDEO 未设置，跳过");
        return;
    };
    assert!(video.exists(), "视频不存在: {}", video.display());

    let host = Arc::new(TestHost);
    let registry = Arc::new(PlayerRegistry::new(vec![Arc::new(
        wallpaper_core::libmpv::LibmpvFactory::new(host.clone()),
    )]));
    let factory = registry
        .get(wallpaper_core::libmpv::LIBMPV_KIND)
        .expect("libmpv factory registered");
    assert!(factory.serves().contains(&VideoPlayer::Libmpv));
    assert!(factory.is_available(), "DLL 应可用");

    let config = PlayerConfig {
        screen: 0,
        volume: 0,
        panscan: true,
        hardware_decoding: true,
        mouse_events: false,
        embed_desktop: false, // 全程隐藏窗口，不嵌桌面
    };
    let player = factory
        .create(&MediaSource::from_path(&video), &config)
        .await
        .expect("create libmpv player");

    // 等待媒体加载并推进（最长 ~15s）
    let mut last_pos = -1.0f64;
    let mut progressed = false;
    for _ in 0..150 {
        let (duration, position) = player.time_pos().await;
        if duration > 0.0 && position > last_pos {
            progressed = true;
            eprintln!("duration={duration:.2}s position={position:.2}s");
            break;
        }
        last_pos = position;
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    assert!(progressed, "播放进度应推进");
    assert!(player.is_alive().await, "引擎应存活");

    // 暂停 -> 进度冻结 -> 恢复
    player.set_paused(true).await.expect("pause");
    tokio::time::sleep(Duration::from_millis(300)).await;
    let (_, p1) = player.time_pos().await;
    tokio::time::sleep(Duration::from_millis(500)).await;
    let (_, p2) = player.time_pos().await;
    assert!(
        (p1 - p2).abs() < 0.05,
        "暂停后进度不应推进（{p1:.2} -> {p2:.2}）"
    );
    player.set_paused(false).await.expect("resume");

    // 换源复用路径
    player
        .load(&MediaSource::from_path(&video), &config)
        .await
        .expect("loadfile 换源");

    player.shutdown().await;
    assert!(!player.is_alive().await, "shutdown 后应判死");
    let _ = AppDirs::resolve(); // 保持与引擎一致的初始化面（无实际作用）
}
