//! 皮肤目录热监听：`skins/` 下任何文件变化 ->
//! - 当前生效皮肤变化：后端直接整页刷新主窗口（eval reload，皮肤不含 SDK /
//!   未订阅事件也生效），并广播 `refresh-page` 供皮肤 / hub 兼容桥响应；
//!   `skin://` 协议每次请求实时读盘且 no-cache，刷新即最新内容；
//! - 当前皮肤的 `skin.json` 变更（或皮肤目录被删）：加载目标（type/entry）
//!   可能变化或清单失效，重新解析并应用（见 `lib.rs::reapply_main_window`，
//!   优先原地 navigate，无闪烁）；
//! - 任何变化：发布 `skins-changed`，设置页据此刷新皮肤列表。
//!
//! 配合目录联接（junction / symlink）把 `skins/<id>` 指到仓库里的皮肤源码，
//! 即可做到"改完保存，应用自动刷新"的热更新开发流（见 scripts/link-skin.sh）。
//!
//! 监听结构（Windows 实测：对父目录递归监听收不到经 junction 的变化）：
//! - `skins/` 本体非递归监听 -> 感知皮肤文件夹的新增 / 删除；
//! - 每个皮肤子目录单独递归监听 -> 打开句柄时穿过 junction，事件可达；
//! - 每批事件后重新同步监听集合，新放入的皮肤目录立即纳入监听；目录被
//!   原地替换（如安装副本换成 junction）时旧句柄已死但路径未变，按目录
//!   身份（创建时间）识别并重建监听。
//!
//! 监听失败只损失热更新体验，不影响功能，一律 log::warn 降级。

use notify_debouncer_mini::{new_debouncer, DebouncedEvent};
use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use tauri::Manager;
use wallpaper_core::AppDirs;

/// 防抖窗口：吸收编辑器原子保存（写临时文件再替换）触发的连串事件。
const DEBOUNCE: Duration = Duration::from_millis(500);

/// 启动皮肤目录监听线程（后台常驻；失败只记日志）。
pub fn start(app: tauri::AppHandle) {
    let dirs = app
        .try_state::<crate::state::AppState>()
        .map(|s| s.dirs.clone())
        .unwrap_or_else(AppDirs::resolve);
    std::thread::spawn(move || run(app, dirs));
}

fn run(app: tauri::AppHandle, dirs: AppDirs) {
    use notify_debouncer_mini::notify::RecursiveMode;

    let skins_dir = crate::skin::skins_dir(&dirs);
    if let Err(e) = std::fs::create_dir_all(&skins_dir) {
        log::warn!("skin watch: create skins dir failed: {e}");
        return;
    }
    let (tx, rx) = std::sync::mpsc::channel();
    let mut debouncer = match new_debouncer(DEBOUNCE, tx) {
        Ok(d) => d,
        Err(e) => {
            log::warn!("skin watch: init failed: {e}");
            return;
        }
    };
    // 统一走 debouncer re-export 的 notify，避免依赖图里出现两个版本
    if let Err(e) = debouncer
        .watcher()
        .watch(&skins_dir, RecursiveMode::NonRecursive)
    {
        log::warn!("skin watch: watch {:?} failed: {e}", skins_dir);
        return;
    }
    log::info!("skin watch: watching {:?}", skins_dir);

    // 已递归监听的皮肤子目录（skins/<id>）-> 建立监听时的目录身份
    let mut watched: HashMap<PathBuf, Option<SystemTime>> = HashMap::new();
    sync_skin_watches(debouncer.watcher(), &skins_dir, &mut watched);

    // debouncer 保活即监听保活，本线程常驻
    for events in rx {
        match events {
            Ok(events) => {
                handle_events(&app, &dirs, &events);
                // 新放入的皮肤目录（含 junction / symlink）在此纳入监听
                sync_skin_watches(debouncer.watcher(), &skins_dir, &mut watched);
            }
            Err(e) => log::warn!("skin watch: event error: {e}"),
        }
    }
}

