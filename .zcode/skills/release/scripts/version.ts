// Release 版本号工具（release skill 专用）：
//   bun run .zcode/skills/release/scripts/version.ts current
//   bun run .zcode/skills/release/scripts/version.ts next <release|preview> [预览后缀，默认 beta]
//   bun run .zcode/skills/release/scripts/version.ts apply <version>
//   bun run .zcode/skills/release/scripts/version.ts store
//
// 尾号自动+1 规则（与 4.x 一致）：
//   当前 3.1.0        正式版 -> 3.1.1
//   当前 3.1.0        预览版 -> 3.1.1-beta1
//   当前 3.1.0-beta1  预览版 -> 3.1.0-beta2（预览序号 +1）
//   当前 3.1.0-beta1  正式版 -> 3.1.0（版本段在预览线开始时已 +1，正式版只去后缀）
// 兼容点分预发布号（3.1.0-beta.1），输出统一用 csproj 现状的紧凑写法（beta1）。
//
// 版本号写在两处，apply 同步修改，避免手改漏改：
//   src/giantapp-wallpaper-client/Client/Client.csproj      <Version>3.1.0-beta1</Version>
//     （安装包 exe 文件版本 + Inno Setup 安装包名，均由此派生）
//   src/giantapp-wallpaper-client/Client.App/Package.appxmanifest
//     <Identity Version="3.1.0.0" />（微软商店包版本，只能是数值四段，
//     apply 用无后缀版本自动推导；同版本重新提交商店时第四段需 +1，
//     若清单里已是同版本且第四段 >0 则保留，避免重置导致商店拒绝提交）

import { join } from "node:path";

// .zcode/skills/release/scripts -> 项目根（scripts/release/skills/.zcode 共 4 级）
const ROOT = join(import.meta.dir, "..", "..", "..", "..");

const ClientCsproj = join(ROOT, "src", "giantapp-wallpaper-client", "Client", "Client.csproj");
const AppxManifest = join(ROOT, "src", "giantapp-wallpaper-client", "Client.App", "Package.appxmanifest");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?$/;
// 预发布段：beta1 / beta.1 两种写法都认
const PRERELEASE = /^([A-Za-z]+)[.-]?(\d+)$/;

async function currentVersion(): Promise<string> {
  const csproj = await Bun.file(ClientCsproj).text();
  const m = csproj.match(/<Version>([^<]+)<\/Version>/);
  if (!m) throw new Error("Client.csproj 未匹配到 <Version> 元素");
  return m[1].trim();
}

async function storeVersion(): Promise<string> {
  const manifest = await Bun.file(AppxManifest).text();
  const m = manifest.match(/<Identity[^>]*?Version="([^"]+)"/s);
  if (!m) throw new Error("Package.appxmanifest 未匹配到 Identity Version");
  return m[1];
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
    const pm = pre.match(PRERELEASE);
    if (pm) return `${base}-${pm[1]}${Number(pm[2]) + 1}`;
  }
  return `${bumpTail(base)}-${label}1`;
}

async function applyVersion(v: string): Promise<void> {
  if (!v || !SEMVER.test(v)) throw new Error(`无法识别的版本格式: ${v}`);
  const base = v.match(SEMVER)![1] + "." + v.match(SEMVER)![2] + "." + v.match(SEMVER)![3];

  const csproj = await Bun.file(ClientCsproj).text();
  if (!/<Version>/.test(csproj)) throw new Error("Client.csproj 未匹配到 <Version> 元素");
  await Bun.write(ClientCsproj, csproj.replace(/<Version>[^<]*<\/Version>/, `<Version>${v}</Version>`));

  // 商店包版本：数值四段，由无后缀版本推导；同版本重提时保留已有第四段
  const oldStore = await storeVersion();
  const oldParts = oldStore.split(".");
  const sameBase = oldParts.length === 4 && oldParts.slice(0, 3).join(".") === base;
  const store = sameBase ? oldStore : `${base}.0`;

  const manifest = await Bun.file(AppxManifest).text();
  if (!manifest.match(/<Identity[^>]*?Version="/s)) throw new Error("Package.appxmanifest 未匹配到 Identity Version");
  await Bun.write(
    AppxManifest,
    manifest.replace(/(<Identity[^>]*?Version=")([^"]+)(")/s, `$1${store}$3`),
  );
  console.log(`商店包版本: ${store}${sameBase ? "（同版本重提，保留第四段）" : ""}`);
}

const [cmd, arg, label = "beta"] = process.argv.slice(2);
try {
  if (cmd === "current") {
    console.log(await currentVersion());
  } else if (cmd === "store") {
    console.log(await storeVersion());
  } else if (cmd === "next") {
    if (arg !== "release" && arg !== "preview") throw new Error("用法: next <release|preview> [预览后缀]");
    console.log(nextVersion(await currentVersion(), arg, label));
  } else if (cmd === "apply") {
    await applyVersion(arg ?? "");
    console.log(`版本号已写入 ${arg}: Client.csproj / Package.appxmanifest`);
  } else {
    console.error("用法: bun run version.ts <current | store | next <release|preview> [label] | apply <version>>");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
