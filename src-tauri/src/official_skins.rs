//! 官方皮肤分发：安装包内置（build.rs 把 examples/ 下的官方皮肤源码嵌入
//! 二进制），启动时解包安装到 `skins/<id>/`：
//! - 目录不存在 -> 全新安装；
//! - 目录是 junction / symlink（开发联接脚本挂进来的）-> 不动，避免穿透
//!   写进源码仓库；
//! - 普通目录且内置版本更新 -> 整目录替换升级（官方皮肤由应用托管，升级
//!   会覆盖本地改动）。
//! - 曾内置、现已退役的官方皮肤 -> 启动时从 skins/ 移除（junction 不动），
//!   配置仍指向退役皮肤时改回出厂默认。
//!
//! 旧版本安装包的用户升级应用后无需手动操作即可拿到最新的官方皮肤。

use std::path::Path;
use wallpaper_core::AppDirs;

/// 嵌入的官方皮肤（表由 build.rs 生成）。
pub struct OfficialSkin {
    /// 皮肤 id，同时是 skins/ 下的目录名。
    pub id: &'static str,
    /// (相对路径，统一正斜杠, 文件内容)。
    pub files: &'static [(&'static str, &'static [u8])],
}

include!(concat!(env!("OUT_DIR"), "/official_skins.rs"));

/// 曾随安装包内置分发、现已退役的官方皮肤 id（源码归档在
/// examples/archive/）。启动同步时从 skins/ 移除对应普通目录；开发联接
/// （junction / symlink）不在此列，绝不动。
const RETIRED_SKIN_IDS: &[&str] = &[
    "aurora",
    "bento",
    "brutal",
    "cupertino",
    "linear",
    "liquid",
    "material",
    "paper",
    "term",
];

/// 启动时同步全部官方皮肤。尽力而为，单项失败只记日志，不阻断启动。
pub fn sync(dirs: &AppDirs) {
    remove_retired(dirs);
    remap_retired_active_config(dirs);
    for skin in OFFICIAL_SKINS {
        let bundled = bundled_version(skin);
        let dest = crate::skin::skins_dir(dirs).join(skin.id);
        match install_plan(&dest, &bundled) {
            Plan::Skip => {}
            Plan::Install => match write_files(skin, &dest) {
                Ok(()) => log::info!("official skin {:?}: installed v{bundled}", skin.id),
                Err(e) => log::warn!("official skin {:?}: install failed: {e}", skin.id),
            },
            Plan::Upgrade => {
                let res = std::fs::remove_dir_all(&dest).and_then(|()| write_files(skin, &dest));
                match res {
                    Ok(()) => log::info!("official skin {:?}: upgraded to v{bundled}", skin.id),
                    Err(e) => log::warn!("official skin {:?}: upgrade failed: {e}", skin.id),
                }
            }
        }
    }
}

/// 移除退役官方皮肤的 skins/ 目录（仅普通目录；junction / symlink / 普通文件
/// 一律不动）。旧版应用装过、新版不再分发的皮肤由此清理出列表。
fn remove_retired(dirs: &AppDirs) {
    let skins = crate::skin::skins_dir(dirs);
    for id in RETIRED_SKIN_IDS {
        let dest = skins.join(id);
        let Ok(meta) = std::fs::symlink_metadata(&dest) else {
            continue;
        };
        if meta.file_type().is_symlink() || !meta.is_dir() {
            continue;
        }
        match std::fs::remove_dir_all(&dest) {
            Ok(()) => log::info!("official skin {id:?}: retired, removed from skins/"),
            Err(e) => log::warn!("official skin {id:?}: retire removal failed: {e}"),
        }
    }
}

/// release 构建把已退役的内置默认皮肤（`default`，原内置 React 界面）迁移到
/// 出厂默认 fluent；dev（debug）构建保留 default——内置界面前端开发走
/// `bun dev`，需要能切回去。
fn should_migrate_deprecated_default(active: &str, debug_build: bool) -> bool {
    !debug_build && active == crate::skin::DEFAULT_SKIN_ID
}

