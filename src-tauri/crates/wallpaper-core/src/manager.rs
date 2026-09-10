//! 逐屏管理器：路由壁纸到对应渲染（统一视频播放器引擎 / 图片 / web），
//! 播放列表推进计时、暂停状态机、快照。
//! 管理器不感知具体视频引擎——一切控制走 [`player::PlayerEngine`]，
//! 引擎选择走 [`player::PlayerRegistry`]。

use crate::models::{
    ApiSettings, CoveredBehavior, TimePos, VideoPlayer, Wallpaper, WallpaperType,
};
use crate::player::{PlayerEngine, PlayerFactory, PlayerRegistry, PlayerSnapshot, WEB_KIND};
use crate::system::syswallpaper;
use std::sync::Arc;
use std::time::Instant;

pub(crate) enum Render {
    /// 统一播放器引擎（mpv / 内嵌 WebView / web 壁纸 / 自定义播放器…）。
    Video(Arc<dyn PlayerEngine>),
    /// 静态图（系统桌面壁纸；还原信息统一放在 img_restore）。
    Image,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImgRestore {
    pub monitor_id: String,
    pub path: String,
    pub position: i32,
}

/// 单屏快照条目。
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenSnapshot {
    pub wallpaper: Wallpaper,
    /// 各视频引擎的恢复信息（崩溃后供对应工厂接管）。
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub players: Vec<PlayerSnapshot>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub img_restore: Option<ImgRestore>,
    /// v4.0 早期快照的 mpv 专字段；仅用于读取旧文件，序列化时跳过。
    #[serde(default, skip_serializing)]
    pub(crate) mpv: Option<serde_json::Value>,
}

impl ScreenSnapshot {
    /// 把旧版 `mpv` 专字段迁移为 players 列表（读取旧快照文件后调用一次）。
    pub fn migrate_legacy(&mut self) {
        if let Some(mpv) = self.mpv.take() {
            self.players.push(PlayerSnapshot {
                kind: crate::mpv::MPV_KIND.into(),
                data: mpv,
            });
        }
    }
}

/// 该项按用户设置应使用的视频引擎。
fn requested_engine(item: &Wallpaper, settings: &ApiSettings) -> VideoPlayer {
    match item.setting.video_player {
        VideoPlayer::DefaultPlayer => settings.default_video_player,
        other => other,
    }
}

pub(crate) struct ScreenManager {
    pub screen: u32,
    players: Arc<PlayerRegistry>,
    /// 顶层壁纸（可能是播放列表）。
    pub wallpaper: Option<Wallpaper>,
    /// 实际渲染的项（播放列表成员或自身）。
    item: Option<Wallpaper>,
    render: Option<Render>,
    manual_paused: bool,
    covered: bool,
    /// 播放列表当前项开始时间与时长（秒）。
    item_started_at: Option<Instant>,
    item_duration: Option<u64>,
    /// 图片壁纸的原桌面壁纸（供还原 / 快照）。
    img_restore: Option<syswallpaper::SysWallpaperSnapshot>,
    /// 最近一次 apply 的全局设置（供自愈重启时使用）。
    pub(crate) latest_settings: ApiSettings,
    /// 连续意外死亡计数（成功播放后清零）。
    death_streak: u32,
}

impl ScreenManager {
    pub fn new(screen: u32, players: Arc<PlayerRegistry>) -> Self {
        Self {
            screen,
            players,
            wallpaper: None,
            item: None,
            render: None,
            manual_paused: false,
            covered: false,
            item_started_at: None,
            item_duration: None,
            img_restore: None,
            latest_settings: ApiSettings::default(),
            death_streak: 0,
        }
    }

    // ---------- 播放 ----------

    pub async fn play(&mut self, wallpaper: Wallpaper, settings: &ApiSettings) -> Result<(), String> {
        self.manual_paused = false;
        self.wallpaper = Some(wallpaper);
        let result = self.play_current_item(settings).await;
        if result.is_err() {
            // 播放失败不保留"播放中"状态，避免工具条幻影
            self.wallpaper = None;
            self.item = None;
        }
        result
    }

