// 本地发布脚本：把安装包 / 界面热更新包 / 更新清单发布到开发者自己的
// Cloudflare R2 桶（r2.dev 公开访问，直连，无 Worker），供应用的程序更新
// 与界面热更新检查。
//
// 用法（仓库根目录）：
//   bun run scripts/publish.ts release            # 发布正式版（版本号不得带 - 后缀）
//   bun run scripts/publish.ts preview            # 发布预览版（alpha 版本发到 preview 通道）
//   选项：
//     --skip-build     跳过构建，直接使用已有产物（src-tauri/target/.../nsis 与 UI dist）
//     --ui-only        只发布界面热更新包（ui/<通道>.json + ui zip），不动程序通道
//     --with-ui        程序发布的同时更新界面热更新包（默认不发：界面热更新层
//                      生效时会盖住整个皮肤系统，仅在全量换新界面时才用）
//     --sync-preview   正式版发布时同步覆盖预览通道（preview.json + ui/preview.json）
//     --notes "..."    更新说明（写入清单，应用内展示）
//
// 登录：脚本只检测本机 wrangler 登录态；未登录时提示你自己执行
// `bunx wrangler login`（OAuth，凭据保存在本机用户目录），绝不把任何
// CF 凭据写进仓库。也可用 CLOUDFLARE_API_TOKEN 环境变量提供令牌。
//
// 桶名（可选，默认 giantapp-releases，多产品共用一个桶，壁纸的所有对象
// 都在 wallpaper/ 前缀下）：CF_R2_BUCKET 环境变量。
//
// 对外地址：桶的 r2.dev 公开地址（pub-<hash>.r2.dev，首次发布自动开启）。
// r2.dev 有限速且部分网络不可达；桶绑定自定义域名后用 CF_R2_PUBLIC_URL
// 覆盖。清单里的下载地址是绝对 URL，换对外域名只需重新发布清单，客户端
// 「更新服务器地址」（清单 base）不变则无感。
//
// 产物布局（R2 对象 key，正式版 stable.json 与预览版 preview.json 是两个
// 独立清单，严格按通道各自更新，互不影响）：
//   wallpaper/stable.json / wallpaper/preview.json            程序更新清单（version/url/notes/date）
//   wallpaper/dl/<安装包文件名>                                NSIS 安装包
//   wallpaper/ui/stable.json / wallpaper/ui/preview.json      界面热更新清单（按发布通道写入）
//   wallpaper/ui/ui-<version>.zip                             界面热更新包（Fluent 皮肤构建产物，index.html 在根）

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "build", "publish");
// 界面热更新包内容 = Fluent 皮肤构建产物（examples/skin-fluent，app 型完整
// 前端，index.html 在根）。内置界面 dist 不再作为热更新内容——它已随包内置，
// 且经 build.rs 以「巨应3 怀旧」皮肤分发。
const SKIN_DIST_DIR = join(ROOT, "examples", "skin-fluent");
const BUCKET_NAME = process.env.CF_R2_BUCKET || "giantapp-releases";
// 本产品在共用桶里的对象前缀（favape 等其他产品各有自己的前缀，互不干扰）
const PRODUCT_PREFIX = "wallpaper";
// 对外地址覆盖：桶绑定自定义域名后设置（r2.dev 有限速、部分网络不可达）
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
    fail("用法: bun run scripts/publish.ts <release|preview> [--skip-build] [--ui-only] [--sync-preview] [--notes \"...\"]");
  }
  const flags = { skipBuild: false, uiOnly: false, withUi: false, syncPreview: false, notes: "" };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--skip-build") flags.skipBuild = true;
    else if (argv[i] === "--ui-only") flags.uiOnly = true;
    else if (argv[i] === "--with-ui") flags.withUi = true;
    else if (argv[i] === "--sync-preview") flags.syncPreview = true;
    else if (argv[i] === "--notes") flags.notes = argv[++i] ?? "";
    else fail(`未知参数: ${argv[i]}`);
  }
  return { kind, ...flags };
}

// ---- 外部命令封装：命令均为固定字面量，参数走数组，不经 shell 解析 ----

// 固定 wrangler 大版本：bunx 不带版本可能解析到本机缓存的 v1（命令面完全不同）
const WRANGLER_SPEC = "wrangler@4";

/** bunx wrangler@4 <args...>；captureOutput 时返回合并输出而不透传。 */
function wrangler(args, opts = {}) {
  const fullArgs = [WRANGLER_SPEC, ...args];
  console.log(`[publish] $ bunx ${fullArgs.join(" ")}`);
  if (opts.captureOutput) {
    const r = spawnSync("bunx", fullArgs, { encoding: "utf8", cwd: opts.cwd ?? ROOT });
    return { status: r.status ?? 1, output: (r.stdout || "") + (r.stderr || "") };
  }
  const r = spawnSync("bunx", fullArgs, { stdio: "inherit", cwd: opts.cwd ?? ROOT });
  return { status: r.status ?? 1, output: "" };
}