/// appearance.json 的 skin 指向退役皮肤 / 已废弃的内置默认皮肤时改指出厂
/// 默认皮肤，迁移体验更连贯。直接文件读写：本函数在主窗口创建前、
/// ConfigStore 装配前执行。
fn remap_retired_active_config(dirs: &AppDirs) {
    let file = dirs.config_file("appearance");
    let Ok(text) = std::fs::read_to_string(&file) else {
        return;
    };
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(&text) else {
        return;
    };
    let Some(active) = value
        .get("skin")
        .and_then(|s| s.as_str())
        .map(str::to_string)
    else {
        return;
    };
    let retired = RETIRED_SKIN_IDS.contains(&active.as_str());
    let deprecated_default =
        should_migrate_deprecated_default(&active, cfg!(debug_assertions));
    if !retired && !deprecated_default {
        return;
    }
    if retired && crate::skin::skins_dir(dirs).join(&active).exists() {
        return; // 开发联接等仍可用，不动
    }
    value["skin"] = serde_json::Value::String(wallpaper_core::config::FACTORY_SKIN_ID.into());
    match serde_json::to_string_pretty(&value) {
        Ok(pretty) => {
            let _ = std::fs::write(&file, pretty);
            log::info!("appearance.skin {active:?} retired, remapped to factory default");
        }
        Err(e) => log::warn!("remap retired appearance.skin failed: {e}"),
    }
}

/// 对单个官方皮肤的同步决策。
#[derive(Debug, PartialEq, Eq)]
enum Plan {
    /// 目标不存在 -> 全新安装。
    Install,
    /// 普通目录且内置版本更新 -> 整目录替换。
    Upgrade,
    /// 联接目录（开发）/ 版本不落后 / 清单读不出 -> 不动。
    Skip,
}

fn install_plan(dest: &Path, bundled_version: &str) -> Plan {
    let Ok(meta) = std::fs::symlink_metadata(dest) else {
        return Plan::Install;
    };
    // junction / symlink 是开发联接：写进去会穿透到源码仓库，绝不能动
    if meta.file_type().is_symlink() || !meta.is_dir() {
        return Plan::Skip;
    }
    let installed = std::fs::read_to_string(dest.join("skin.json"))
        .ok()
        .and_then(|text| {
            serde_json::from_str::<serde_json::Value>(&text)
                .ok()
                .and_then(|m| m.get("version")?.as_str().map(str::to_string))
        })
        .unwrap_or_default();
    if is_newer(bundled_version, &installed) {
        Plan::Upgrade
    } else {
        Plan::Skip
    }
}

/// 点分数字版本：bundled 是否严格新于 installed。缺失段按 0，空串视为
/// 0（清单缺 version 字段）；任一侧含非数字段视为不可比 -> false（宁可
/// 不升级也不误覆盖）。
fn is_newer(bundled: &str, installed: &str) -> bool {
    let parse = |s: &str| -> Option<Vec<u64>> {
        if s.is_empty() {
            return Some(Vec::new());
        }
        s.split('.').map(|p| p.parse::<u64>().ok()).collect()
    };
    let (Some(new), Some(old)) = (parse(bundled), parse(installed)) else {
        return false;
    };
    for i in 0..new.len().max(old.len()) {
        let (a, b) = (
            new.get(i).copied().unwrap_or(0),
            old.get(i).copied().unwrap_or(0),
        );
        if a != b {
            return a > b;
        }
    }
    false
}

/// 内置表的皮肤版本（读嵌入的 skin.json；缺清单 / 缺字段返回空串）。
fn bundled_version(skin: &OfficialSkin) -> String {
    skin.files
        .iter()
        .find(|(path, _)| *path == "skin.json")
        .and_then(|(_, bytes)| serde_json::from_slice::<serde_json::Value>(bytes).ok())
        .and_then(|m| m.get("version")?.as_str().map(str::to_string))
        .unwrap_or_default()
}