    async fn play_current_item(&mut self, settings: &ApiSettings) -> Result<(), String> {
        let Some(wallpaper) = self.wallpaper.clone() else {
            return Ok(());
        };
        let item = wallpaper.current_item().clone();

        // 引擎项：解析目标工厂（视频按用户设置 + 可用性兜底；web 按 kind 直取）
        let engine_factory = match item.meta.wallpaper_type {
            WallpaperType::Video | WallpaperType::AnimatedImg => Some(
                self.players
                    .resolve(requested_engine(&item, settings))
                    .ok_or_else(|| "无可用视频播放引擎".to_string())?,
            ),
            WallpaperType::Web => Some(
                self.players
                    .get(WEB_KIND)
                    .ok_or_else(|| "无可用 web 播放器".to_string())?,
            ),
            _ => None,
        };

        // 取出旧渲染（新渲染就位后再按类型清理，避免切换闪屏）
        let old_render = self.render.take();

        // 同引擎无缝复用：旧实例仍归属同一工厂时直接换源，
        // （杀进程重启需要 2s+，换源近乎即时）
        let reuse_video = engine_factory.as_ref().is_some_and(|f| {
            matches!(&old_render, Some(Render::Video(p)) if f.kind() == p.kind())
        });

        self.item = Some(item.clone());
        self.item_started_at = Some(Instant::now());
        self.item_duration = None;

        let result = match item.meta.wallpaper_type {
            WallpaperType::Img => {
                // 先设新图（系统壁纸层），再撤旧渲染，桌面不出现空档
                let r = self.play_image(&item).await;
                self.cleanup_render(old_render).await;
                r
            }
            WallpaperType::AnimatedImg | WallpaperType::Video | WallpaperType::Web => {
                if reuse_video {
                    // 复用路径：旧实例放回 render，play_video 内部换源
                    self.render = old_render;
                } else {
                    self.cleanup_render(old_render).await;
                }
                self.play_video(&item, settings, engine_factory.unwrap()).await
            }
            WallpaperType::Playlist => {
                self.cleanup_render(old_render).await;
                Err("嵌套播放列表不支持".into())
            }
            WallpaperType::Exe => {
                self.cleanup_render(old_render).await;
                Err("exe 壁纸暂不支持".into())
            }
            WallpaperType::NotSupported => {
                self.cleanup_render(old_render).await;
                Err("不支持的文件类型".into())
            }
        };

        if let Err(e) = &result {
            log::error!("screen {} play failed: {e}", self.screen);
            return result;
        }
        self.death_streak = 0;

        // 探测时长（用于播放列表推进），失败回退 1 小时
        self.item_duration = self.resolve_item_duration().await;

        self.apply_pause(settings).await;
        Ok(())
    }

    async fn play_image(&mut self, item: &Wallpaper) -> Result<(), String> {
        let path = item.file_path.clone().ok_or("缺少文件路径")?;
        let fit = item.setting.fit;
        let old = syswallpaper::set_wallpaper(&path, self.screen, fit)
            .map_err(|e| format!("设置桌面壁纸失败: {e}"))?;
        // 仅在首次用图片接管桌面时记录原壁纸；切换图片不覆盖还原信息
        if self.img_restore.is_none() && item.setting.keep_wallpaper {
            self.img_restore = Some(old);
        }
        self.render = Some(Render::Image);
        Ok(())
    }

