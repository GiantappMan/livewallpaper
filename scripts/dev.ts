// 一键启动调试（对标 4.x 根目录 bun dev）：
//   bun dev              前端 dev server（动态端口）+ 调试版客户端
//   bun dev --web        只起前端（前端迭代时用）
//   bun dev --app        只构建并启动客户端（前端已在别处跑着时用）
//
// 流程：补齐 mpv（download-mpv.ps1）→ 安装前端依赖（如缺）→ next dev（动态端口）
// → dotnet build Debug → 启动 LiveWallpaper3.exe。
// 端口优先复用上次记录（保持稳定），被占用才向系统申请新空闲值，避免与其他项目
// 冲突；本次端口写回 exe 同目录 dev-server.json（{port, pid}）作为最近使用记录，
// 客户端 DEBUG_LOCAL 构建启动时读它决定加载地址，文件缺失/失效回退 3100
// （见 AppService.DetectDevServerPort）。UI 目录单独 pnpm dev 固定 3100，
// 同样能被回退命中。
// Ctrl+C 停止 dev server；壁纸应用是托盘程序，由用户自行退出。
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createServer } from "node:net";

const ROOT = join(import.meta.dir, "..");
const UI_DIR = join(ROOT, "src", "giantapp-wallpaper-ui-3_0");
const MPV_EXE = join(ROOT, "src", "giantapp-wallpaper-client", "WallpaperCore", "Assets", "Players", "Mpv", "mpv.exe");
const DOWNLOAD_MPV_PS1 = join(ROOT, "src", "build", "download-mpv.ps1");
const CLIENT_CSPROJ = join(ROOT, "src", "giantapp-wallpaper-client", "Client", "Client.csproj");
// 输出在 bin/x64/Debug/net462；必须与安装包发布配置同为 x64——
// 32 位首选进程加载 x64 的 WebView2Loader.dll 会在启动时报入口点错误
const APP_EXE = join(ROOT, "src", "giantapp-wallpaper-client", "Client", "bin", "x64", "Debug", "net462", "LiveWallpaper3.exe");
// 握手文件：告诉客户端 dev server 的实际端口（exe 同目录，客户端按 AppContext.BaseDirectory 读取）
const DEV_PORT_FILE = join(dirname(APP_EXE), "dev-server.json");

const flags = process.argv.slice(2);
const onlyWeb = flags.includes("--web");
const onlyApp = flags.includes("--app");

// 固定命令字面量 + 常量路径参数，不经 shell 解析
function runPowershellScript(scriptPath: string): Promise<void> {
  console.log(`[dev] $ powershell -File ${scriptPath}`);
  const child = spawn("powershell", ["-ExecutionPolicy", "Bypass", "-File", scriptPath], { stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`powershell 退出码 ${code}`))));
    child.on("error", reject);
  });
}

function runBunInstall(cwd: string): Promise<void> {
  console.log("[dev] $ bun install");
  const child = spawn("bun", ["install"], { cwd, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`bun install 退出码 ${code}`))));
    child.on("error", reject);
  });
}

function runDotnetBuild(csproj: string): Promise<void> {
  console.log(`[dev] $ dotnet build ${csproj} -c Debug -p:Platform=x64`);
  const child = spawn("dotnet", ["build", csproj, "-c", "Debug", "-p:Platform=x64", "--nologo", "-v", "q"], { stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`dotnet build 退出码 ${code}`))));
    child.on("error", reject);
  });
}

// 测试端口当前是否空闲（试听后立即释放）
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

// 向系统申请一个空闲端口（OS 分配保证当下没人占用，避免固定端口与其他项目冲突）
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => (port > 0 ? resolve(port) : reject(new Error("系统未返回可用端口"))));
    });
  });
}

// 端口选择：优先复用上次记录的端口（URL 稳定，调试工具/收藏不失效），被占用才换新空闲端口
async function pickDevPort(): Promise<number> {
  let last = 0;
  try {
    const info = JSON.parse(await Bun.file(DEV_PORT_FILE).text());
    if (typeof info?.port === "number" && info.port >= 1 && info.port <= 65535) last = info.port;
  } catch { /* 首次运行或文件损坏，走新分配 */ }
  if (last && (await isPortFree(last))) return last;
  return findFreePort();
}

// 把本次端口写回握手文件，同时就是"最近使用端口"记录；pid 供客户端识别陈旧文件
async function writeDevPortFile(port: number) {
  mkdirSync(dirname(DEV_PORT_FILE), { recursive: true });
  await Bun.write(DEV_PORT_FILE, JSON.stringify({ port, pid: process.pid }));
}

let web: ChildProcess | undefined;

function stopWeb() {
  if (web && web.exitCode === null) {
    console.log("[dev] 停止前端 dev server…");
    web.kill();
  }
}

process.on("SIGINT", () => {
  stopWeb();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopWeb();
  process.exit(0);
});

async function main() {
  // ---- mpv 播放器（不入库，缺失时自动下载）----
  if (!existsSync(MPV_EXE)) {
    await runPowershellScript(DOWNLOAD_MPV_PS1);
  } else {
    console.log("[dev] mpv 已就绪");
  }

  // ---- 前端 dev server ----
  let devPort = 0;
  if (!onlyApp) {
    if (!existsSync(join(UI_DIR, "node_modules"))) {
      await runBunInstall(UI_DIR);
    }
    devPort = await pickDevPort();
    console.log(`[dev] 启动前端 dev server（http://localhost:${devPort}）…`);
    web = spawn("bun", ["x", "next", "dev", "-p", String(devPort)], { cwd: UI_DIR, stdio: "inherit" });
    web.on("exit", (code) => {
      console.log(`[dev] 前端 dev server 退出（${code}）`);
      process.exit(code ?? 0);
    });
    await writeDevPortFile(devPort);
  }

  // ---- 构建并启动客户端 ----
  if (!onlyWeb) {
    await runDotnetBuild(CLIENT_CSPROJ);
    if (!existsSync(APP_EXE)) throw new Error(`找不到构建产物 ${APP_EXE}`);
    // 构建可能清理 bin 目录，启动前刷新握手文件
    if (devPort) await writeDevPortFile(devPort);
    // 固定程序 explorer.exe 启动（等价双击），产物路径仅作参数
    spawn("explorer.exe", [APP_EXE], { stdio: "ignore" }).unref();
    console.log(`[dev] 客户端已启动（Debug 版，界面走 http://localhost:${devPort || 3100}）`);
  }

  console.log("[dev] Ctrl+C 停止；壁纸应用请从托盘退出");
  if (web) {
    await new Promise((resolve) => web!.on("exit", resolve));
  }
}

main()
  .then(() => {
    stopWeb();
    process.exit(0);
  })
  .catch((e) => {
    console.error("[dev]", e instanceof Error ? e.message : e);
    stopWeb();
    process.exit(1);
  });
