// import EventEmitter from "events";
import { ApiResult /*, InitProgressEvent*/ } from "./types";
import { Wallpaper } from "./types/wallpaper";
import { Screen } from "./types/screen";

type Key = "Appearance" | "General" | "Wallpaper";

class API {
  // private emitter = new EventEmitter();

  constructor() {
    // if (!window.chrome.webview) return;
    // const { api } = window.chrome.webview.hostObjects;

    // //注册InitProgressEvent事件
    // api.addEventListener("InitProgressEvent", (e: any) => {
    //   this.emitter.emit(e);
    // });
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

  async showWallpaper(wallpaper: Wallpaper, screenIndex?: number): Promise<ApiResult<null>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { api } = window.chrome.webview.hostObjects;
      await api.ShowWallpaper(JSON.stringify(wallpaper), screenIndex);
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }
}

const api = new API();
export default api;