    async fn play_video(
        &mut self,
        item: &Wallpaper,
        settings: &ApiSettings,
        factory: Arc<dyn PlayerFactory>,
    ) -> Result<(), String> {
        let source = crate::player::MediaSource {
            path: item.file_path.clone().unwrap_or_default(),
            url: item.file_url.clone(),
        };
        if source.path.as_os_str().is_empty() && source.url.is_none() {
            return Err("缺少媒体源".into());
        }
        let config = crate::player::PlayerConfig {
            screen: self.screen,
            volume: self.volume_for(settings),
            panscan: item.setting.is_pan_scan,
            hardware_decoding: item.setting.hardware_decoding,
            mouse_events: item.setting.enable_mouse_event,
        };
        log::info!(
            "play_video screen {} engine={} reuse_available={} file={} url={:?}",
            self.screen,
            factory.kind(),
            factory.is_available(),
            source.path.display(),
            source.url
        );

        // 复用：旧实例原地换源（切换近乎即时）
        if let Some(Render::Video(old)) = self.render.take() {
            if old.kind() == factory.kind() {
                match old.load(&source, &config).await {
                    Ok(()) => {
                        let _ = old
                            .set_panscan(if config.panscan { 1.0 } else { 0.0 })
                            .await;
                        let _ = old.set_volume(config.volume).await;
                        self.render = Some(Render::Video(old));
                        return Ok(());
                    }
                    Err(e) => {
                        // 实例已死或通道断裂：先收掉旧实例，落回完整重启
                        log::warn!(
                            "screen {} engine {} reuse failed ({e}), relaunching",
                            self.screen,
                            factory.kind()
                        );
                        old.shutdown().await;
                    }
                }
            } else {
                old.shutdown().await;
            }
        }

        // 完整启动：创建实例 -> 等待窗口就绪并挂载到桌面 WorkerW
        let player = factory.create(&source, &config).await.map_err(|e| e.to_string())?;
        if let Err(e) = player.attach_to_desktop().await {
            let _ = player.shutdown().await;
            return Err(format!("挂载到桌面失败: {e}"));
        }
        self.render = Some(Render::Video(player));
        Ok(())
    }

    // ---------- 播放列表推进 ----------

    /// 返回 true 表示已切换到下一项。
    pub async fn tick(&mut self, settings: &ApiSettings) -> bool {
        let Some(wallpaper) = self.wallpaper.as_ref() else {
            return false;
        };
        if !wallpaper.meta.is_playlist() {
            return false;
        }
        let (Some(started), Some(duration)) = (self.item_started_at, self.item_duration) else {
            return false;
        };
        if started.elapsed().as_secs() < duration {
            return false;
        }
        log::info!("screen {} playlist advance", self.screen);
        self.advance(1, settings).await;
        true
    }

    /// 切换播放列表项（delta = ±1）。
    pub async fn advance(&mut self, delta: i32, settings: &ApiSettings) {
        let Some(wallpaper) = self.wallpaper.as_mut() else {
            return;
        };
        if !wallpaper.meta.is_playlist() || wallpaper.meta.wallpapers.is_empty() {
            return;
        }
        let len = wallpaper.meta.wallpapers.len() as i32;
        let current = wallpaper.meta.play_index as i32;
        let next = if delta >= 0 {
            (current + delta).rem_euclid(len)
        } else {
            (current + delta).rem_euclid(len)
        };
        wallpaper.meta.play_index = next as u32;

        // 随机模式：下一个随机挑选（避免重复当前）
        if wallpaper.setting.play_mode == crate::models::PlayMode::Random && len > 1 {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            let mut pick = current;
            while pick == current {
                pick = rng.gen_range(0..len);
            }
            wallpaper.meta.play_index = pick as u32;
        }

        let snapshot = wallpaper.clone();
        let _ = self.play_current_item(settings).await;
        self.wallpaper = Some(snapshot);
    }

