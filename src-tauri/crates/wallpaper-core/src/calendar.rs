//! 壁纸日历：按天 / 每年节日（含农历）/ 每周（周末等）规则编排壁纸，
//! 到点自动切换。规则持久化为 `configs/calendar.json`，运行状态存
//! `configs/calendar-state.json`；与 [`crate::config::ConfigStore`] 完全独立。
//!
//! 优先级（[`resolve_at`]）：单日具体编排 > 年度节日（同日多条按文档序）
//! > 每周规则（同日多条按文档序）> 不接管（保持当前壁纸）。
//!
//! 锁纪律：[`CalendarScheduler::rebuild_snapshot`] 在 managers 锁**外**把全部
//! 引用预解析为完整 [`Wallpaper`]（含封面）；[`CalendarScheduler::tick`] 只读
//! 内存快照比对后播放，锁内零文件 I/O、不做扫库兜底。

use crate::api::WallpaperApi;
use crate::dirs::AppDirs;
use crate::library;
use crate::models::{wallpaper_type_of_file, Wallpaper, WallpaperType};
use chrono::{Datelike, NaiveDate, NaiveTime, Timelike};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// 壁纸引用：以绝对路径 `filePath` 为解析主键（`dir + fileName` 对项目型
/// 壁纸拼不出真实入口路径，仅作展示冗余保留）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WallpaperRef {
    pub file_path: PathBuf,
    pub dir: Option<PathBuf>,
    pub file_name: Option<String>,
}

impl WallpaperRef {
    pub fn from_path(path: impl Into<PathBuf>) -> Self {
        let path = path.into();
        let dir = path.parent().map(Path::to_path_buf);
        let file_name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string());
        Self {
            file_path: path,
            dir,
            file_name,
        }
    }
}

/// 时间段："HH:MM"（兼容 "HH:MM:SS"）。`end <= start` 表示跨零点
/// （如 22:00-07:00 覆盖 22:00~次日 07:00）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TimeSegment {
    pub start: String,
    pub end: String,
    pub wallpaper: WallpaperRef,
}

impl Default for TimeSegment {
    fn default() -> Self {
        Self {
            start: "08:00".into(),
            end: "22:00".into(),
            wallpaper: WallpaperRef::default(),
        }
    }
}

/// 一个规则的壁纸槽位：全天单壁纸，或按时段。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WallpaperSlots {
    /// 全天壁纸；segments 命中失败时兜底。
    pub all_day: Option<WallpaperRef>,
    pub segments: Vec<TimeSegment>,
}

impl WallpaperSlots {
    /// 当前时刻应显示的壁纸路径。
    pub fn pick(&self, time: NaiveTime) -> Option<&WallpaperRef> {
        for seg in &self.segments {
            let (Some(start), Some(end)) = (parse_hhmm(&seg.start), parse_hhmm(&seg.end)) else {
                continue;
            };
            if time_in_range(time, start, end) && !seg.wallpaper.file_path.as_os_str().is_empty() {
                return Some(&seg.wallpaper);
            }
        }
        self.all_day
            .as_ref()
            .filter(|w| !w.file_path.as_os_str().is_empty())
    }

    pub fn segment_count(&self) -> usize {
        self.segments.len()
    }
}

/// "HH:MM" / "HH:MM:SS" -> 当天分钟数。非法返回 None。
pub fn parse_hhmm(text: &str) -> Option<u32> {
    let parts: Vec<&str> = text.trim().split(':').collect();
    match parts.len() {
        2 | 3 => {
            let h: u32 = parts[0].trim().parse().ok()?;
            let m: u32 = parts[1].trim().parse().ok()?;
            if h > 23 || m > 59 {
                return None;
            }
            Some(h * 60 + m)
        }
        _ => None,
    }
}

/// time（分钟）是否落在 [start, end)；start >= end 视为跨零点区间。
fn time_in_range(time: NaiveTime, start: u32, end: u32) -> bool {
    let t = time.num_seconds_from_midnight() / 60;
    if start < end {
        t >= start && t < end
    } else if start > end {
        t >= start || t < end
    } else {
        true // start == end：全天
    }
}

