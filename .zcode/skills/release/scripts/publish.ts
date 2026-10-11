// 本地发布脚本（安装包渠道）：把 Inno Setup 安装包 + 程序更新清单发布到
// 共用的 Cloudflare R2 桶（releases.giantapp.cc，直连桶，无 Worker），供
// 普通安装包用户的更新检测使用（清单格式与 4.x 完全一致：version/url/
// notes/date/prerelease）。
//
// 微软商店渠道不走本脚本：商店版本的更新由微软商店检测分发，不发布
// 下载清单、不引导下载（见 SKILL.md 的渠道规则）。
//
// 用法（仓库根目录，先打包好安装包）：
//   bun run .zcode/skills/release/scripts/publish.ts release   --notes "更新说明"
//   bun run .zcode/skills/release/scripts/publish.ts preview   --notes "更新说明"
//   选项：
//     --sync-preview   正式版发布时同步覆盖预览通道（preview.json）
//     --notes "..."    更新说明（写入清单）
//
// 登录：脚本只检测本机 wrangler 登录态；未登录时提示你自己执行
// `bunx wrangler@4 login`（OAuth，凭据保存在本机用户目录），绝不把任何
// CF 凭据写进仓库。也可用 CLOUDFLARE_API_TOKEN 环境变量提供令牌。
//
// 桶名（可选，默认 giantapp-releases，多产品共用：4.x 在 wallpaper/ 前缀、
// 收藏猿在 favape/，本产品 v3 固定用 wallpaper3/ 前缀）：CF_R2_BUCKET 环境变量。
// 对外地址覆盖：CF_R2_PUBLIC_URL（当前值 https://releases.giantapp.cc，
// 桶上绑定的自定义域；不设则用 r2.dev 地址，有限速且部分网络不可达）。
//
// 产物布局（R2 对象 key）：
//   wallpaper3/stable.json / wallpaper3/preview.json   程序更新清单（只写所选通道）
//   wallpaper3/dl/<安装包文件名>                        Inno Setup 安装包

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..", "..");
const DIST_DIR = join(ROOT, "src", "build", "dist");
const BUCKET_NAME = process.env.CF_R2_BUCKET || "giantapp-releases";
// 本产品在共用桶里的对象前缀（与 4.x 的 wallpaper/、收藏猿的 favape/ 并列）
const PRODUCT_PREFIX = "wallpaper3";
const PUBLIC_URL_OVERRIDE = process.env.CF_R2_PUBLIC_URL?.replace(/\/+$/, "");

const now = new Date();
const today = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

