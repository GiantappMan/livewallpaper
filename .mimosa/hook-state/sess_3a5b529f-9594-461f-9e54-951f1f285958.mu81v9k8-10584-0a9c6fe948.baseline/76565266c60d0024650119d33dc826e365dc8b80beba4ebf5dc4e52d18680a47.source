// Release 版本号工具（release skill 专用）：
//   bun run .zcode/skills/release/scripts/version.ts current
//   bun run .zcode/skills/release/scripts/version.ts next <release|preview> [预览后缀，默认 alpha]
//   bun run .zcode/skills/release/scripts/version.ts apply <version>
//
// 尾号自动+1 规则：
//   当前 4.0.0         正式版 -> 4.0.1
//   当前 4.0.0         预览版 -> 4.0.1-alpha.1
//   当前 4.0.1-alpha.3 预览版 -> 4.0.1-alpha.4（预览序号 +1）
//   当前 4.0.1-alpha.3 正式版 -> 4.0.1（版本段在预览线开始时已 +1，正式版只去后缀）
//
// 版本号写在三处，apply 同步修改，避免手改漏改：
//   src-tauri/tauri.conf.json / src-tauri/Cargo.toml / src/giantapp-wallpaper-ui/package.json

import { join } from "node:path";

// .zcode/skills/release/scripts -> 项目根（scripts/release/skills/.zcode 共 4 级）
const ROOT = join(import.meta.dir, "..", "..", "..", "..");

const TauriConf = join(ROOT, "src-tauri", "tauri.conf.json");
const CargoToml = join(ROOT, "src-tauri", "Cargo.toml");
const UiPackageJson = join(ROOT, "src", "giantapp-wallpaper-ui", "package.json");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?$/;

async function currentVersion(): Promise<string> {
  const conf = JSON.parse(await Bun.file(TauriConf).text());
  if (typeof conf.version !== "string") throw new Error("tauri.conf.json 缺少 version 字段");
  return conf.version;
}

function bumpTail(base: string): string {
  const [maj, min, pat] = base.split(".");
  return `${maj}.${min}.${Number(pat) + 1}`;
}

function nextVersion(current: string, kind: "release" | "preview", label: string): string {
  const m = current.match(SEMVER);
  if (!m) throw new Error(`无法识别的版本格式: ${current}`);
  const base = `${m[1]}.${m[2]}.${m[3]}`;
  const pre = m[4];
  if (kind === "release") return pre ? base : bumpTail(base);
  if (pre) {
    const pm = pre.match(/^([A-Za-z]+)\.(\d+)$/);
    if (pm) return `${base}-${pm[1]}.${Number(pm[2]) + 1}`;
  }
  return `${bumpTail(base)}-${label}.1`;
}

async function applyVersion(v: string): Promise<void> {
  if (!v || !SEMVER.test(v)) throw new Error(`无法识别的版本格式: ${v}`);

  const conf = await Bun.file(TauriConf).text();
  if (!/"version"\s*:\s*"/.test(conf)) throw new Error('tauri.conf.json 未匹配到 "version" 键');
  await Bun.write(TauriConf, conf.replace(/"version"\s*:\s*"[^"]*"/, `"version": "${v}"`));

  const cargo = await Bun.file(CargoToml).text();
  if (!/^version\s*=\s*"/m.test(cargo)) throw new Error("Cargo.toml 未匹配到 version 键");
  await Bun.write(CargoToml, cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${v}"`));

  const ui = await Bun.file(UiPackageJson).text();
  if (!/"version"\s*:\s*"/.test(ui)) throw new Error('package.json 未匹配到 "version" 键');
  await Bun.write(UiPackageJson, ui.replace(/"version"\s*:\s*"[^"]*"/, `"version": "${v}"`));
}

const [cmd, arg, label = "alpha"] = process.argv.slice(2);
try {
  if (cmd === "current") {
    console.log(await currentVersion());
  } else if (cmd === "next") {
    if (arg !== "release" && arg !== "preview") throw new Error("用法: next <release|preview> [预览后缀]");
    console.log(nextVersion(await currentVersion(), arg, label));
  } else if (cmd === "apply") {
    await applyVersion(arg ?? "");
    console.log(`版本号已写入 ${arg}: tauri.conf.json / Cargo.toml / ui package.json`);
  } else {
    console.error("用法: bun run version.ts <current | next <release|preview> [label] | apply <version>>");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