/// 每年循环的节日日期：公历或农历。农历按「正月初一 = month 1 day 1」表达；
/// `leap = true` 只匹配闰月（当年无闰月则整年不命中）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum YearlyDate {
    Solar { month: u32, day: u32 },
    Lunar { month: u32, day: u32, leap: bool },
}

impl YearlyDate {
    pub fn matches(&self, date: NaiveDate) -> bool {
        match *self {
            YearlyDate::Solar { month, day } => date.month() == month && date.day() == day,
            YearlyDate::Lunar { month, day, leap } => lunar_of(date)
                .is_some_and(|(m, leap_month, d)| m == month && leap_month == leap && d == day),
        }
    }
}

/// 公历日期 -> (农历月, 是否闰月, 农历日)。超出换算范围返回 None。
fn lunar_of(date: NaiveDate) -> Option<(u32, bool, u32)> {
    use chinese_lunisolar_calendar::LunisolarDate;
    if !(1901..=2101).contains(&date.year()) {
        return None;
    }
    let solar =
        chinese_lunisolar_calendar::SolarDate::from_ymd(date.year() as u16, date.month() as u8, date.day() as u8)
            .ok()?;
    let lunisolar = LunisolarDate::from_solar_date(solar).ok()?;
    let month = lunisolar.to_lunar_month();
    Some((
        month.to_u8() as u32,
        month.is_leap_month(),
        lunisolar.to_lunar_day().to_u8() as u32,
    ))
}

/// 单日具体编排（如生日、出差日）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DayPlan {
    /// 本地日期 "YYYY-MM-DD"。
    pub date: String,
    pub enabled: bool,
    #[serde(flatten)]
    pub slots: WallpaperSlots,
}

/// 每年循环的节假日规则（春节 / 国庆 / 圣诞…）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YearlyRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub date: Option<YearlyDate>,
    #[serde(flatten)]
    pub slots: WallpaperSlots,
}

/// 每周规则（周末等）。`weekdays` 取值 0=周日 … 6=周六（与 JS `getDay()` 一致）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WeeklyRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub weekdays: Vec<u32>,
    #[serde(flatten)]
    pub slots: WallpaperSlots,
}

/// 壁纸日历文档。`enabled = false` 时整体不接管（数据保留）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CalendarDoc {
    pub enabled: bool,
    pub days: Vec<DayPlan>,
    pub yearly: Vec<YearlyRule>,
    pub weekly: Vec<WeeklyRule>,
}

/// 求值命中的规则来源（月历徽章 / 调试用）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum ResolutionSource {
    Day,
    Yearly { id: String, name: String },
    Weekly { id: String, name: String },
}

/// 一次求值的完整结果。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Resolution {
    pub source: ResolutionSource,
    pub file_path: PathBuf,
}

/// 按四级优先级求值：某天某时刻应显示的壁纸；None = 不接管。
pub fn resolve_at(doc: &CalendarDoc, date: NaiveDate, time: NaiveTime) -> Option<Resolution> {
    match_day(doc, date, time).map(|m| Resolution {
        source: m.source,
        file_path: m.file_path.to_path_buf(),
    })
}

struct Matched<'a> {
    source: ResolutionSource,
    file_path: &'a Path,
    segment_count: usize,
}

fn match_day<'a>(doc: &'a CalendarDoc, date: NaiveDate, time: NaiveTime) -> Option<Matched<'a>> {
    if !doc.enabled {
        return None;
    }
    let date_str = date.format("%Y-%m-%d").to_string();
    // 1) 单日编排
    if let Some(plan) = doc.days.iter().find(|d| d.enabled && d.date == date_str) {
        if let Some(r) = plan.slots.pick(time) {
            return Some(Matched {
                source: ResolutionSource::Day,
                file_path: &r.file_path,
                segment_count: plan.slots.segment_count(),
            });
        }
    }
    // 2) 年度节日（同日多条按文档序取第一条）
    for rule in doc.yearly.iter().filter(|r| r.enabled) {
        if rule.date.is_some_and(|d| d.matches(date)) {
            if let Some(r) = rule.slots.pick(time) {
                return Some(Matched {
                    source: ResolutionSource::Yearly {
                        id: rule.id.clone(),
                        name: rule.name.clone(),
                    },
                    file_path: &r.file_path,
                    segment_count: rule.slots.segment_count(),
                });
            }
        }
    }
    // 3) 每周规则（周末等；同日多条按文档序取第一条）
    let weekday = date.weekday().num_days_from_sunday();
    for rule in doc.weekly.iter().filter(|r| r.enabled) {
        if rule.weekdays.contains(&weekday) {
            if let Some(r) = rule.slots.pick(time) {
                return Some(Matched {
                    source: ResolutionSource::Weekly {
                        id: rule.id.clone(),
                        name: rule.name.clone(),
                    },
                    file_path: &r.file_path,
                    segment_count: rule.slots.segment_count(),
                });
            }
        }
    }
    // 4) 不接管
    None
}