/** bun run build（仓库根目录），继承输出。 */
function runBuild() {
  console.log("[publish] $ bun run build");
  const r = spawnSync("bun", ["run", "build"], { stdio: "inherit", cwd: ROOT });
  return r.status ?? 1;
}

/** bsdtar（Win10+ 系统自带）打 zip，条目使用正斜杠。
 *  必须用 System32 绝对路径字面量：Git Bash 的 GNU tar 会把 `E:\...` 当
 *  远程主机且不支持 zip 格式；SystemRoot 非默认时走 Compress-Archive 兜底。
 *  显式列出 dist 顶层条目（`tar -C dist .` 会产生 `./` 前缀的条目名）。 */
function runTarZip(zipPath, dist) {
  const systemTar = "C:\\Windows\\System32\\tar.exe";
  if (!existsSync(systemTar)) return false;
  const entries = readdirSync(dist);
  console.log(`[publish] $ tar -a -cf ${basename(zipPath)} -C dist ${entries.join(" ")}`);
  const r = spawnSync(systemTar, ["-a", "-cf", zipPath, "-C", dist, ...entries], { stdio: "inherit", cwd: ROOT });
  return (r.status ?? 1) === 0 && existsSync(zipPath);
}

/** Compress-Archive 兜底（旧版 PowerShell 写出的 zip 目录用反斜杠分隔，应用端解压已做归一化）。 */
function runPowerShellZip(zipPath, dist) {
  console.log("[publish] tar 不可用，回退 Compress-Archive…");
  const r = spawnSync("powershell", [
    "-NoProfile", "-Command",
    `Compress-Archive -Path '${dist}\\*' -DestinationPath '${zipPath}' -Force`,
  ], { stdio: "inherit", cwd: ROOT });
  return (r.status ?? 1) === 0 && existsSync(zipPath);
}

