// 本地发布脚本：把安装包 / 界面热更新包 / 更新清单发布到开发者自己的
// Cloudflare 渠道（Worker + R2），供应用的程序更新与界面热更新检查。
//
// 用法（仓库根目录）：
//   bun run scripts/publish.ts release            # 发布正式版（版本号不得带 - 后缀）
//   bun run scripts/publish.ts preview            # 发布预览版（alpha 版本发到 preview 通道）
//   选项：
//     --skip-build     跳过构建，直接使用已有产物（src-tauri/target/.../nsis 与 UI dist）
//     --ui-only        只发布界面热更新包（ui.json + ui zip），不动程序通道
//     --sync-preview   正式版发布时同步覆盖 preview.json（预览用户也能收到该正式版）
//     --notes "..."    更新说明（写入清单，应用内展示）
//
// 登录：脚本只检测本机 wrangler 登录态；未登录时提示你自己执行
// `bunx wrangler login`（OAuth，凭据保存在本机用户目录），绝不把任何
// CF 凭据写进仓库。也可用 CLOUDFLARE_API_TOKEN 环境变量提供令牌。
//
// 自定义名称（可选，默认 giantapp-wallpaper-releases）：
//   CF_WORKER_NAME / CF_R2_BUCKET —— 会生成 wrangler.generated.toml（已 gitignore）。
//
// 产物布局（R2 对象 key）：
//   stable.json / preview.json           程序更新清单（version/url/notes/date）
//   dl/<安装包文件名>                     NSIS 安装包
//   ui.json                              界面热更新清单
//   ui/ui-<version>.zip                  界面热更新包（dist 打包，index.html 在根）

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const UI_DIR = join(ROOT, "src", "giantapp-wallpaper-ui");
const CLOUDFLARE_DIR = join(ROOT, "scripts", "cloudflare");
const OUT_DIR = join(ROOT, "build", "publish");
const WORKER_NAME = process.env.CF_WORKER_NAME || "giantapp-wallpaper-releases";
const BUCKET_NAME = process.env.CF_R2_BUCKET || "giantapp-wallpaper-releases";
// Worker 对外地址：默认从 deploy 输出解析 workers.dev 域名；绑定自定义域名后
// 用 CF_WORKER_URL 覆盖（workers.dev 在部分网络环境不可达，见 docs/6.更新与发布.md）
const WORKER_URL_OVERRIDE = process.env.CF_WORKER_URL?.replace(/\/+$/, "");
const WRANGLER_CONFIG = join(CLOUDFLARE_DIR, "wrangler.generated.toml");

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
  const flags = { skipBuild: false, uiOnly: false, syncPreview: false, notes: "" };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--skip-build") flags.skipBuild = true;
    else if (argv[i] === "--ui-only") flags.uiOnly = true;
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

  // ---- 2. 生成 wrangler 配置并部署 Worker（幂等，首次发布即完成安装）----
  writeFileSync(
    WRANGLER_CONFIG,
    `name = "${WORKER_NAME}"\nmain = "worker.js"\ncompatibility_date = "2026-01-01"\nworkers_dev = true\n\n[[r2_buckets]]\nbinding = "BUCKET"\nbucket_name = "${BUCKET_NAME}"\n`,
  );
  console.log(`[publish] 部署 Worker（${WORKER_NAME}）…`);
  const deploy = wrangler(["deploy", "--config", WRANGLER_CONFIG], { cwd: CLOUDFLARE_DIR, captureOutput: true });
  if (deploy.status !== 0) {
    console.error(deploy.output);
    fail("Worker 部署失败");
  }
  const workerUrl = WORKER_URL_OVERRIDE
    || deploy.output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/)?.[0];
  if (!workerUrl) {
    console.error(deploy.output);
    fail("未能从 deploy 输出解析 workers.dev 域名（绑定自定义域名后可用 CF_WORKER_URL 环境变量指定）");
  }
  console.log(`[publish] Worker 地址: ${workerUrl}`);

  // ---- 3. 确保 R2 桶存在（已存在时报错可忽略）----
  const createBucket = wrangler(["r2", "bucket", "create", BUCKET_NAME], { captureOutput: true });
  if (createBucket.status !== 0 && !/already exists/i.test(createBucket.output)) {
    console.error(createBucket.output);
    fail(`R2 桶创建失败（${BUCKET_NAME}）。若你的账号尚未开通 R2，请先到 Cloudflare 控制台开通。`);
  }

  // ---- 4. 构建（可用 --skip-build 复用上次产物）----
  if (!skipBuild && !uiOnly) {
    console.log("[publish] 构建（前端 + Rust + NSIS，耗时较长）…");
    if (runBuild() !== 0) fail("构建失败");
  }

  // ---- 5. 打包 UI 热更新 zip（dist -> ui-<version>.zip，index.html 在根）----
  const dist = join(UI_DIR, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    fail(`找不到前端构建产物 ${dist}（先运行 bun run build，或去掉 --skip-build）`);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const uiZip = join(OUT_DIR, `ui-${version}.zip`);
  rmSync(uiZip, { force: true });
  console.log("[publish] 打包界面热更新 zip…");
  if (!runTarZip(uiZip, dist) && !runPowerShellZip(uiZip, dist)) {
    fail("UI zip 打包失败");
  }

  // ---- 6. 上传 ----
  async function putObject(key, file, contentType) {
    console.log(`[publish] 上传 ${key} <- ${basename(file)}`);
    const r = wrangler(["r2", "object", "put", `${BUCKET_NAME}/${key}`,
      "--file", file, "--remote", "--content-type", contentType]);
    if (r.status !== 0) fail(`上传失败: ${key}`);
  }

  await putObject(`ui/ui-${version}.zip`, uiZip, "application/zip");
  const uiManifest = {
    version,
    url: `${workerUrl}/ui/ui-${version}.zip`,
    notes,
    date: today,
  };
  const uiJson = join(OUT_DIR, "ui.json");
  writeFileSync(uiJson, JSON.stringify(uiManifest, null, 2));
  await putObject("ui.json", uiJson, "application/json");

  if (!uiOnly) {
    const installer = join(ROOT, "src-tauri", "target", "release", "bundle", "nsis",
      `GiantappWallpaper_${version}_x64-setup.exe`);
    if (!existsSync(installer)) {
      fail(`找不到安装包 ${installer}（先构建，或去掉 --skip-build）`);
    }
    await putObject(`dl/${basename(installer)}`, installer, "application/octet-stream");
    const appManifest = {
      version,
      url: `${workerUrl}/dl/${basename(installer)}`,
      notes,
      date: today,
      prerelease: isPrerelease,
    };
    const channelJson = join(OUT_DIR, `${kind}.json`);
    writeFileSync(channelJson, JSON.stringify(appManifest, null, 2));
    await putObject(`${kind}.json`, channelJson, "application/json");

    // 正式版发布可选择同步预览通道：preview 用户（alpha 版）也能收到该正式版
    if (kind === "release" && syncPreview) {
      const previewJson = join(OUT_DIR, "preview.json");
      writeFileSync(previewJson, JSON.stringify(appManifest, null, 2));
      await putObject("preview.json", previewJson, "application/json");
    }
  }

  // ---- 7. 汇总 ----
  console.log(`
[publish] 完成 ✔

  Worker 地址      ${workerUrl}
  界面热更新清单    ${workerUrl}/ui.json
  程序更新清单      ${workerUrl}/stable.json  /  ${workerUrl}/preview.json

应用侧接入（二选一）：
  1) 应用内 设置 → 软件更新，把上面的地址填入「热更新地址 / 更新服务器地址」；
  2) 打包时内置默认值：
       GIANTAPP_UI_UPDATE_URL=${workerUrl}/ui.json
       GIANTAPP_UPDATE_URL=${workerUrl}
     例：GIANTAPP_UPDATE_URL=${workerUrl} GIANTAPP_UI_UPDATE_URL=${workerUrl}/ui.json bun run build
`);
}

await main();