/// 月历预览里的一天：以正午为代表时刻求值（代表当日"主体"壁纸）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarPreviewDay {
    pub date: String,
    pub source: Option<ResolutionSource>,
    pub file_path: Option<PathBuf>,
    pub segment_count: usize,
}

/// 全年逐日预览（月历视图的唯一数据口径，前端不再自行推优先级）。
pub fn preview_year(doc: &CalendarDoc, year: i32) -> Vec<CalendarPreviewDay> {
    let mut out = Vec::new();
    let mut date = NaiveDate::from_ymd_opt(year, 1, 1);
    while let Some(d) = date {
        if d.year() != year {
            break;
        }
        let noon = NaiveTime::from_hms_opt(12, 0, 0).unwrap_or_default();
        let matched = match_day(doc, d, noon);
        out.push(CalendarPreviewDay {
            date: d.format("%Y-%m-%d").to_string(),
            source: matched.as_ref().map(|m| m.source.clone()),
            file_path: matched.as_ref().map(|m| m.file_path.to_path_buf()),
            segment_count: matched.as_ref().map(|m| m.segment_count).unwrap_or(0),
        });
        date = d.succ_opt();
    }
    out
}

/// 引用合法性检查：文件存在且类型可渲染（不做 I/O 重活，保存前即时校验用）。
pub fn invalid_refs(doc: &CalendarDoc) -> Vec<PathBuf> {
    let mut seen = BTreeMap::new();
    collect_refs(&doc.days.iter().map(|d| &d.slots).collect::<Vec<_>>(), &mut seen);
    collect_refs(&doc.yearly.iter().map(|r| &r.slots).collect::<Vec<_>>(), &mut seen);
    collect_refs(&doc.weekly.iter().map(|r| &r.slots).collect::<Vec<_>>(), &mut seen);
    seen.into_keys()
        .filter(|path| !ref_is_valid(path))
        .collect()
}

fn collect_refs<'a>(slots: &[&'a WallpaperSlots], out: &mut BTreeMap<PathBuf, ()>) {
    for s in slots {
        if let Some(w) = &s.all_day {
            out.insert(w.file_path.clone(), ());
        }
        for seg in &s.segments {
            out.insert(seg.wallpaper.file_path.clone(), ());
        }
    }
}

fn ref_is_valid(path: &Path) -> bool {
    if path.as_os_str().is_empty() || !path.is_file() {
        return false;
    }
    matches!(
        wallpaper_type_of_file(path),
        WallpaperType::Img
            | WallpaperType::AnimatedImg
            | WallpaperType::Video
            | WallpaperType::Web
            | WallpaperType::Playlist
    )
}

// ---------- 存储 ----------

/// 日历文档的读写（独立于 ConfigStore，避免牵动既有配置语义）。
pub struct CalendarStore;

impl CalendarStore {
    pub fn load(dirs: &AppDirs) -> CalendarDoc {
        crate::config::read_json_file(&dirs.config_file("calendar")).unwrap_or_default()
    }

    pub fn save(dirs: &AppDirs, doc: &CalendarDoc) -> std::io::Result<()> {
        crate::config::write_json_file(&dirs.config_file("calendar"), doc)
    }

    pub fn state_file(dirs: &AppDirs) -> PathBuf {
        dirs.config_file("calendar-state")
    }
}

