//! 引擎门面（对应 v3 `WallpaperApi`）：
//! 多屏管理、全局播放设置、每秒 tick（遮挡检测 + 播放列表推进）、
//! 快照持久化、锁屏/显示器变化处理。

use crate::dirs::AppDirs;
use crate::host::EngineHost;
use crate::manager::{ScreenManager, ScreenSnapshot};
use crate::models::{ApiSettings, Screen, TimePos, Wallpaper};
use crate::system::screens as sys_screens;

use std::sync::{Arc, Weak};

type StdMutexLike<T> = parking_lot::Mutex<T>;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotFile {
    wallpapers: Vec<ScreenSnapshot>,
    api_settings: ApiSettings,
}

pub struct WallpaperApi {
    pub host: Arc<dyn EngineHost>,
    pub dirs: AppDirs,
    managers: tokio::sync::Mutex<Vec<ScreenManager>>,
    pub settings: StdMutexLike<ApiSettings>,
    on_change: StdMutexLike<Option<Box<dyn Fn() + Send + Sync>>>,
    /// Engine 内部修改（播放列表推进）后通知应用层。
    running: std::sync::atomic::AtomicBool,
}

impl WallpaperApi {
    /// 初始化引擎：枚举屏幕、建管理器、启动 tick。不恢复快照（restore 单独调）。
    pub async fn init(host: Arc<dyn EngineHost>, dirs: AppDirs) -> Arc<Self> {
        let api = Arc::new(Self {
            host,
            dirs,
            managers: tokio::sync::Mutex::new(Vec::new()),
            settings: StdMutexLike::new(ApiSettings::default()),
            on_change: StdMutexLike::new(None),
            running: std::sync::atomic::AtomicBool::new(true),
        });
        api.sync_screens().await;
        let weak = Arc::downgrade(&api);
        api.start_tick(weak);
        api
    }

    pub fn set_on_change(&self, f: Box<dyn Fn() + Send + Sync>) {
        *self.on_change.lock() = Some(f);
    }

    pub fn notify_change(&self) {
        if let Some(f) = self.on_change.lock().as_ref() {
            f();
        }
    }

