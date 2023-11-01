import { ApiResult } from "./types";

type Key = "Appearance" | "General" | "Wallpaper";
export async function getConfig<T>(
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

export async function setConfig(
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

export async function showFolderDialog(): Promise<ApiResult<string>> {
  try {
    if (!window.chrome.webview) return;
    const { api } = window.chrome.webview.hostObjects;
    let res = await api.ShowFolderDialog();
    return { error: null, data: res };
  } catch (e) {
    console.log(e);
    debugger;
    return { error: e, data: null };
  }
}