// ---------- 调度器 ----------

/// 预解析快照：文档 + 引用解析结果。构建在 managers 锁外完成；
/// tick 只读此快照，零文件 I/O。
pub struct CalendarSnapshot {
    pub doc: CalendarDoc,
    /// file_path -> 解析出的完整壁纸（含封面）。
    pub resolved: BTreeMap<PathBuf, Wallpaper>,
    /// 解析失败的引用（文件缺失 / 类型不支持），validate 结果与 UI 提示用。
    pub invalid: Vec<PathBuf>,
}

/// 壁纸日历调度器：持有预解析快照，周期比对「当前应显示」与「上次已应用」，
/// 目标变化才切壁纸（尊重用户段内的手动临时更换，到下个边界恢复）。
pub struct CalendarScheduler {
    api: Arc<WallpaperApi>,
    snapshot: parking_lot::RwLock<Arc<CalendarSnapshot>>,
    last_applied: parking_lot::Mutex<Option<PathBuf>>,
    state_file: PathBuf,
}

impl CalendarScheduler {
    pub fn new(api: Arc<WallpaperApi>, dirs: &AppDirs) -> Self {
        let doc = CalendarStore::load(dirs);
        Self {
            api,
            snapshot: parking_lot::RwLock::new(Arc::new(CalendarSnapshot {
                doc,
                resolved: BTreeMap::new(),
                invalid: Vec::new(),
            })),
            last_applied: parking_lot::Mutex::new(None),
            state_file: CalendarStore::state_file(dirs),
        }
    }

    /// 当前快照（命令层填充展示 URL 用）。
    pub fn snapshot(&self) -> Arc<CalendarSnapshot> {
        self.snapshot.read().clone()
    }

    /// 当前生效的日历文档（重建快照入参用）。
    pub fn current_doc(&self) -> CalendarDoc {
        self.snapshot.read().doc.clone()
    }

    /// 重建快照：含文件 I/O（load_wallpaper 可能生成封面），调用方须放在
    /// spawn_blocking / managers 锁外。保存日历、启动时调用。
    pub fn rebuild_snapshot(&self, doc: CalendarDoc, mpv_exe: &Path, default_cover: &Path) {
        let mut resolved = BTreeMap::new();
        let mut invalid = Vec::new();
        // 全部唯一引用逐个解析（缺失 / 类型不支持的记入 invalid，不进 tick 兜底扫库）
        let mut unique: Vec<PathBuf> = Vec::new();
        for p in doc_ref_paths(&doc) {
            if !unique.contains(&p) {
                unique.push(p);
            }
        }
        for path in unique {
            if !ref_is_valid(&path) {
                log::warn!("calendar ref invalid: {}", path.display());
                invalid.push(path);
                continue;
            }
            match library::load_wallpaper(&path, mpv_exe, default_cover) {
                Ok(w) => {
                    resolved.insert(path, w);
                }
                Err(e) => {
                    log::warn!("calendar ref load failed {}: {e}", path.display());
                    invalid.push(path);
                }
            }
        }
        log::info!(
            "calendar snapshot rebuilt: refs={} resolved={} invalid={}",
            resolved.len() + invalid.len(),
            resolved.len(),
            invalid.len()
        );
        *self.snapshot.write() = Arc::new(CalendarSnapshot {
            doc,
            resolved,
            invalid,
        });
    }

    /// 求值并在目标变化（或 `force`）时应用。启动、显示器变化、保存后
    /// 用 force=true；周期 tick 用 force=false。
    pub async fn evaluate_now(&self, force: bool) {
        let snap = self.snapshot.read().clone();
        if !snap.doc.enabled {
            *self.last_applied.lock() = None;
            return;
        }
        let now = chrono::Local::now();
        let target = resolve_at(&snap.doc, now.date_naive(), now.time()).map(|r| r.file_path);
        {
            let last = self.last_applied.lock();
            if !force && *last == target {
                return;
            }
        }
        let Some(path) = target else {
            *self.last_applied.lock() = None;
            self.persist_state(None);
            return;
        };
        let Some(wallpaper) = snap.resolved.get(&path) else {
            // 失效引用：不进 tick 兜底扫库，只记录，等待用户修或下次保存重建
            log::warn!("calendar target not resolved, skip apply: {}", path.display());
            *self.last_applied.lock() = Some(path.clone());
            return;
        };
        let mut wallpaper = wallpaper.clone();
        wallpaper.running_info = Default::default();
        match self.api.show_wallpaper(wallpaper, vec![]).await {
            Ok(()) => {
                log::info!("calendar applied wallpaper: {}", path.display());
                *self.last_applied.lock() = Some(path.clone());
                self.persist_state(Some(&path));
            }
            Err(e) => log::warn!("calendar apply failed: {e}"),
        }
    }

