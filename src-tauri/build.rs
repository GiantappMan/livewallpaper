use std::fs;
use std::path::{Path, PathBuf};

/// 随安装包分发的官方皮肤（examples/ 下的目录名）。skin-dev / skin-minimal
/// 只是开发示例，不内置分发。
const OFFICIAL_SKIN_DIRS: &[&str] = &[
    "skin-aurora",
    "skin-cupertino",
    "skin-linear",
    "skin-material",
    "skin-paper",
    "skin-term",
];

fn main() {
    tauri_build::build();
    embed_official_skins();
}

/// 把官方皮肤源码嵌入二进制（生成 `$OUT_DIR/official_skins.rs`，由
/// `src/official_skins.rs` include!），启动时解包安装到 skins/ 目录。
fn embed_official_skins() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let examples = manifest_dir.parent().unwrap().join("examples");
    // 目录递归监听：任何皮肤文件变化都重新编译嵌入表
    println!("cargo:rerun-if-changed={}", examples.display());

    let mut skins = Vec::new();
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

/// 递归收集 base 下所有普通文件 -> (相对路径，统一正斜杠, 绝对路径)。
fn collect_files(base: &Path, dir: &Path, out: &mut Vec<(String, PathBuf)>) {
    for entry in fs::read_dir(dir).into_iter().flatten().flatten() {
        let path = entry.path();
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
