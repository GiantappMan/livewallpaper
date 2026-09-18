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
  MpvDownloadEvent,
  MpvStatus,
  PlayingStatus,
  Screen,
  ScreenCoverage,
  SkinInfo,
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

  /** 实时遮挡检测：每屏覆盖率与遮挡判定（跳过引擎每秒 tick 缓存，立即枚举窗口判定） */
  async getScreenCoverage(): Promise<ApiResult<ScreenCoverage[]>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<ScreenCoverage[]>("get_screen_coverage");
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

  /** 列出壁纸库子文件夹；dir 为空串时返回库根目录列表 */
  async listFolders(dir: string): Promise<ApiResult<string[]>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<string[]>("list_folders", { dir });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: [] };
    }
  }

  /** 在 parent 下新建文件夹，返回完整路径 */
  async createFolder(parent: string, name: string): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<string>("create_folder", { parent, name });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 移动壁纸（媒体 + 同名元数据）到 targetDir，返回新文件路径 */
  async moveWallpaper(
    filePath: string,
    targetDir: string
  ): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<string>("move_wallpaper", {
        filePath,
        targetDir,
      });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 读取文件夹的桌面式布局（条目名 → 槽位）；缺失返回空对象 */
  async getFolderLayout(dir: string): Promise<ApiResult<Record<string, { c: number; r: number }>>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<Record<string, { c: number; r: number }>>(
        "get_folder_layout",
        { dir }
      );
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: {} };
    }
  }

  /** 保存文件夹的桌面式布局（仅位置记忆，不触发壁纸刷新广播） */
  async saveFolderLayout(
    dir: string,
    layout: Record<string, { c: number; r: number }>
  ): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<boolean>("save_folder_layout", { dir, layout });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  /** 移动子文件夹到 targetDir 下，返回新文件夹路径 */
  async moveFolder(source: string, targetDir: string): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<string>("move_folder", { source, targetDir });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 递归删除库内子文件夹（根目录不可删；确认由界面层负责） */
  async deleteFolder(dir: string): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<boolean>("delete_folder", { dir });
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

  /** 退出应用（按 KeepWallpaper 配置清理；窗口关闭是隐藏到托盘，退出用这个） */
  async exitApp(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("exit_app");
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

  /** 在主窗口内挂载/定位/显隐社区 WebView（顶层文档即社区站，第一方上下文）。
   *  url 仅首次挂载时需要；后续只传矩形与 visible（保留页面状态不重载） */
  async setCommunityWebview(params: {
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    url?: string;
  }): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return { error: null, data: null };
      await invoke("set_community_webview", {
        visible: params.visible,
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        url: params.url ?? null,
      });
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async getMpvStatus(): Promise<ApiResult<MpvStatus>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<MpvStatus>("get_mpv_status");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 后台启动 mpv 自动下载，进度经 onMpvDownloadEvent 推送 */
  async downloadMpv(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("download_mpv");
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  async cancelDownloadMpv(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("cancel_download_mpv");
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 用资源管理器打开 mpv 所在目录（缺失时为自动下载目标目录） */
  async openMpvFolder(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("open_mpv_folder");
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** mpv 下载进度/结果事件 */
  onMpvDownloadEvent(callback: (event: MpvDownloadEvent) => void) {
    listen<MpvDownloadEvent>("mpv-download-event", (e) =>
      callback(e.payload)
    ).then((un) => this.unlisteners.push(un));
  }

  // ---------- 皮肤 ----------

  async listSkins(): Promise<ApiResult<SkinInfo[]>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<SkinInfo[]>("list_skins");
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 切换皮肤（非法清单会返回错误；成功后后端重建主窗口） */
  async setActiveSkin(id: string): Promise<ApiResult<boolean>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      const data = await invoke<boolean>("set_active_skin", { id });
      return { error: null, data };
    } catch (e) {
      console.error(e);
      return { error: e, data: false };
    }
  }

  async openSkinsFolder(): Promise<ApiResult<null>> {
    try {
      if (!this.isRunningInClient()) return noClient();
      await invoke("open_skins_folder");
      return { error: null, data: null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }
}

const api = new API();
export default api;