    /// 周期 tick：目标变化才动手。
    pub async fn tick(&self) {
        self.evaluate_now(false).await;
    }

    fn persist_state(&self, applied: Option<&Path>) {
        let state = serde_json::json!({
            "lastApplied": applied.map(|p| p.to_string_lossy().to_string()),
            "appliedAt": chrono::Local::now().to_rfc3339(),
        });
        if let Ok(text) = serde_json::to_string_pretty(&state) {
            let _ = std::fs::write(&self.state_file, text);
        }
    }
}

fn doc_ref_paths(doc: &CalendarDoc) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let mut push = |slots: &WallpaperSlots| {
        if let Some(w) = &slots.all_day {
            out.push(w.file_path.clone());
        }
        for seg in &slots.segments {
            out.push(seg.wallpaper.file_path.clone());
        }
    };
    for d in &doc.days {
        push(&d.slots);
    }
    for r in &doc.yearly {
        push(&r.slots);
    }
    for r in &doc.weekly {
        push(&r.slots);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Weekday;

    fn time(h: u32, m: u32) -> NaiveTime {
        NaiveTime::from_hms_opt(h, m, 0).unwrap()
    }

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn ref_of(path: &str) -> WallpaperRef {
        WallpaperRef::from_path(PathBuf::from(path))
    }

    fn slots_all_day(path: &str) -> WallpaperSlots {
        WallpaperSlots {
            all_day: Some(ref_of(path)),
            segments: Vec::new(),
        }
    }

    #[test]
    fn parse_hhmm_works() {
        assert_eq!(parse_hhmm("08:30"), Some(510));
        assert_eq!(parse_hhmm("23:59"), Some(1439));
        assert_eq!(parse_hhmm("08:30:15"), Some(510));
        assert_eq!(parse_hhmm("24:00"), None);
        assert_eq!(parse_hhmm("bad"), None);
    }

    #[test]
    fn empty_doc_does_not_take_over() {
        let doc = CalendarDoc::default();
        assert_eq!(resolve_at(&doc, date(2026, 10, 1), time(12, 0)), None);
        // 总开关关闭时即便有规则也不接管
        let mut doc = doc;
        doc.enabled = false;
        doc.yearly.push(YearlyRule {
            id: "1".into(),
            name: "国庆".into(),
            enabled: true,
            date: Some(YearlyDate::Solar { month: 10, day: 1 }),
            slots: slots_all_day("a.jpg"),
        });
        assert_eq!(resolve_at(&doc, date(2026, 10, 1), time(12, 0)), None);
    }

    #[test]
    fn solar_yearly_matches() {
        let doc = CalendarDoc {
            enabled: true,
            yearly: vec![YearlyRule {
                id: "national".into(),
                name: "国庆".into(),
                enabled: true,
                date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                slots: slots_all_day("flag.jpg"),
            }],
            ..Default::default()
        };
        let r = resolve_at(&doc, date(2026, 10, 1), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("flag.jpg"));
        assert_eq!(
            r.source,
            ResolutionSource::Yearly {
                id: "national".into(),
                name: "国庆".into()
            }
        );
        // 相邻年份同样命中（每年循环）
        assert!(resolve_at(&doc, date(2027, 10, 1), time(9, 0)).is_some());
        // 10 月 2 日不命中
        assert!(resolve_at(&doc, date(2026, 10, 2), time(9, 0)).is_none());
    }

    /// 农历节日：春节（正月初一）按公历逐年浮动，须由换算命中。
    #[test]
    fn lunar_yearly_matches() {
        let doc = CalendarDoc {
            enabled: true,
            yearly: vec![YearlyRule {
                id: "spring".into(),
                name: "春节".into(),
                enabled: true,
                date: Some(YearlyDate::Lunar {
                    month: 1,
                    day: 1,
                    leap: false,
                }),
                slots: slots_all_day("spring.jpg"),
            }],
            ..Default::default()
        };
        // 2026 春节 = 公历 2026-02-17；2025 = 2025-01-29
        let r = resolve_at(&doc, date(2026, 2, 17), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("spring.jpg"));
        assert!(resolve_at(&doc, date(2025, 1, 29), time(9, 0)).is_some());
        assert!(resolve_at(&doc, date(2026, 2, 16), time(9, 0)).is_none());
        assert!(resolve_at(&doc, date(2026, 2, 18), time(9, 0)).is_none());
    }

    #[test]
    fn day_plan_beats_yearly_and_weekly() {
        let doc = CalendarDoc {
            enabled: true,
            days: vec![DayPlan {
                date: "2026-10-01".into(),
                enabled: true,
                slots: slots_all_day("birthday.jpg"),
            }],
            yearly: vec![YearlyRule {
                id: "national".into(),
                name: "国庆".into(),
                enabled: true,
                date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                slots: slots_all_day("flag.jpg"),
            }],
            weekly: vec![WeeklyRule {
                id: "weekend".into(),
                name: "周末".into(),
                enabled: true,
                weekdays: vec![0, 6],
                slots: slots_all_day("weekend.jpg"),
            }],
        };
        let r = resolve_at(&doc, date(2026, 10, 1), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("birthday.jpg"));
        assert_eq!(r.source, ResolutionSource::Day);
    }

    #[test]
    fn yearly_beats_weekly() {
        let doc = CalendarDoc {
            enabled: true,
            days: Vec::new(),
            yearly: vec![YearlyRule {
                id: "midautumn".into(),
                name: "中秋".into(),
                enabled: true,
                date: Some(YearlyDate::Lunar {
                    month: 8,
                    day: 15,
                    leap: false,
                }),
                slots: slots_all_day("moon.jpg"),
            }],
            weekly: vec![WeeklyRule {
                id: "weekend".into(),
                name: "周末".into(),
                enabled: true,
                weekdays: vec![0, 6],
                slots: slots_all_day("weekend.jpg"),
            }],
        };
        // 2026-09-25 是中秋节，且为周五之后……直接验证：中秋节命中 yearly
        let r = resolve_at(&doc, date(2026, 9, 25), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("moon.jpg"));
        // 普通周六命中 weekly：2026-10-03 是周六
        let r = resolve_at(&doc, date(2026, 10, 3), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("weekend.jpg"));
        assert_eq!(
            r.source,
            ResolutionSource::Weekly {
                id: "weekend".into(),
                name: "周末".into()
            }
        );
    }

    #[test]
    fn yearly_overlap_takes_document_order() {
        let doc = CalendarDoc {
            enabled: true,
            yearly: vec![
                YearlyRule {
                    id: "first".into(),
                    name: "先定义".into(),
                    enabled: true,
                    date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                    slots: slots_all_day("first.jpg"),
                },
                YearlyRule {
                    id: "second".into(),
                    name: "后定义".into(),
                    enabled: true,
                    date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                    slots: slots_all_day("second.jpg"),
                },
            ],
            ..Default::default()
        };
        let r = resolve_at(&doc, date(2026, 10, 1), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("first.jpg"));
    }

    #[test]
    fn segments_pick_by_time_and_cross_midnight() {
        let slots = WallpaperSlots {
            all_day: Some(ref_of("default.jpg")),
            segments: vec![
                TimeSegment {
                    start: "06:00".into(),
                    end: "12:00".into(),
                    wallpaper: ref_of("morning.jpg"),
                },
                TimeSegment {
                    start: "22:00".into(),
                    end: "06:00".into(), // 跨零点
                    wallpaper: ref_of("night.jpg"),
                },
            ],
        };
        let d = date(2026, 10, 1);
        assert_eq!(slots.pick(time(7, 0)).unwrap().file_path, PathBuf::from("morning.jpg"));
        assert_eq!(slots.pick(time(12, 30)).unwrap().file_path, PathBuf::from("default.jpg"));
        assert_eq!(slots.pick(time(23, 0)).unwrap().file_path, PathBuf::from("night.jpg"));
        // 跨零点段的后半夜归属同一规则
        assert_eq!(slots.pick(time(5, 59)).unwrap().file_path, PathBuf::from("night.jpg"));
        let _ = d;
    }

    #[test]
    fn disabled_or_empty_slots_fall_through() {
        // 单日规则存在但未启用：落到年度规则
        let doc = CalendarDoc {
            enabled: true,
            days: vec![DayPlan {
                date: "2026-10-01".into(),
                enabled: false,
                slots: slots_all_day("hidden.jpg"),
            }],
            yearly: vec![YearlyRule {
                id: "national".into(),
                name: "国庆".into(),
                enabled: true,
                date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                slots: slots_all_day("flag.jpg"),
            }],
            ..Default::default()
        };
        let r = resolve_at(&doc, date(2026, 10, 1), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("flag.jpg"));

        // 规则启用但没配壁纸（空引用）：视为未命中，继续往下走
        let doc = CalendarDoc {
            enabled: true,
            yearly: vec![YearlyRule {
                id: "national".into(),
                name: "国庆".into(),
                enabled: true,
                date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                slots: WallpaperSlots::default(),
            }],
            weekly: vec![WeeklyRule {
                id: "thu".into(),
                name: "周四".into(),
                enabled: true,
                weekdays: vec![4],
                slots: slots_all_day("thursday.jpg"),
            }],
            ..Default::default()
        };
        // 2026-10-01 是周四：年度规则没配壁纸 -> 落到每周规则
        let r = resolve_at(&doc, date(2026, 10, 1), time(9, 0)).unwrap();
        assert_eq!(r.file_path, PathBuf::from("thursday.jpg"));
    }

    #[test]
    fn preview_year_covers_whole_year() {
        let doc = CalendarDoc {
            enabled: true,
            yearly: vec![YearlyRule {
                id: "national".into(),
                name: "国庆".into(),
                enabled: true,
                date: Some(YearlyDate::Solar { month: 10, day: 1 }),
                slots: slots_all_day("flag.jpg"),
            }],
            ..Default::default()
        };
        let days = preview_year(&doc, 2026);
        assert_eq!(days.len(), 365);
        let hit = days.iter().find(|d| d.date == "2026-10-01").unwrap();
        assert_eq!(hit.file_path.as_deref(), Some(Path::new("flag.jpg")));
        assert_eq!(hit.segment_count, 0);
    }

    #[test]
    fn invalid_refs_detects_missing_and_unsupported() {
        let dir = std::env::temp_dir().join(format!("wp4-cal-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let img = dir.join("ok.jpg");
        std::fs::write(&img, "jpg").unwrap();
        let exe = dir.join("bad.exe");
        std::fs::write(&exe, "exe").unwrap();

        let doc = CalendarDoc {
            enabled: true,
            weekly: vec![WeeklyRule {
                id: "weekend".into(),
                name: "周末".into(),
                enabled: true,
                weekdays: vec![0, 6],
                slots: WallpaperSlots {
                    all_day: Some(ref_of(img.to_string_lossy().as_ref())),
                    segments: vec![TimeSegment {
                        start: "08:00".into(),
                        end: "10:00".into(),
                        wallpaper: ref_of(exe.to_string_lossy().as_ref()),
                    }],
                },
            }],
            ..Default::default()
        };
        let bad = invalid_refs(&doc);
        assert_eq!(bad, vec![exe]);
        assert!(ref_is_valid(&img));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn weekday_number_matches_js_get_day() {
        // 2026-10-04 是周日：num_days_from_sunday() == 0（与 JS getDay 一致）
        assert_eq!(date(2026, 10, 4).weekday().num_days_from_sunday(), 0);
        assert_eq!(date(2026, 10, 3).weekday(), Weekday::Sat);
    }
}