function fail(message) {
  console.error(`[publish] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const kind = argv[0];
  if (kind !== "release" && kind !== "preview") {
    fail('用法: bun run .zcode/skills/release/scripts/publish.ts <release|preview> [--sync-preview] --notes "..."');
  }
  const flags = { syncPreview: false, notes: "" };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--sync-preview") flags.syncPreview = true;
    else if (argv[i] === "--notes") flags.notes = argv[++i] ?? "";
    else fail(`未知参数: ${argv[i]}`);
  }
  return { kind, ...flags };
}

// 清单里的下载地址只允许公网 http/https：拒绝 localhost、环回、私有与保留地址
function assertPublicHttpUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    fail(`非法 URL: ${url}`);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") fail(`仅允许 http/https: ${url}`);
  // IPv6 字面量的 hostname 带方括号（[::1]），先剥掉再判断
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    fail(`禁止私有地址: ${url}`);
  }
  if (host.includes(":")) {
    // IPv6 仅放行全球单播（2000::/3），环回/ULA/链路本地/未指定一律拒绝
    if (!(host.startsWith("2") || host.startsWith("3"))) fail(`禁止环回/私有地址: ${url}`);
  }
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    const blocked =
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (v4[3] === "2" || v4[3] === "0")) ||
      (a === 198 && b === 51 && v4[3] === "100") ||
      (a === 203 && b === 0 && v4[3] === "113") ||
      a >= 224;
    if (blocked) fail(`禁止环回/私有/保留地址: ${url}`);
  }
}

// ---- 外部命令封装：命令均为固定字面量，参数走数组，不经 shell 解析 ----

// 固定 wrangler 大版本：bunx 不带版本可能解析到本机缓存的 v1（命令面完全不同）
const WRANGLER_SPEC = "wrangler@4";

function wrangler(args, opts = {}) {
  const fullArgs = [WRANGLER_SPEC, ...args];
  console.log(`[publish] $ bunx ${fullArgs.join(" ")}`);
  if (opts.captureOutput) {
    const r = spawnSync("bunx", fullArgs, { encoding: "utf8", cwd: ROOT });
    return { status: r.status ?? 1, output: (r.stdout || "") + (r.stderr || "") };
  }
  const r = spawnSync("bunx", fullArgs, { stdio: "inherit", cwd: ROOT });
  return { status: r.status ?? 1, output: "" };
}

function findInstaller() {
  if (!existsSync(DIST_DIR)) fail(`找不到打包输出目录 ${DIST_DIR}（先用 src/build/compile.ps1 打包）`);
  const candidates = readdirSync(DIST_DIR)
    .filter((f) => /^LiveWallpaper_Installer_v.*\.exe$/i.test(f))
    .map((f) => join(DIST_DIR, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (candidates.length === 0) fail(`在 ${DIST_DIR} 找不到 LiveWallpaper_Installer_v*.exe（先打包）`);
  return candidates[0];
}

async function main() {
  const { kind, syncPreview, notes } = parseArgs(Bun.argv.slice(2));

  const csproj = await Bun.file(join(ROOT, "src", "giantapp-wallpaper-client", "Client", "Client.csproj")).text();
  const version = csproj.match(/<Version>([^<]+)<\/Version>/)?.[1]?.trim();
  if (!version) fail("Client.csproj 未匹配到 <Version>，请先确认版本号已提升");
  const isPrerelease = version.includes("-");
  console.log(`[publish] 版本 ${version}，通道 ${kind}`);

  if (kind === "release" && isPrerelease) {
    fail(`正式版通道不接受带后缀的版本号（${version}）。预览版请用 preview 通道，或先用 release skill 提升版本。`);
  }
  if (kind === "preview" && !isPrerelease) {
    console.warn(`[publish] 警告：版本 ${version} 不带预发布后缀，却发布到 preview 通道（允许，但确认这是有意的）。`);
  }

  // 对外地址覆盖先校验（在触碰任何外部服务之前）
  if (PUBLIC_URL_OVERRIDE) assertPublicHttpUrl(PUBLIC_URL_OVERRIDE);

  // ---- 1. wrangler 登录检测（未登录时引导用户自己登录，脚本不经手凭据）----
  console.log("[publish] 检查 Cloudflare 登录状态…");
  const who = wrangler(["whoami"], { captureOutput: true });
  const wranglerBroken = /Commands:|Usage:/i.test(who.output);
  if (wranglerBroken || who.status !== 0 || /not authenticated/i.test(who.output)) {
    console.error(`
[publish] 无法使用 wrangler（${wranglerBroken ? "解析到了不兼容的版本" : "未登录或不可用"}）。请在本机自行处理：

    bunx ${WRANGLER_SPEC} login

（浏览器完成 OAuth 授权，凭据保存在本机用户目录，不会写入仓库。）
也可以改用环境变量提供 API 令牌：set CLOUDFLARE_API_TOKEN=<your-token>
`);
    process.exit(1);
  }

  // ---- 2. 确保 R2 桶存在并开启 r2.dev 公开访问（幂等）----
  const createBucket = wrangler(["r2", "bucket", "create", BUCKET_NAME], { captureOutput: true });
  if (createBucket.status !== 0 && !/already exists/i.test(createBucket.output)) {
    console.error(createBucket.output);
    fail(`R2 桶创建失败（${BUCKET_NAME}）。若你的账号尚未开通 R2，请先到 Cloudflare 控制台开通。`);
  }

  let publicUrl = PUBLIC_URL_OVERRIDE;
  if (!publicUrl) {
    console.log("[publish] 检查桶的 r2.dev 公开访问…");
    const devUrl = wrangler(["r2", "bucket", "dev-url", "get", BUCKET_NAME], { captureOutput: true });
    if (devUrl.status !== 0) {
      console.error(devUrl.output);
      fail("查询 r2.dev 公开访问状态失败");
    }
    if (/disabled/i.test(devUrl.output)) {
      console.log("[publish] 开启公开访问（桶内容将经 r2.dev 对外只读）…");
      const enable = wrangler(["r2", "bucket", "dev-url", "enable", BUCKET_NAME], { captureOutput: true });
      if (enable.status !== 0) {
        console.error(enable.output);
        fail("开启 r2.dev 公开访问失败");
      }
      publicUrl = enable.output.match(/https:\/\/pub-[0-9a-f]+\.r2\.dev/)?.[0];
    } else {
      publicUrl = devUrl.output.match(/https:\/\/pub-[0-9a-f]+\.r2\.dev/)?.[0];
    }
    if (!publicUrl) {
      fail(`未能解析 ${BUCKET_NAME} 的 r2.dev 公开地址（到 Cloudflare 控制台查看，或绑定自定义域名后用 CF_R2_PUBLIC_URL 指定）`);
    }
  }
  assertPublicHttpUrl(publicUrl);
  console.log(`[publish] 对外地址: ${publicUrl}`);

  // ---- 3. 上传安装包 + 通道清单（清单不缓存保证发版即刻可见；安装包缓存 1 小时）----
  const installer = findInstaller();
  console.log(`[publish] 安装包: ${basename(installer)}`);

  async function putObject(key, file, contentType, cacheControl) {
    console.log(`[publish] 上传 ${key} <- ${basename(file)}`);
    const r = wrangler(["r2", "object", "put", `${BUCKET_NAME}/${key}`,
      "--file", file, "--remote", "--content-type", contentType, "--cache-control", cacheControl]);
    if (r.status !== 0) fail(`上传失败: ${key}`);
  }

  await putObject(`${PRODUCT_PREFIX}/dl/${basename(installer)}`, installer, "application/octet-stream", "public, max-age=3600");

  const manifest = {
    version,
    url: `${publicUrl}/${PRODUCT_PREFIX}/dl/${basename(installer)}`,
    notes,
    date: today,
    prerelease: isPrerelease,
  };
  assertPublicHttpUrl(manifest.url);

  writeFileSync(join(DIST_DIR, `${kind}.json`), JSON.stringify(manifest, null, 2));
  await putObject(`${PRODUCT_PREFIX}/${kind}.json`, join(DIST_DIR, `${kind}.json`), "application/json", "no-cache");

  if (kind === "release" && syncPreview) {
    writeFileSync(join(DIST_DIR, "preview.json"), JSON.stringify(manifest, null, 2));
    await putObject(`${PRODUCT_PREFIX}/preview.json`, join(DIST_DIR, "preview.json"), "application/json", "no-cache");
  }

  // ---- 4. 汇总 ----
  console.log(`
[publish] 完成 ✔（通道：${kind}；另一通道不受影响）

  对外地址               ${publicUrl}
  产品前缀               ${PRODUCT_PREFIX}
  更新清单（${kind}）       ${publicUrl}/${PRODUCT_PREFIX}/${kind}.json
  安装包下载             ${manifest.url}

客户端接入：更新检测地址填 ${publicUrl}/${PRODUCT_PREFIX}
（客户端拉 <地址>/<通道>.json 比较版本，发现新版本引导下载安装包。）
微软商店版不走此清单：商店版的更新由微软商店检测分发，不引导下载。
官网/服务端下载地址：拉 ${publicUrl}/${PRODUCT_PREFIX}/stable.json 取 url 做 302，
或直接指向清单内的版本化安装包地址（发版后需同步更新）。
`);
}

await main();