    async fn resolve_item_duration(&mut self) -> Option<u64> {
        let item = self.item.as_ref()?;
        if let Some(d) = item.setting.duration_seconds() {
            return Some(d);
        }
        // 非播放列表成员不需要时长
        let in_playlist = self
            .wallpaper
            .as_ref()
            .map(|w| w.meta.is_playlist())
            .unwrap_or(false);
        if !in_playlist {
            return None;
        }
        // 探测媒体时长（最多 ~2s）
        for _ in 0..10 {
            if let Some(d) = self.current_media_duration().await {
                return Some(d.max(1.0) as u64);
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
        Some(3600) // 无时长信息（如图片）：1 小时，与 v3 一致
    }

    async fn current_media_duration(&self) -> Option<f64> {
        match self.render.as_ref()? {
            Render::Video(p) => {
                let (d, _) = p.time_pos().await;
                (d > 0.0).then_some(d)
            }
            Render::Image => None,
        }
    }

    /// 检测播放器实例意外退出：自动重启当前壁纸（自愈）。
    /// 连续失败超限后放弃并清空，避免死亡循环。
    pub async fn reap_dead_render(&mut self) {
        let dead = match self.render.as_ref() {
            Some(Render::Video(p)) => !p.is_alive().await,
            _ => false,
        };
        if !dead {
            self.death_streak = 0;
            return;
        }
        self.death_streak += 1;
        log::warn!(
            "screen {} player died unexpectedly (streak {}), reviving",
            self.screen, self.death_streak
        );
        self.render = None;
        self.item_started_at = None;
        self.item_duration = None;

        if self.death_streak > 3 || self.wallpaper.is_none() {
            if self.death_streak == 4 {
                log::error!("screen {} giving up player revival", self.screen);
            }
            if self.death_streak > 3 {
                return;
            }
        }
        if self.wallpaper.is_some() {
            let settings = self.latest_settings.clone();
            let _ = self.play_current_item(&settings).await;
        }
    }

    // ---------- 暂停 / 恢复 / 停止 ----------

    fn should_pause(&self, settings: &ApiSettings) -> bool {
        self.manual_paused || (self.covered && settings.covered_behavior == CoveredBehavior::Pause)
    }

    async fn apply_pause(&self, settings: &ApiSettings) {
        let paused = self.should_pause(settings);
        if let Some(Render::Video(p)) = self.render.as_ref() {
            let _ = p.set_paused(paused).await;
        }
    }

    pub async fn set_manual_paused(&mut self, paused: bool, settings: &ApiSettings) {
        self.manual_paused = paused;
        self.apply_pause(settings).await;
    }

    pub async fn set_covered(&mut self, covered: bool, settings: &ApiSettings) -> bool {
        let changed = self.covered != covered;
        self.covered = covered;
        if !changed {
            return false;
        }
        match settings.covered_behavior {
            CoveredBehavior::Stop => {
                if covered {
                    log::info!("screen {} covered -> stop", self.screen);
                    let old = self.render.take();
                    self.cleanup_render(old).await;
                    self.item_started_at = None;
                    self.item_duration = None;
                } else if self.wallpaper.is_some() {
                    log::info!("screen {} uncovered -> replay", self.screen);
                    let _ = self.play_current_item(settings).await;
                }
            }
            _ => self.apply_pause(settings).await,
        }
        true
    }

    /// 用户主动暂停（RunningInfo.isPaused）。
    pub async fn pause(&mut self, settings: &ApiSettings) {
        self.set_manual_paused(true, settings).await;
    }

    pub async fn resume(&mut self, settings: &ApiSettings) {
        // 若被 Stop 行为停掉，则重新播放
        if self.render.is_none() && self.wallpaper.is_some() {
            let _ = self.play_current_item(settings).await;
        }
        self.set_manual_paused(false, settings).await;
    }

    /// 用户主动停止：卸载渲染并清空壁纸；图片壁纸还原接管前的桌面。
    pub async fn stop(&mut self) {
        let old = self.render.take();
        self.cleanup_render(old).await;
        if let Some(restore) = self.img_restore.take() {
            syswallpaper::restore(&restore);
        }
        self.wallpaper = None;
        self.item = None;
        self.item_started_at = None;
        self.item_duration = None;
    }

    /// 清理旧渲染（引擎实例退出）。图片渲染无资源需要清理，
    /// 且不做桌面还原——还原只在用户停止/退出时发生，避免切换时闪屏。
    async fn cleanup_render(&self, render: Option<Render>) {
        if let Some(Render::Video(p)) = render {
            p.shutdown().await;
        }
    }

    // ---------- 音量 ----------

    fn volume_for(&self, settings: &ApiSettings) -> u32 {
        if settings.audio_source_index >= 0 && self.screen == settings.audio_source_index as u32 {
            settings.volume
        } else {
            0
        }
    }

    pub async fn apply_settings(&mut self, settings: &ApiSettings) {
        self.latest_settings = settings.clone();
        let volume = self.volume_for(settings);
        if let Some(Render::Video(p)) = self.render.as_ref() {
            let _ = p.set_volume(volume).await;
        }
        self.apply_pause(settings).await;
    }

    // ---------- 查询 ----------

    pub fn running_info(&self) -> crate::models::RunningInfo {
        crate::models::RunningInfo {
            screen_indexes: vec![self.screen],
            is_paused: self.manual_paused,
        }
    }

    pub async fn time_pos(&self) -> Option<TimePos> {
        match self.render.as_ref()? {
            Render::Video(p) => {
                let (duration, position) = p.time_pos().await;
                Some(TimePos { duration, position })
            }
            Render::Image => {
                // 图片：用已运行时间模拟进度（供播放列表 UI）
                let (Some(started), Some(duration)) = (self.item_started_at, self.item_duration)
                else {
                    return None;
                };
                Some(TimePos {
                    duration: duration as f64,
                    position: started.elapsed().as_secs_f64(),
                })
            }
        }
    }

    pub async fn seek_percent(&self, percent: f64) -> Result<(), String> {
        match self.render.as_ref() {
            Some(Render::Video(p)) => p.seek_percent(percent).await.map_err(|e| e.to_string()),
            _ => Err("当前壁纸不支持跳转".into()),
        }
    }

    // ---------- 快照 ----------

    pub async fn snapshot(&self) -> Option<ScreenSnapshot> {
        let wallpaper = self.wallpaper.clone()?;
        let players = match self.render.as_ref() {
            Some(Render::Video(p)) => p
                .snapshot()
                .await
                .map(|data| {
                    vec![PlayerSnapshot {
                        kind: p.kind().into(),
                        data,
                    }]
                })
                .unwrap_or_default(),
            _ => Vec::new(),
        };
        Some(ScreenSnapshot {
            wallpaper,
            players,
            img_restore: self.img_restore.as_ref().map(|r| ImgRestore {
                monitor_id: r.monitor_id.clone(),
                path: r.path.clone(),
                position: r.position as i32,
            }),
            mpv: None,
        })
    }

    /// 从快照恢复（逐引擎尝试接管仍在运行的实例，全部失败则重新启动）。
    pub async fn restore(
        &mut self,
        snapshot: &ScreenSnapshot,
        settings: &ApiSettings,
    ) -> Result<(), String> {
        // 恢复图片原壁纸信息
        if let Some(restore) = &snapshot.img_restore {
            self.img_restore = Some(syswallpaper::SysWallpaperSnapshot {
                monitor_id: restore.monitor_id.clone(),
                path: restore.path.clone(),
                position: num_to_fit(restore.position),
            });
        }

        // 播放器接管
        for ps in &snapshot.players {
            let Some(factory) = self.players.get(&ps.kind) else {
                log::warn!("screen {} unknown player engine {}", self.screen, ps.kind);
                continue;
            };
            match factory.restore(&ps.data, self.screen).await {
                Ok(player) => {
                    if player.attach_to_desktop().await.is_ok() {
                        self.wallpaper = Some(snapshot.wallpaper.clone());
                        self.item = Some(snapshot.wallpaper.current_item().clone());
                        self.render = Some(Render::Video(player));
                        self.apply_pause(settings).await;
                        self.apply_settings(settings).await;
                        return Ok(());
                    }
                    log::warn!(
                        "screen {} engine {} attach failed after restore",
                        self.screen,
                        factory.kind()
                    );
                    let _ = player.shutdown().await;
                }
                Err(e) => log::warn!(
                    "screen {} engine {} restore error: {e}",
                    self.screen,
                    factory.kind()
                ),
            }
        }

        // 常规重启播放
        let mut wallpaper = snapshot.wallpaper.clone();
        // 接管失败时 play_index 保持
        wallpaper.running_info = Default::default();
        self.play(wallpaper, settings).await
    }
}

fn num_to_fit(v: i32) -> crate::models::Fit {
    match v {
        0 => crate::models::Fit::Center,
        1 => crate::models::Fit::Tile,
        2 => crate::models::Fit::Stretch,
        3 => crate::models::Fit::Fit,
        5 => crate::models::Fit::Span,
        _ => crate::models::Fit::Fill,
    }
}
