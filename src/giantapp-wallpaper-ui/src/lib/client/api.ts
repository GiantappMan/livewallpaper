/**
 * 客户端桥接层：Tauri invoke/listen 封装。
 * 方法面与 v3 的 window.chrome.webview.hostObjects.api 保持一致，
 * 返回 ApiResult<T>（浏览器中直接运行时优雅降级）。
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type {
  ConfigAppearance,
  ConfigGeneral,
  ConfigWallpaper,
  DownloadHistoryItem,
  DownloadItem,
  DownloadStatus,
  PlayingStatus,
  Screen,
  TimePos,
  Wallpaper,
  WallpaperMeta,
  WallpaperSetting,
} from "./types";

export type ApiResult<T> = {
  error: string | null | any;
  data: T | null;
};

export type ConfigKey = "Appearance" | "General" | "Wallpaper";

const noClient = <T,>(): ApiResult<T> => ({
  error: "no client",
  data: null,
});

class API {
  private unlisteners: UnlistenFn[] = [];

  /** 注册事件转发（构造后调用一次） */
  async initEvents() {
    if (!this.isRunningInClient()) return;
    this.unlisteners.push(
      await listen("refresh-page", () => window.location.reload())
    );
  }

  onRefreshPage(callback: () => void) {
    // 兼容 v3 API；实际转发在 initEvents
    listen("refresh-page", callback).then((un) => this.unlisteners.push(un));
  }

  async getConfig<T = any>(key: ConfigKey): Promise<ApiResult<T>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<T>("get_config", { key });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async setConfig(key: ConfigKey, value: any): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("set_config", { key, value });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getWallpapers(): Promise<ApiResult<Wallpaper[]>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<Wallpaper[]>("get_wallpapers");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getScreens(): Promise<ApiResult<Screen[]>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<Screen[]>("get_screens");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async showWallpaper(wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<boolean>("show_wallpaper", { wallpaper });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async playPrevInPlaylist(wallpaper: Wallpaper): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("play_prev_in_playlist", { wallpaper });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async playNextInPlaylist(wallpaper: Wallpaper): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("play_next_in_playlist", { wallpaper });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getPlayingStatus(): Promise<ApiResult<PlayingStatus>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<PlayingStatus>("get_playing_status");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async pauseWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("pause_wallpaper", { screenIndex });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async resumeWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("resume_wallpaper", { screenIndex });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async stopWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("stop_wallpaper", { screenIndex });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async setVolume(volume: number, screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("set_volume", { volume, screenIndex });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getVersion(): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: "browser" };
      const data = await invoke<string>("get_version");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async openUrl(url: string): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) {
        window.open(url, "_blank");
        return { error: null, data: null };
      }
      await invoke("open_url", { url });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async uploadToTmp(fileName: string, content: string): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<string>("upload_to_tmp", { fileName, content });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async createWallpaperNew(wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: true };
      const data = await invoke<boolean>("create_wallpaper_new", { wallpaper });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async updateWallpaperNew(
    wallpaper: Wallpaper,
    oldFileUrl: string
  ): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: true };
      const data = await invoke<boolean>("update_wallpaper_new", {
        wallpaper,
        oldFileUrl,
      });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async deleteWallpaper(wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: true };
      const data = await invoke<boolean>("delete_wallpaper", { wallpaper });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async explore(path: string): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("explore", { path });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async setWallpaperSetting(
    setting: WallpaperSetting,
    wallpaper: Wallpaper
  ): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: true };
      const data = await invoke<boolean>("set_wallpaper_setting", {
        setting,
        wallpaper,
      });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async getWallpaperTime(screenIndex?: number): Promise<ApiResult<TimePos>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<TimePos>("get_wallpaper_time", { screenIndex });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async setProgress(progress: number, screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("set_progress", { progress, screenIndex });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async downloadWallpaper(
    coverUrl: string | null,
    wallpaperUrl: string,
    meta: WallpaperMeta
  ): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: false };
      const data = await invoke<boolean>("download_wallpaper", {
        coverUrl,
        wallpaperUrl,
        meta,
      });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async cancelDownloadWallpaper(id: string): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("cancel_download_wallpaper", { id });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getDownloadItemStatus(id: string): Promise<ApiResult<DownloadItem>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<DownloadItem | null>("get_download_item_status", { id });
      return { error: null, data: data ?? null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getDownloadStatus(): Promise<ApiResult<DownloadStatus>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<DownloadStatus>("get_download_status");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getDownloadHistory(): Promise<ApiResult<DownloadHistoryItem[]>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<DownloadHistoryItem[]>("get_download_history");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async clearDownloadHistory(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("clear_download_history");
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async removeDownloadHistoryItem(id: string): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("remove_download_history_item", { id });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async openStoreReview(defaultUrl: string): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) {
        window.open(defaultUrl, "_blank");
        return { error: null, data: true };
      }
      const data = await invoke<boolean>("open_store_review", { defaultUrl });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getRealThemeMode(): Promise<string> {
    try {
      if (!this.isRunningInClient()) return "system";
      return await invoke<string>("get_real_theme_mode");
    } catch (e) {
      console.error(e);
      return "system";
    }
  }

  async openLogFolder(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("open_log_folder");
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  isRunningInClient(): boolean {
    return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  }

  /** 在独立顶层窗口打开社区页：用于账号登录（授权页拒绝 iframe 嵌套，
   *  顶层窗口里完成的登录会话 Cookie 才能落入应用的 WebView2 Cookie 罐） */
  async openCommunityWindow(url: string): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) {
        window.open(url, "_blank");
        return { error: null, data: null };
      }
      await invoke("open_community_window", { url });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 登录窗口完成 OAuth 回调后广播，收到后应重载社区页 iframe 以携带新会话 */
  onHubSessionChanged(callback: () => void) {
    listen("hub-session-changed", callback).then((un) =>
      this.unlisteners.push(un)
    );
  }
}

const api = new API();
export default api;
