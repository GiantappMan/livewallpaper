// `bun dev` 的启动前置清理：
// 1) 释放 5173 端口（上次会话未退出干净的 vite）
// 2) 结束残留的应用实例（否则单实例插件会让新实例直接退出，tauri dev 随之结束）

const APP_EXE = "giantapp-wallpaper.exe";

function run(cmd: string[]) {
  const p = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
  return p.exitCode === 0;
}

// 释放 5173
const freed = run([
  "powershell",
  "-NoProfile",
  "-Command",
  `Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; $c = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; if ($null -eq $c) { exit 0 } else { exit 1 }`,
]);
console.log(freed ? "port 5173 ready" : "warning: port 5173 still in use");

// 结束残留应用实例
const killed = run([
  "powershell",
  "-NoProfile",
  "-Command",
  `Get-Process -Name 'giantapp-wallpaper' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; exit 0`,
]);
if (killed) console.log("stray app instances cleaned");