    fn start_tick(self: &Arc<Self>, weak: Weak<Self>) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                interval.tick().await;
                let Some(api) = weak.upgrade() else { return };
                if !api.running.load(std::sync::atomic::Ordering::SeqCst) {
                    return;
                }
                api.tick_once().await;
            }
        });
    }

    /// 每秒：检测遮挡窗口 + 推进播放列表。
    async fn tick_once(&self) {
        // 1) 遮挡检测（阻塞 Win32 调用放线程池）
        let settings = self.settings.lock().clone();
        let covered = tokio::task::spawn_blocking(crate::window_state::covered_screens)
            .await
            .unwrap_or_default();

        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            let is_covered = covered.contains(&m.screen);
            m.set_covered(is_covered, &settings).await;
            m.tick(&settings).await;
        }
    }

    // ---------- 屏幕 ----------

    pub fn screens(&self) -> Vec<Screen> {
        sys_screens::all_screens()
    }

    /// 屏幕集合变化时重建管理器（保留已有屏幕的状态）。
    pub async fn sync_screens(&self) {
        let count = sys_screens::all_screens().len() as u32;
        let mut managers = self.managers.lock().await;
        managers.retain(|m| m.screen < count);
        for i in 0..count {
            if !managers.iter().any(|m| m.screen == i) {
                managers.push(ScreenManager::new(i, self.host.clone(), self.dirs.clone()));
            }
        }
        managers.sort_by_key(|m| m.screen);
    }

    // ---------- 壁纸操作 ----------

    /// 展示壁纸到指定屏幕（空列表 = 全部屏幕）。每个屏幕独立克隆播放。
    pub async fn show_wallpaper(
        &self,
        wallpaper: Wallpaper,
        screen_indexes: Vec<u32>,
    ) -> Result<(), String> {
        let indexes: Vec<u32> = if screen_indexes.is_empty() {
            (0..self.screens().len() as u32).collect()
        } else {
            screen_indexes
        };
        let settings = self.settings.lock().clone();

        let mut errors = Vec::new();
        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            if !indexes.contains(&m.screen) {
                continue;
            }
            let mut w = wallpaper.clone();
            w.running_info = Default::default();
            if let Err(e) = m.play(w, &settings).await {
                errors.push(format!("屏幕 {}: {e}", m.screen));
            }
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors.join("; "))
        }
    }

    pub async fn pause_wallpaper(&self, screen_index: Option<u32>) {
        let settings = self.settings.lock().clone();
        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            if screen_index.is_none() || screen_index == Some(m.screen) {
                m.pause(&settings).await;
            }
        }
    }

    pub async fn resume_wallpaper(&self, screen_index: Option<u32>) {
        let settings = self.settings.lock().clone();
        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            if screen_index.is_none() || screen_index == Some(m.screen) {
                m.resume(&settings).await;
            }
        }
    }

    pub async fn stop_wallpaper(&self, screen_index: Option<u32>) {
        let settings = self.settings.lock().clone();
        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            if screen_index.is_none() || screen_index == Some(m.screen) {
                m.stop(&settings).await;
            }
        }
    }

    /// 播放列表切换（±1）。
    pub async fn advance_playlist(&self, delta: i32, screen_index: Option<u32>) {
        let settings = self.settings.lock().clone();
        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            if screen_index.is_none() || screen_index == Some(m.screen) {
                m.advance(delta, &settings).await;
            }
        }
    }

    /// 正在运行的壁纸（每屏一条）。
    pub async fn running_wallpapers(&self) -> Vec<Wallpaper> {
        let managers = self.managers.lock().await;
        managers
            .iter()
            .filter_map(|m| {
                let mut w = m.wallpaper.clone()?;
                w.running_info = m.running_info();
                Some(w)
            })
            .collect()
    }

    // ---------- 音量 / 设置 ----------

    pub async fn set_volume(&self, volume: u32, audio_source_index: i32) {
        {
            let mut settings = self.settings.lock();
            settings.volume = volume.min(100);
            if audio_source_index >= 0 || audio_source_index == -1 {
                settings.audio_source_index = audio_source_index;
            }
        }
        self.apply_settings_to_all().await;
    }

    pub fn volume(&self) -> (u32, i32) {
        let s = self.settings.lock();
        (s.volume, s.audio_source_index)
    }

    pub fn set_covered_behavior(&self, behavior: crate::models::CoveredBehavior) {
        self.settings.lock().covered_behavior = behavior;
    }

    pub async fn set_default_video_player(&self, player: crate::models::VideoPlayer) {
        self.settings.lock().default_video_player = player;
        self.apply_settings_to_all().await;
    }

    pub async fn apply_settings_to_all(&self) {
        let settings = self.settings.lock().clone();
        let mut managers = self.managers.lock().await;
        for m in managers.iter_mut() {
            m.apply_settings(&settings).await;
        }
    }

    // ---------- 进度 ----------

    pub async fn wallpaper_time(&self, screen_index: Option<u32>) -> Option<TimePos> {
        let managers = self.managers.lock().await;
        let m = match screen_index {
            Some(i) => managers.iter().find(|m| m.screen == i)?,
            None => managers.iter().find(|m| m.wallpaper.is_some())?,
        };
        m.time_pos().await
    }

    /// progress 为绝对秒数；内部转百分比。
    pub async fn set_progress(&self, progress: f64, screen_index: Option<u32>) -> Result<(), String> {
        let managers = self.managers.lock().await;
        let targets: Vec<&ScreenManager> = match screen_index {
            Some(i) => managers.iter().filter(|m| m.screen == i).collect(),
            None => managers.iter().filter(|m| m.wallpaper.is_some()).collect(),
        };
        let mut result = Ok(());
        for m in targets {
            if let Some(time) = m.time_pos().await {
                if time.duration > 0.0 {
                    let percent = (progress / time.duration * 100.0).clamp(0.0, 100.0);
                    if let Err(e) = m.seek_percent(percent).await {
                        result = Err(e);
                    }
                }
            }
        }
        result
    }

    // ---------- 快照 ----------

    /// 异步完整快照（含 mpv 管道信息），展示/停止等关键操作后调用。
    pub async fn save_snapshot(&self) {
        let managers = self.managers.lock().await;
        let mut list = Vec::new();
        for m in managers.iter() {
            if let Some(s) = m.snapshot().await {
                list.push(s);
            }
        }
        drop(managers);
        let file = SnapshotFile {
            wallpapers: list,
            api_settings: self.settings.lock().clone(),
        };
        if let Ok(text) = serde_json::to_string_pretty(&file) {
            let _ = std::fs::write(self.dirs.snapshot_file(), text);
        }
    }

    /// 从快照恢复；`legacy_wallpapers` 为从 v3 导入的条目（无 mpv 信息）。
    pub async fn restore_from_snapshot(&self, legacy: Vec<ScreenSnapshot>) {
        let file = std::fs::read_to_string(self.dirs.snapshot_file()).ok();
        let parsed: Option<SnapshotFile> =
            file.and_then(|text| serde_json::from_str(&text).ok());

        let entries: Vec<ScreenSnapshot> = match parsed {
            Some(f) => {
                *self.settings.lock() = f.api_settings;
                f.wallpapers
            }
            None => legacy,
        };

        let settings = self.settings.lock().clone();
        let mut managers = self.managers.lock().await;
        for entry in entries {
            if let Some(m) = managers.iter_mut().find(|m| m.wallpaper.is_none()) {
                let _ = m.restore(&entry, &settings).await;
            }
        }
    }

    /// 读取 v3 快照中的壁纸条目（一次性迁移）。
    pub fn import_v3_snapshot(&self) -> Vec<ScreenSnapshot> {
        let path = self.dirs.v3_root().join("WallpaperApiSnapshot.json");
        let Ok(text) = std::fs::read_to_string(&path) else {
            return Vec::new();
        };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        if let Some(data) = v.get("data").and_then(|d| d.as_array()) {
            for item in data {
                // v3 元组序列化: {"item1": wallpaper, "item2": managerSnapshot}
                let wallpaper: Option<Wallpaper> = item
                    .get("item1")
                    .and_then(|w| serde_json::from_value(w.clone()).ok());
                if let Some(wallpaper) = wallpaper {
                    out.push(ScreenSnapshot {
                        wallpaper,
                        mpv: None,
                        img_restore: None,
                    });
                }
            }
        }
        if !out.is_empty() {
            log::info!("从 v3 导入 {} 条壁纸快照", out.len());
        }
        out
    }

    /// 退出：停止全部渲染；`keep_wallpaper=false` 时清空快照。
    pub async fn dispose(&self, keep_wallpaper: bool) {
        self.running
            .store(false, std::sync::atomic::Ordering::SeqCst);
        let settings = self.settings.lock().clone();
        {
            let mut managers = self.managers.lock().await;
            for m in managers.iter_mut() {
                m.stop(&settings).await;
            }
        }
        if !keep_wallpaper {
            let _ = std::fs::remove_file(self.dirs.snapshot_file());
        }
        crate::system::workerw::refresh_desktop();
    }

    // ---------- 系统事件 ----------

    pub async fn handle_lock(&self) {
        self.save_snapshot().await;
        self.pause_wallpaper(None).await;
    }

    pub async fn handle_unlock(&self) {
        self.resume_wallpaper(None).await;
    }

    /// 显示器变化：重建管理器并恢复快照。
    pub async fn handle_display_changed(&self) {
        log::info!("display settings changed");
        self.sync_screens().await;
        self.restore_from_snapshot(Vec::new()).await;
        self.notify_change();
    }
}