/// 一批防抖后的事件 -> 发布对应应用事件。
fn handle_events(app: &tauri::AppHandle, dirs: &AppDirs, events: &[DebouncedEvent]) {
    let changed = changed_skin_ids(dirs, events);
    if changed.is_empty() {
        return;
    }
    // 皮肤文件夹可能新增/删除，设置页据此刷新列表
    crate::publish_event(app, "skins-changed", ());
    // 当前生效皮肤的文件变了 -> 整页刷新，reload 后 skin:// 重新读盘
    let current = crate::skin::configured_skin_id(dirs);
    if !current_skin_affected(&current, &changed) {
        return;
    }
    log::info!("skin watch: skin {:?} changed, refresh page", current);
    crate::publish_event(app, "refresh-page", ());
    // 后端兜底刷新：不含 SDK / 未调 initEvents 的皮肤收不到上面的事件，
    // 直接让主窗口 webview 重载。
    let skins_root = crate::skin::skins_dir(dirs);
    if touches_manifest(&skins_root, &current, events) || !skins_root.join(&current).is_dir() {
        // skin.json 变了（或皮肤目录整个没了）：加载目标（type/entry）可能
        // 变化或清单失效，页面 reload 只会停留在旧 URL，需重新解析并应用。
        log::info!("skin watch: skin {:?} manifest changed, reapply", current);
        crate::reapply_main_window(app);
    } else {
        crate::eval_reload_main_webview(app);
    }
}

/// 把 skins 下的每个皮肤子目录纳入递归监听（逐目录打开句柄，
/// junction / symlink 指向的源码目录因此可达）；已消失的目录移除监听；
/// 目录被原地替换（身份变化，旧句柄已随删除失效但路径未变）时重建监听。
fn sync_skin_watches(
    watcher: &mut dyn notify_debouncer_mini::notify::Watcher,
    skins_dir: &Path,
    watched: &mut HashMap<PathBuf, Option<SystemTime>>,
) {
    use notify_debouncer_mini::notify::RecursiveMode;
    use std::fs;

    let Ok(entries) = fs::read_dir(skins_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let identity = dir_identity(&path);
        if let Some(old) = watched.get(&path) {
            if *old == identity {
                continue;
            }
            // 同路径的新目录：旧监听句柄已失效，先注销再重建
            let _ = watcher.unwatch(&path);
        }
        match watcher.watch(&path, RecursiveMode::Recursive) {
            Ok(()) => {
                watched.insert(path.clone(), identity);
            }
            Err(err) => {
                watched.remove(&path);
                log::warn!("skin watch: watch {:?} failed: {err}", path);
            }
        }
    }
    // 目录被删掉时移除监听（目录可能已不存在，unwatch 失败也无妨）
    watched.retain(|path, _| {
        if path.is_dir() {
            return true;
        }
        let _ = watcher.unwatch(path);
        false
    });
}

/// 目录身份：自身的创建时间（symlink_metadata 取链接本体的元数据，
/// 不跟随 junction / symlink；同一路径被重建时创建时间必然变化）。
/// 平台不支持创建时间时返回 None（退化为"从不重建"，仅损失自愈能力）。
fn dir_identity(path: &Path) -> Option<SystemTime> {
    std::fs::symlink_metadata(path).ok()?.created().ok()
}

/// 从事件路径提取涉及的皮肤 id（`skins/<id>/...` 的第一段；越界路径忽略）。
fn changed_skin_ids(dirs: &AppDirs, events: &[DebouncedEvent]) -> BTreeSet<String> {
    let root = crate::skin::skins_dir(dirs);
    events
        .iter()
        .filter_map(|ev| skin_id_of(&root, &ev.path))
        .collect()
}

/// 皮肤目录名即皮肤 id（`main_window_target` 直接以 id 拼目录路径）。
fn skin_id_of(skins_root: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(skins_root).ok()?;
    let mut components = rel.components();
    let id = components
        .next()?
        .as_os_str()
        .to_string_lossy()
        .into_owned();
    // skins 根直下的散文件不是皮肤（皮肤必须是包含 skin.json 的目录）
    if components.next().is_none() && path.is_file() {
        return None;
    }
    (!id.is_empty()).then_some(id)
}

/// 当前生效皮肤是否在变化集合里（default 是内置界面，不经 skins 目录，无热更新概念）。
fn current_skin_affected(current: &str, changed: &BTreeSet<String>) -> bool {
    current != crate::skin::DEFAULT_SKIN_ID && changed.contains(current)
}

