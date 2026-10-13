// 一键启动调试（对标 4.x 根目录 bun dev）：
//   bun dev              前端 dev server(:3100) + 调试版客户端
//   bun dev --web        只起前端（前端迭代时用）
//   bun dev --app        只构建并启动客户端（前端已在别处跑着时用）
//
// 流程：补齐 mpv（download-mpv.ps1）→ 安装前端依赖（如缺）→ next dev(:3100)
// → dotnet build Debug → 启动 LiveWallpaper3.exe。
// Debug + DEBUG_LOCAL 构建的界面固定加载 http://localhost:3100/{lang}
// （见 src/giantapp-wallpaper-client/Client/Apps/AppService.cs）。
// Ctrl+C 停止 dev server；壁纸应用是托盘程序，由用户自行退出。
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const UI_DIR = join(ROOT, "src", "giantapp-wallpaper-ui-3_0");
const MPV_EXE = join(ROOT, "src", "giantapp-wallpaper-client", "WallpaperCore", "Assets", "Players", "Mpv", "mpv.exe");
const DOWNLOAD_MPV_PS1 = join(ROOT, "src", "build", "download-mpv.ps1");
const CLIENT_CSPROJ = join(ROOT, "src", "giantapp-wallpaper-client", "Client", "Client.csproj");
// 输出在 bin/x64/Debug/net462；必须与安装包发布配置同为 x64——
// 32 位首选进程加载 x64 的 WebView2Loader.dll 会在启动时报入口点错误
const APP_EXE = join(ROOT, "src", "giantapp-wallpaper-client", "Client", "bin", "x64", "Debug", "net462", "LiveWallpaper3.exe");

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
  if (!onlyApp) {
    if (!existsSync(join(UI_DIR, "node_modules"))) {
      await runBunInstall(UI_DIR);
    }
    console.log("[dev] 启动前端 dev server（http://localhost:3100）…");
    web = spawn("bun", ["run", "dev"], { cwd: UI_DIR, stdio: "inherit" });
    web.on("exit", (code) => {
      console.log(`[dev] 前端 dev server 退出（${code}）`);
      process.exit(code ?? 0);
    });
  }

  // ---- 构建并启动客户端 ----
  if (!onlyWeb) {
    await runDotnetBuild(CLIENT_CSPROJ);
    if (!existsSync(APP_EXE)) throw new Error(`找不到构建产物 ${APP_EXE}`);
    // 固定程序 explorer.exe 启动（等价双击），产物路径仅作参数
    spawn("explorer.exe", [APP_EXE], { stdio: "ignore" }).unref();
    console.log("[dev] 客户端已启动（Debug 版，界面走 http://localhost:3100）");
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
