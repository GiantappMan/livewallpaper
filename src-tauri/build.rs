use std::fs;
use std::path::{Path, PathBuf};

/// 随安装包分发的官方皮肤（examples/ 下的目录名）。当前只内置分发 Win11
/// Fluent 皮肤（出厂默认生效）；其余官方风格皮肤归档在 examples/archive/
/// 下，不再随包分发。skin-dev / skin-minimal 只是开发示例，不内置分发。
const OFFICIAL_SKIN_DIRS: &[&str] = &["skin-fluent"];

fn main() {
    tauri_build::build();
    let mut skins = Vec::new();
    embed_official_skins(&mut skins);
    embed_builtin_ui_skin(&mut skins);
    let code = format!(
        "// build.rs 自动生成：官方皮肤嵌入表，勿手改。\npub static OFFICIAL_SKINS: &[OfficialSkin] = &[\n    {}\n];\n",
        skins.join("\n    ")
    );
    fs::write(
        PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("official_skins.rs"),
        code,
    )
    .unwrap();
}

/// 把 examples/ 下的官方皮肤源码嵌入嵌入表（由 `src/official_skins.rs`
/// include!），启动时解包安装到 skins/ 目录。
fn embed_official_skins(skins: &mut Vec<String>) {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let examples = manifest_dir.parent().unwrap().join("examples");
    // 目录递归监听：任何皮肤文件变化都重新编译嵌入表
    println!("cargo:rerun-if-changed={}", examples.display());

    for name in OFFICIAL_SKIN_DIRS {
        let dir = examples.join(name);
        let Ok(text) = fs::read_to_string(dir.join("skin.json")) else {
            println!("cargo:warning=official skin missing or unreadable: {name}");
            continue;
        };
        let id = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|m| m.get("id")?.as_str().map(str::to_string));
        let Some(id) = id else {
            println!("cargo:warning=official skin manifest has no id: {name}");
            continue;
        };
        let mut files = Vec::new();
        collect_files(&dir, &dir, &mut files);
        files.sort();
        let arms = files
            .iter()
            .map(|(rel, abs)| format!("({rel:?}, include_bytes!({abs:?})),"))
            .collect::<Vec<_>>()
            .join("\n            ");
        skins.push(format!(
            "OfficialSkin {{ id: {id:?}, files: &[\n            {arms}\n        ] }},"
        ));
    }
}

/// 内置界面 dist 以「巨应3 怀旧」app 型皮肤一并嵌入（v3 经典界面退役为
/// 可选皮肤，仍随安装包分发）。dist 由 tauri build 的 beforeBuildCommand
/// 先行构建；缺失（纯 cargo check / test 且未构建前端）时跳过该皮肤。
fn embed_builtin_ui_skin(skins: &mut Vec<String>) {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let dist = manifest_dir
        .parent()
        .unwrap()
        .join("src/giantapp-wallpaper-ui/dist");
    println!("cargo:rerun-if-changed={}", dist.display());
    if !dist.join("index.html").is_file() {
        println!(
            "cargo:warning=builtin UI dist not built, skipping giantapp3 nostalgia skin \
             (build it with: bun --cwd src/giantapp-wallpaper-ui build)"
        );
        return;
    }
    let version = std::env::var("CARGO_PKG_VERSION").unwrap();
    let skin_json = format!(
        r#"{{"id":"giantapp3","name":"巨应3 怀旧","version":"{version}","author":"GiantappMan","description":"巨应壁纸 3 经典界面","type":"app","entry":"index.html","compat":4}}"#
    );
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let skin_json_file = out_dir.join("giantapp3-skin.json");
    fs::write(&skin_json_file, skin_json).unwrap();

    let mut files = Vec::new();
    collect_files(&dist, &dist, &mut files);
    files.sort();
    let mut arms = files
        .iter()
        .map(|(rel, abs)| format!("({rel:?}, include_bytes!({abs:?})),"))
        .collect::<Vec<_>>();
    arms.push(format!(
        r#"("skin.json", include_bytes!({:?})),"#,
        skin_json_file
    ));
    let arms = arms.join("\n            ");
    skins.push(format!(
        "OfficialSkin {{ id: \"giantapp3\", files: &[\n            {arms}\n        ] }},"
    ));
}

/// 递归收集 base 下所有普通文件 -> (相对路径，统一正斜杠, 绝对路径)。
/// 点开头的文件 / 目录（`.mimosa` 等 AI 工具本地状态、`.DS_Store`）不入嵌入表。
fn collect_files(base: &Path, dir: &Path, out: &mut Vec<(String, PathBuf)>) {
    for entry in fs::read_dir(dir).into_iter().flatten().flatten() {
        let path = entry.path();
        if path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.starts_with('.'))
            .unwrap_or(false)
        {
            continue;
        }
        if path.is_dir() {
            collect_files(base, &path, out);
        } else if path.is_file() {
            let rel = path
                .strip_prefix(base)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            out.push((rel, path));
        }
    }
}