async function main() {
  const { kind, skipBuild, uiOnly, syncPreview, notes } = parseArgs(Bun.argv.slice(2));

  const conf = JSON.parse(await Bun.file(join(ROOT, "src-tauri", "tauri.conf.json")).text());
  const version = conf.version;
  const isPrerelease = version.includes("-");
  console.log(`[publish] 版本 ${version}，通道 ${kind}`);

  if (kind === "release" && isPrerelease) {
    fail(`正式版通道不接受带后缀的版本号（${version}）。预览版请用 preview 通道，或先用 release skill 提升版本。`);
  }
  if (kind === "preview" && !isPrerelease) {
    console.warn(`[publish] 警告：版本 ${version} 不带预发布后缀，却发布到 preview 通道（允许，但确认这是有意的）。`);
  }

  // ---- 1. wrangler 登录检测（未登录时引导用户自己登录，脚本不经手凭据）----
  console.log("[publish] 检查 Cloudflare 登录状态…");
  const who = wrangler(["whoami"], { captureOutput: true });
  // 输出帮助文本说明解析到了不认识的 wrangler（老版本缓存 / 不存在）
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
  console.log(`[publish] 对外地址: ${publicUrl}`);

  // ---- 3. 构建（可用 --skip-build 复用上次产物）----
  if (!skipBuild && !uiOnly) {
    console.log("[publish] 构建（前端 + Rust + NSIS，耗时较长）…");
    if (runBuild() !== 0) fail("构建失败");
  }

  // ---- 4. 上传（清单不缓存保证发版即刻可见；大文件允许边缘缓存 1 小时）----
  async function putObject(key, file, contentType, cacheControl) {
    console.log(`[publish] 上传 ${key} <- ${basename(file)}`);
    const r = wrangler(["r2", "object", "put", `${BUCKET_NAME}/${key}`,
      "--file", file, "--remote", "--content-type", contentType, "--cache-control", cacheControl]);
    if (r.status !== 0) fail(`上传失败: ${key}`);
  }

  // 界面热更新包默认不发：界面热更新层生效时会盖住整个皮肤系统（皮肤切换
  // 失效），仅在全量换新界面（--ui-only / --with-ui）时才发布
  let uiManifest: Record<string, unknown> | null = null;
  let uiManifestLine = "界面通道未动（默认；--with-ui 可发布界面热更新包）";
  if (uiOnly || withUi) {
    const dist = SKIN_DIST_DIR;
    if (!existsSync(join(dist, "index.html"))) {
      fail(`找不到 Fluent 皮肤构建产物 ${dist}（examples/skin-fluent 随皮肤源码提交）`);
    }
    mkdirSync(OUT_DIR, { recursive: true });
    const uiZip = join(OUT_DIR, `ui-${version}.zip`);
    rmSync(uiZip, { force: true });
    console.log("[publish] 打包界面热更新 zip…");
    if (!runTarZip(uiZip, dist) && !runPowerShellZip(uiZip, dist)) {
      fail("UI zip 打包失败");
    }
    await putObject(`${PRODUCT_PREFIX}/ui/ui-${version}.zip`, uiZip, "application/zip", "public, max-age=3600");
    // 界面包 URL 带上传时间戳作缓存穿透参数：zip 边缘缓存 1 小时，同版本重发
    // （修内容不发版）时查询串变化即绕开旧缓存，客户端不会拿到上一次的包
    const uiZipUrl = `${publicUrl}/${PRODUCT_PREFIX}/ui/ui-${version}.zip?v=${now.getTime()}`;
    // 严格单通道：只更新所选通道的界面热更新清单，另一通道不受影响
    // （应用「热更新地址留空」时按更新通道拉取：正式版 ui/stable.json、预览版 ui/preview.json）
    uiManifest = {
      version,
      url: uiZipUrl,
      notes,
      date: today,
    };
    const uiChannelJson = join(OUT_DIR, `ui-${kind}.json`);
    writeFileSync(uiChannelJson, JSON.stringify(uiManifest, null, 2));
    await putObject(`${PRODUCT_PREFIX}/ui/${kind}.json`, uiChannelJson, "application/json", "no-cache");
    uiManifestLine = `界面热更新清单（${kind}）   ${publicUrl}/${PRODUCT_PREFIX}/ui/${kind}.json`;
  }

  // ---- 5. 程序更新清单 ----
  if (!uiOnly) {
    const installer = join(ROOT, "src-tauri", "target", "release", "bundle", "nsis",
      `GiantappWallpaper_${version}_x64-setup.exe`);
    if (!existsSync(installer)) {
      fail(`找不到安装包 ${installer}（先构建，或去掉 --skip-build）`);
    }
    await putObject(`${PRODUCT_PREFIX}/dl/${basename(installer)}`, installer, "application/octet-stream", "public, max-age=3600");
    const appManifest = {
      version,
      url: `${publicUrl}/${PRODUCT_PREFIX}/dl/${basename(installer)}`,
      notes,
      date: today,
      prerelease: isPrerelease,
    };
    const channelJson = join(OUT_DIR, `${kind}.json`);
    writeFileSync(channelJson, JSON.stringify(appManifest, null, 2));
    await putObject(`${PRODUCT_PREFIX}/${kind}.json`, channelJson, "application/json", "no-cache");

    // 正式版发布可选择同步预览通道：程序与界面热更新清单一起覆盖，
    // preview 用户（alpha 版）也能收到该正式版
    if (kind === "release" && syncPreview) {
      const previewJson = join(OUT_DIR, "preview.json");
      writeFileSync(previewJson, JSON.stringify(appManifest, null, 2));
      await putObject(`${PRODUCT_PREFIX}/preview.json`, previewJson, "application/json", "no-cache");
      if (uiManifest) {
        const uiPreviewJson = join(OUT_DIR, "ui-preview.json");
        writeFileSync(uiPreviewJson, JSON.stringify(uiManifest, null, 2));
        await putObject(`${PRODUCT_PREFIX}/ui/preview.json`, uiPreviewJson, "application/json", "no-cache");
      }
    }
  }

  // ---- 6. 汇总 ----
  const scope = uiOnly ? "仅界面热更新" : withUi ? "程序更新 + 界面热更新" : "仅程序更新";
  console.log(`
[publish] 完成 ✔（通道：${kind}，范围：${scope}；另一通道不受影响）

  对外地址                 ${publicUrl}
  产品前缀                 ${PRODUCT_PREFIX}
  程序更新清单（${kind}）     ${publicUrl}/${PRODUCT_PREFIX}/${kind}.json${uiOnly ? "（本次未更新）" : ""}
  ${uiManifestLine}

应用侧接入：应用内 设置 → 软件更新，把 ${publicUrl}/${PRODUCT_PREFIX} 填入「更新服务器地址」——
程序更新与界面热更新都会按所选通道自动跟随；打包时内置默认值：
  GIANTAPP_UPDATE_URL=${publicUrl}/${PRODUCT_PREFIX} bun run build

官网 / 壁纸服务端的下载地址：没有固定「最新版」入口了（dl/latest 随 Worker 移除），
由服务端自己拉 ${publicUrl}/${PRODUCT_PREFIX}/stable.json 取 url 做 302，
或直接把下载按钮指向清单内当前版本的安装包地址（发版后需同步更新）。
`);
}

await main();