/// 写入全部嵌入文件（父目录自动创建；不清理旧文件，Upgrade 路径先
/// remove_dir_all 再调用）。
fn write_files(skin: &OfficialSkin, dest: &Path) -> std::io::Result<()> {
    for (rel, bytes) in skin.files {
        let rel = Path::new(rel);
        assert!(
            rel.is_relative() && !rel.starts_with(".."),
            "official skin file path escapes skin dir: {rel:?}"
        );
        let path = dest.join(rel);
        std::fs::create_dir_all(path.parent().expect("file path has a parent"))?;
        std::fs::write(path, bytes)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn temp_dirs(tag: &str) -> (AppDirs, PathBuf) {
        let root =
            std::env::temp_dir().join(format!("wp4-official-skin-test-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        (AppDirs::new(root.clone()), root)
    }

    /// 构造测试用嵌入皮肤（'static 引用以 Box::leak 换取，量小可接受）。
    fn fake_skin(id: &str, version: &str, extra: &[(&str, &str)]) -> OfficialSkin {
        let leak_str = |s: &str| -> &'static str { Box::leak(s.to_string().into_boxed_str()) };
        let leak_bytes = |s: &str| -> &'static [u8] {
            Box::leak(s.as_bytes().to_vec().into_boxed_slice())
        };
        let mut files: Vec<(&'static str, &'static [u8])> = vec![(
            leak_str("skin.json"),
            leak_bytes(
                &serde_json::json!({
                    "id": id, "name": id, "version": version,
                    "type": "app", "entry": "index.html", "compat": 4
                })
                .to_string(),
            ),
        )];
        files.extend(extra.iter().map(|(p, c)| (leak_str(p), leak_bytes(c))));
        let files: &'static [(&'static str, &'static [u8])] = Box::leak(files.into_boxed_slice());
        OfficialSkin {
            id: leak_str(id),
            files,
        }
    }

    #[test]
    fn version_compare() {
        assert!(is_newer("1.0.1", "1.0.0"));
        assert!(is_newer("1.1.0", "1.0.9"));
        assert!(is_newer("2.0", "1.99.99"));
        assert!(is_newer("1.0.0", ""));
        assert!(!is_newer("1.0.0", "1.0.0"));
        assert!(!is_newer("1.0.0", "1.0.1"));
        // 非数字段不可比，宁可不升级
        assert!(!is_newer("1.0.0", "beta"));
        assert!(!is_newer("", "1.0.0"));
    }

    #[test]
    fn plans_install_upgrade_and_skip() {
        let (dirs, root) = temp_dirs("plan");
        let dest = crate::skin::skins_dir(&dirs).join("sample");

        // 不存在 -> 安装
        assert_eq!(install_plan(&dest, "1.0.0"), Plan::Install);

        // 旧版本 -> 升级
        fs::create_dir_all(&dest).unwrap();
        fs::write(
            dest.join("skin.json"),
            serde_json::json!({ "id": "sample", "version": "0.9.0" }).to_string(),
        )
        .unwrap();
        assert_eq!(install_plan(&dest, "1.0.0"), Plan::Upgrade);

        // 同版本 / 内置无清单 -> 不动
        fs::write(
            dest.join("skin.json"),
            serde_json::json!({ "id": "sample", "version": "1.0.0" }).to_string(),
        )
        .unwrap();
        assert_eq!(install_plan(&dest, "1.0.0"), Plan::Skip);

        // 普通文件（非目录）-> 不动
        let file = crate::skin::skins_dir(&dirs).join("afile");
        fs::write(&file, b"x").unwrap();
        assert_eq!(install_plan(&file, "9.9.9"), Plan::Skip);

        let _ = fs::remove_dir_all(root);
    }

    #[cfg(windows)]
    #[test]
    fn junction_is_never_touched() {
        let (dirs, root) = temp_dirs("junction");
        let skins = crate::skin::skins_dir(&dirs);
        fs::create_dir_all(&skins).unwrap();

        let real = root.join("real-skin-src");
        fs::create_dir_all(&real).unwrap();
        fs::write(
            real.join("skin.json"),
            serde_json::json!({ "id": "dev", "version": "0.1.0" }).to_string(),
        )
        .unwrap();
        let link = skins.join("dev");
        let status = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(&real)
            .status()
            .expect("run mklink");
        assert!(status.success(), "mklink /J failed");

        // 即使内置版本远新于联接目标，也必须跳过（穿透写会毁掉源码仓库）
        assert_eq!(install_plan(&link, "99.0.0"), Plan::Skip);
        // sync 全量跑同样跳过，联接目标内容不变
        sync(&dirs);
        let content = fs::read_to_string(real.join("skin.json")).unwrap();
        assert!(content.contains("0.1.0"));

        let _ = fs::remove_dir_all(root);
    }

    /// 退役皮肤清理：普通目录删除、联接与无关皮肤保留、配置改指出厂默认。
    #[test]
    fn retired_skins_removed_and_config_remapped() {
        let (dirs, root) = temp_dirs("retired");
        let skins = crate::skin::skins_dir(&dirs);
        fs::create_dir_all(&skins).unwrap();

        // 退役皮肤（普通目录）+ 无关皮肤 + （Windows）退役皮肤的联接
        let retired = skins.join("bento");
        fs::create_dir_all(&retired).unwrap();
        fs::write(retired.join("skin.json"), b"{}").unwrap();
        let custom = skins.join("custom");
        fs::create_dir_all(&custom).unwrap();

        #[cfg(windows)]
        let (paper_link, paper_real) = {
            let real = root.join("paper-src");
            fs::create_dir_all(&real).unwrap();
            let link = skins.join("paper");
            let status = std::process::Command::new("cmd")
                .args(["/C", "mklink", "/J"])
                .arg(&link)
                .arg(&real)
                .status()
                .expect("run mklink");
            assert!(status.success(), "mklink /J failed");
            (link, real)
        };

        // 配置指向退役皮肤
        let appearance = dirs.config_file("appearance");
        fs::create_dir_all(appearance.parent().expect("config file has a parent")).unwrap();
        fs::write(
            &appearance,
            serde_json::json!({ "theme": "zinc", "mode": "dark", "skin": "bento" }).to_string(),
        )
        .unwrap();

        remove_retired(&dirs);
        remap_retired_active_config(&dirs);

        assert!(!retired.exists(), "retired skin dir should be removed");
        assert!(custom.exists(), "unrelated skin must stay");
        #[cfg(windows)]
        {
            assert!(paper_link.exists(), "junction must stay");
            assert!(paper_real.exists(), "junction target must stay");
        }
        let skin: serde_json::Value = serde_json::from_str(&fs::read_to_string(&appearance).unwrap())
            .unwrap();
        assert_eq!(skin["skin"], wallpaper_core::config::FACTORY_SKIN_ID);

        // 联接仍在（目录存在）时配置不动
        #[cfg(windows)]
        {
            fs::write(
                &appearance,
                serde_json::json!({ "skin": "paper" }).to_string(),
            )
            .unwrap();
            remap_retired_active_config(&dirs);
            let skin: serde_json::Value =
                serde_json::from_str(&fs::read_to_string(&appearance).unwrap()).unwrap();
            assert_eq!(skin["skin"], "paper");
        }

        let _ = fs::remove_dir_all(root);
    }

    /// 已废弃的内置默认皮肤：release 迁移到出厂默认，debug 保留（内置界面开发）。
    #[test]
    fn deprecated_default_migrated_only_in_release() {
        assert!(should_migrate_deprecated_default("default", false));
        assert!(!should_migrate_deprecated_default("default", true));
        assert!(!should_migrate_deprecated_default("fluent", false));
        assert!(!should_migrate_deprecated_default("custom", false));
    }

    #[test]
    fn sync_installs_then_upgrades() {
        let (dirs, root) = temp_dirs("sync");
        let dest = crate::skin::skins_dir(&dirs).join("sample");

        // 首次安装
        sync_test_with(
            &dirs,
            &[fake_skin(
                "sample",
                "1.0.0",
                &[("index.html", "<p>v1</p>"), ("removed.js", "old()")],
            )],
        );
        assert_eq!(
            fs::read_to_string(dest.join("index.html")).unwrap(),
            "<p>v1</p>"
        );

        // 同版本重跑不产生变化
        let before = fs::read(dest.join("index.html")).unwrap();
        sync_test_with(
            &dirs,
            &[fake_skin(
                "sample",
                "1.0.0",
                &[("index.html", "<p>v1</p>"), ("removed.js", "old()")],
            )],
        );
        assert_eq!(fs::read(dest.join("index.html")).unwrap(), before);

        // 版本升级：整目录替换，v1 有而 v2 没有的文件被清掉
        sync_test_with(
            &dirs,
            &[fake_skin(
                "sample",
                "1.1.0",
                &[("index.html", "<p>v2</p>"), ("assets/a.css", "a{}")],
            )],
        );
        assert_eq!(
            fs::read_to_string(dest.join("assets/a.css")).unwrap(),
            "a{}"
        );
        assert_eq!(
            fs::read_to_string(dest.join("index.html")).unwrap(),
            "<p>v2</p>"
        );
        assert!(!dest.join("removed.js").exists());
        let _ = fs::remove_dir_all(root);
    }

    /// sync 的测试变体：用注入的皮肤表替代编译期嵌入表。
    fn sync_test_with(dirs: &AppDirs, skins: &[OfficialSkin]) {
        for skin in skins {
            let bundled = bundled_version(skin);
            let dest = crate::skin::skins_dir(dirs).join(skin.id);
            match install_plan(&dest, &bundled) {
                Plan::Skip => {}
                Plan::Install => write_files(skin, &dest).unwrap(),
                Plan::Upgrade => {
                    fs::remove_dir_all(&dest).unwrap();
                    write_files(skin, &dest).unwrap();
                }
            }
        }
    }
}
