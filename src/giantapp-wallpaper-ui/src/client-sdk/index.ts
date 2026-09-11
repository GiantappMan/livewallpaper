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
 */
import api from "@/lib/client/api";
import shellApi from "@/lib/client/shell";
import * as types from "@/lib/client/types";
import { listen } from "@tauri-apps/api/event";

/** 订阅应用事件（playing-status-changed / download-status-changed /
 *  appearance-changed / refresh-page / navigate / system-theme-changed /
 *  mpv-download-event / hub-session-changed），返回取消订阅函数。 */
function on(event: string, callback: (payload: any) => void) {
  return listen(event, (e: any) => callback(e.payload));
}

const WallpaperClient = {
  /** 应用命令 API（getWallpapers / showWallpaper / pauseWallpaper / setVolume / setConfig / ...） */
  api,
  /** 窗口外壳（showFolderDialog / hideLoading） */
  shell: shellApi,
  /** 领域类型与工具（WallpaperType / isPlaylist / findPlayingWallpaper / ...） */
  types,
  on,
};

(window as any).WallpaperClient = WallpaperClient;

export default WallpaperClient;
