import EventEmitter from "events";
import { ApiResult /*, InitProgressEvent*/ } from "./types";
import { Wallpaper } from "./types/wallpaper";
import { Screen } from "./types/screen";
import { Playlist } from "./types/playlist";

type Key = "Appearance" | "General" | "Wallpaper";

class API {
  private emitter = new EventEmitter();

  constructor() {
    if (typeof window === 'undefined' || !window.chrome.webview) return;
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetWallpapers();
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getScreens(): Promise<ApiResult<Screen[]>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetScreens();
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async showWallpaper(playlist: Playlist): Promise<ApiResult<null>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.ShowWallpaper(JSON.stringify(playlist));
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async getPlayingPlaylist(): Promise<ApiResult<Playlist[]>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var json = await api.GetPlayingPlaylist();
      let res = JSON.parse(json);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async pauseWallpaper(screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.ResumeWallpaper(screenIndex);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async setVolume(volume: number, screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      var data = await api.UploadToTmp(fileName, content.toString());
      return { error: null, data };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async createWallpaper(title: string, path: string): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;

      var res = await api.CreateWallpaper(title, path);
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async deleteWallpaper(wallpaper: Wallpaper): Promise<ApiResult<boolean>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
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
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = (window as any).chrome.webview.hostObjects;

      await api.Explore(path);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }
}

const api = new API();
export default api;