/// 一批事件是否涉及 `skins/<id>/skin.json`（任何事件类型，含删除）。
/// 只认皮肤目录直下的清单，嵌套的同名文件（如素材）不触发窗口重新应用。
fn touches_manifest(skins_root: &Path, skin_id: &str, events: &[DebouncedEvent]) -> bool {
    use std::ffi::OsStr;
    events.iter().any(|ev| {
        let Ok(rel) = ev.path.strip_prefix(skins_root) else {
            return false;
        };
        let mut comps = rel.components();
        matches!(comps.next(), Some(c) if c.as_os_str() == OsStr::new(skin_id))
            && matches!(comps.next(), Some(c) if c.as_os_str() == OsStr::new("skin.json"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use notify_debouncer_mini::DebouncedEventKind;
    use std::fs;
    use std::path::PathBuf;

    fn temp_dirs(tag: &str) -> (AppDirs, PathBuf) {
        let root =
            std::env::temp_dir().join(format!("wp4-skin-watch-test-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        (AppDirs::new(root.clone()), root)
    }

    fn ev(path: PathBuf) -> DebouncedEvent {
        // 测试只关心 path，kind 不参与决策
        DebouncedEvent::new(path, DebouncedEventKind::Any)
    }

    #[test]
    fn extracts_skin_ids_from_event_paths() {
        let (dirs, root) = temp_dirs("ids");
        let skins = crate::skin::skins_dir(&dirs);
        fs::create_dir_all(skins.join("dev/panels")).unwrap();

        let ids = changed_skin_ids(&dirs, &[ev(skins.join("dev/style.css"))]);
        assert_eq!(ids, BTreeSet::from(["dev".to_string()]));

        // 一批事件跨多个皮肤 / 含 skins 之外路径
        let ids = changed_skin_ids(
            &dirs,
            &[
                ev(skins.join("dev/panels/a.js")),
                ev(root.join("logs/log.txt")),
                ev(skins.join("demo/skin.json")),
            ],
        );
        assert_eq!(ids, BTreeSet::from(["dev".to_string(), "demo".to_string()]));

        // skins 根直下的散文件不是皮肤，被忽略
        fs::write(skins.join("readme.md"), "x").unwrap();
        let ids = changed_skin_ids(&dirs, &[ev(skins.join("readme.md"))]);
        assert!(ids.is_empty());
        // 已删除的皮肤目录（路径不再是文件）仍计入，用于列表刷新
        let ids = changed_skin_ids(&dirs, &[ev(skins.join("demo"))]);
        assert_eq!(ids, BTreeSet::from(["demo".to_string()]));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn only_active_non_default_skin_triggers_refresh() {
        let changed = BTreeSet::from(["dev".to_string(), "demo".to_string()]);
        assert!(current_skin_affected("dev", &changed));
        assert!(!current_skin_affected("other", &changed));
        // 默认皮肤不热刷新
        assert!(!current_skin_affected("default", &changed));
    }

    #[test]
    fn detects_active_skin_manifest_changes() {
        let (dirs, root) = temp_dirs("manifest");
        let skins = crate::skin::skins_dir(&dirs);
        fs::create_dir_all(skins.join("dev/assets")).unwrap();

        // 皮肤目录直下的 skin.json（含删除事件）算清单变更
        assert!(touches_manifest(&skins, "dev", &[ev(skins.join("dev/skin.json"))]));
        // 嵌套的同名文件不算
        assert!(!touches_manifest(
            &skins,
            "dev",
            &[ev(skins.join("dev/assets/skin.json"))]
        ));
        // 其他皮肤 / skins 之外的路径不算
        assert!(!touches_manifest(
            &skins,
            "dev",
            &[ev(skins.join("other/skin.json"))]
        ));
        assert!(!touches_manifest(&skins, "dev", &[ev(root.join("logs/skin.json"))]));
        let _ = fs::remove_dir_all(root);
    }

    /// 关键链路端到端：逐目录监听经 junction 指入的皮肤源码目录，
    /// 改目标侧文件必须能收到带 skins/<id>/ 前缀的事件（Windows junction，
    /// 无需管理员权限）。
    #[cfg(windows)]
    #[test]
    fn watches_through_junction() {
        use notify_debouncer_mini::notify::RecursiveMode;

        let (dirs, root) = temp_dirs("junction");
        let skins = crate::skin::skins_dir(&dirs);
        fs::create_dir_all(&skins).unwrap();

        let real = root.join("real-skin-src");
        fs::create_dir_all(&real).unwrap();
        let link = skins.join("dev");
        let status = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(&real)
            .status()
            .expect("run mklink");
        assert!(status.success(), "mklink /J failed");

        let (tx, rx) = std::sync::mpsc::channel();
        let mut debouncer = new_debouncer(DEBOUNCE, tx).unwrap();
        // 与运行时一致：skins 本体非递归 + 皮肤目录单独递归
        debouncer
            .watcher()
            .watch(&skins, RecursiveMode::NonRecursive)
            .unwrap();
        debouncer
            .watcher()
            .watch(&link, RecursiveMode::Recursive)
            .unwrap();

        fs::write(real.join("style.css"), "body{}").unwrap();

        // 防抖 + 文件系统通知留足余量
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        let mut hit = false;
        while std::time::Instant::now() < deadline && !hit {
            match rx.recv_timeout(deadline.saturating_duration_since(std::time::Instant::now())) {
                Ok(Ok(events)) => {
                    hit = changed_skin_ids(&dirs, &events).contains("dev");
                }
                Ok(Err(e)) => panic!("watch error: {e}"),
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => break,
                Err(e) => panic!("channel error: {e}"),
            }
        }
        assert!(hit, "no event observed through junction within 5s");

        let _ = fs::remove_dir_all(root);
    }

    /// 回归：运行中把皮肤目录原地替换成 junction（如 link-skin.sh 覆盖安装
    /// 副本）后，旧监听句柄失效但路径未变 —— 重新同步必须按目录身份变化
    /// 重建监听，此后改 junction 目标侧文件仍能收到事件。
    #[cfg(windows)]
    #[test]
    fn resyncs_watch_after_dir_replaced_in_place() {
        use notify_debouncer_mini::notify::RecursiveMode;

        let (dirs, root) = temp_dirs("resync");
        let skins = crate::skin::skins_dir(&dirs);
        fs::create_dir_all(&skins).unwrap();
        let real = root.join("real-skin-src");
        fs::create_dir_all(&real).unwrap();
        let dev = skins.join("dev");
        fs::create_dir_all(&dev).unwrap();

        let (tx, rx) = std::sync::mpsc::channel();
        let mut debouncer = new_debouncer(DEBOUNCE, tx).unwrap();
        debouncer
            .watcher()
            .watch(&skins, RecursiveMode::NonRecursive)
            .unwrap();

        // 第一阶段：真实目录纳入监听
        let mut watched: HashMap<PathBuf, Option<SystemTime>> = HashMap::new();
        sync_skin_watches(debouncer.watcher(), &skins, &mut watched);
        assert!(watched.contains_key(&dev));

        // 第二阶段：原地删除并换成 junction（路径不变，旧句柄随之失效）
        fs::remove_dir_all(&dev).unwrap();
        let status = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&dev)
            .arg(&real)
            .status()
            .expect("run mklink");
        assert!(status.success(), "mklink /J failed");

        // 第三阶段：重新同步后，改 junction 目标侧文件必须可达
        sync_skin_watches(debouncer.watcher(), &skins, &mut watched);
        // 等 phase-2 目录增删的防抖事件全部到达并清空，避免误判
        std::thread::sleep(DEBOUNCE * 3);
        while rx.try_recv().is_ok() {}

        fs::write(real.join("style.css"), "body{}").unwrap();
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        let mut hit = false;
        while std::time::Instant::now() < deadline && !hit {
            match rx.recv_timeout(deadline.saturating_duration_since(std::time::Instant::now())) {
                Ok(Ok(events)) => hit = changed_skin_ids(&dirs, &events).contains("dev"),
                Ok(Err(e)) => panic!("watch error: {e}"),
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => break,
                Err(e) => panic!("channel error: {e}"),
            }
        }
        assert!(hit, "no event observed after in-place junction replacement");

        let _ = fs::remove_dir_all(root);
    }
}
