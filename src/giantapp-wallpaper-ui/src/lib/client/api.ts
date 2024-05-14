import EventEmitter from "events";
import { ApiResult /*, InitProgressEvent*/ } from "./types";
import { Wallpaper, WallpaperMeta, WallpaperSetting } from "./types/wallpaper";
import { Screen } from "./types/screen";
import PlayingStatus from "./types/playing-status";

type Key = "Appearance" | "General" | "Wallpaper";

class API {
  private emitter = new EventEmitter();

  constructor() {
    if (typeof window === 'undefined' || !window.chrome || !window.chrome.webview) return;
    const { api } = window.chrome.webview.hostObjects;

    // //注册InitProgressEvent事件
    // api.addEventListener("InitProgressEvent", (e: any) => {
    //   this.emitter.emit(e);
    // });

    // 注册RefreshPageEvent事件
    api.addEventListener("RefreshPageEvent", (e: any) => {
      console.log("RefreshPageEvent", e);
      this.emitter.emit("RefreshPageEvent", e);
    });
  }

  onRefreshPage(callback: (e: any) => void) {
    this.emitter.on("RefreshPageEvent", callback);
  }

  // // 暴露出事件
  // onInitProgress(callback: (e: InitProgressEvent) => void) {
  //   this.emitter.on("initProgress", callback);
  // }

  async getConfig<T>(
    key: Key,
  ): Promise<ApiResult<T>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetConfig(key);
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async setConfig(
    key: Key,
    value: any,
  ): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.SetConfig(key, JSON.stringify(value));
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getWallpapers(): Promise<ApiResult<Wallpaper[]>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetWallpapers();
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  /*
  * deprecated
  */
  async getScreens(): Promise<ApiResult<Screen[]>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetScreens();
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async showWallpaper(wallpaper: Wallpaper): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.ShowWallpaper(JSON.stringify(wallpaper));
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async playPrevInPlaylist(wallpaper: Wallpaper): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.PlayPrevInPlaylist(JSON.stringify(wallpaper));
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async playNextInPlaylist(wallpaper: Wallpaper): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.PlayNextInPlaylist(JSON.stringify(wallpaper));
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getPlayingStatus(): Promise<ApiResult<PlayingStatus>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetPlayingStatus();
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async pauseWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.PauseWallpaper(screenIndex);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async resumeWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.ResumeWallpaper(screenIndex);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async stopWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };

      const { api } = window.chrome.webview.hostObjects;
      await api.StopWallpaper(screenIndex);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async setVolume(volume: number, screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.SetVolume(volume.toString(), screenIndex + "");
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getVersion(): Promise<ApiResult<string>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var res = await api.GetVersion();
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async openUrl(url: string): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      api.OpenUrl(url);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async uploadToTmp(fileName: string, content: string | ArrayBuffer): Promise<ApiResult<string>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var data = await api.UploadToTmp(fileName, content.toString());
      return { error: null, data };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async createWallpaperNew(wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      var res = await api.CreateWallpaperNew(JSON.stringify(wallpaper));
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async updateWallpaper(title: string, coverUrl: string, pathUrl: string, oldWallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      var res = await api.UpdateWallpaper(title, coverUrl, pathUrl, JSON.stringify(oldWallpaper));
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async updateWallpaperNew(wallpaper: Wallpaper, oldPath: string): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      var res = await api.UpdateWallpaperNew(JSON.stringify(wallpaper), oldPath);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async deleteWallpaper(wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;

      var res = await api.DeleteWallpaper(JSON.stringify(wallpaper));
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async explore(path: string): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      await api.Explore(path);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async setWallpaperSetting(setting: WallpaperSetting, wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      var data = await api.SetWallpaperSetting(JSON.stringify(setting), JSON.stringify(wallpaper));
      return { error: null, data };
    } catch (e) {
      console.log(e);
      return { error: e, data: false };
    }
  }

  async getWallpaperTime(screenIndex?: number): Promise<ApiResult<{
    duration: number,
    position: number
  }>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      var data = await api.GetWallpaperTime(screenIndex);
      return { error: null, data: JSON.parse(data) };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async setProgress(progress: number, screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      await api.SetProgress(progress, screenIndex);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async downloadWallpaper(coverUrl: string, wallpaperUrl: string, meta: WallpaperMeta): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: false };
      const { api } = (window as any).chrome.webview.hostObjects;

      var data = await api.DownloadWallpaper(coverUrl, wallpaperUrl, JSON.stringify(meta));
      return { error: null, data };
    } catch (e) {
      console.log(e);
      return { error: e, data: false };
    }
  }

  async cancelDownloadWallpaper(id: string): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      var data = await api.CancelDownloadWallpaper(id);
      return { error: null, data };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getDownloadItemStatus(id: string): Promise<ApiResult<DownloadItem>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;
      let json = await api.GetDownloadItemStatus(id);
      let data = JSON.parse(json);
      return { error: null, data };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }
  async showShell(path: string): Promise<ApiResult<null>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;
      api.ShowShell(path);
      return { error: null, data: null };
    }
    catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async openStoreReview(defaultUrl: string): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome || !window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;
      const res = await api.OpenStoreReview(defaultUrl);
      return { error: null, data: res };
    }
    catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getRealThemeMode(): Promise<string> {
    try {
      if (!window.chrome || !window.chrome.webview) return "";
      const { api } = (window as any).chrome.webview.hostObjects;
      return await api.GetRealThemeMode();
    }
    catch (e) {
      console.log(e);
      return "system";
    }
  }

  isRunningInClient(): boolean {
    return typeof window !== 'undefined' && !!window.chrome?.webview;
  }
}

const api = new API();
export default api;
