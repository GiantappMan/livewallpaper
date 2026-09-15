/**
 * 皮肤客户端 SDK 入口：构建为 IIFE 单文件（见 vite.sdk.config.ts），
 * 产物由 skin:// 协议在 `/_sdk/client.js` 提供。
 *
 * 皮肤页面引入方式：
 * ```html
 * <script src="/_sdk/client.js"></script>
 * ```
 * 之后即可使用全局 `WallpaperClient`：
 * ```js
 * const { api, shell, types, on } = window.WallpaperClient;
 * const res = await api.getWallpapers();
 * await api.showWallpaper(res.data[0]);
 * on("playing-status-changed", () => refresh());
 * ```
 *
 * 引入即自动热加载：`refresh-page` 事件由 SDK 内置订阅并整页刷新
 * （皮肤文件变化时后端也会直接刷新主窗口兜底），皮肤无需为此写任何代码。
 */
import api from "@/lib/client/api";
import shellApi from "@/lib/client/shell";
import * as types from "@/lib/client/types";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** 订阅应用事件（playing-status-changed / download-status-changed /
 *  appearance-changed / refresh-page / navigate / system-theme-changed /
 *  mpv-download-event / hub-session-changed），返回取消订阅函数。 */
function on(event: string, callback: (payload: any) => void) {
  return listen(event, (e: any) => callback(e.payload));
}

/** 当前窗口控件（皮肤自绘标题栏用；关闭会被后端转为隐藏到托盘）。 */
const win = {
  minimize: () => getCurrentWindow().minimize(),
  toggleMaximize: () => getCurrentWindow().toggleMaximize(),
  close: () => getCurrentWindow().close(),
  startDragging: () => getCurrentWindow().startDragging(),
};

const WallpaperClient = {
  /** 应用命令 API（getWallpapers / showWallpaper / pauseWallpaper / setVolume / setConfig / ...） */
  api,
  /** 窗口外壳（showFolderDialog / hideLoading） */
  shell: shellApi,
  /** 当前窗口控件（minimize / toggleMaximize / close / startDragging） */
  win,
  /** 领域类型与工具（WallpaperType / isPlaylist / findPlayingWallpaper / ...） */
  types,
  on,
};

(window as any).WallpaperClient = WallpaperClient;

// 热加载兜底：皮肤文件变化 / 壁纸配置变更等场景后端会广播 `refresh-page`，
// SDK 内置整页刷新订阅，皮肤无需显式调用 api.initEvents() 即自动热更新
// （与 initEvents 重复注册无副作用；浏览器直开无 Tauri IPC 时静默跳过）。
if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
  listen("refresh-page", () => window.location.reload()).catch(() => {});
}

export default WallpaperClient;
