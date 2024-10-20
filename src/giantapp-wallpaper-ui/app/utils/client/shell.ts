import type { ApiResult } from "./types";

class Shell {
  async showFolderDialog(): Promise<ApiResult<string>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { shell } = window.chrome.webview.hostObjects;
      let res = await shell.ShowFolderDialog();
      return { error: null, data: res };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  hideLoading() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.HideLoading();
  }

  closeWindow() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.CloseWindow();
  }

  isRunningInClient(): boolean {
    return typeof window !== 'undefined' && !!window.chrome?.webview;
  }

  async minimizeWindow(): Promise<ApiResult<void>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { shell } = window.chrome.webview.hostObjects;
      await shell.MinimizeWindow();
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async maximizeWindow(): Promise<ApiResult<void>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { shell } = window.chrome.webview.hostObjects;
      await shell.MaximizeWindow();
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  async restoreWindow(): Promise<ApiResult<void>> {
    try {
      if (!window.chrome.webview) return { error: "no webview", data: null };
      const { shell } = window.chrome.webview.hostObjects;
      await shell.RestoreWindow();
      return { error: null, data: null };
    } catch (e) {
      console.log(e);
      return { error: e, data: null };
    }
  }

  onWindowStateChanged(callback: (state: string) => void): void {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.addEventListener('WindowStateChanged', (event: any) => {
      callback(event);
    });
  }
}

const shellApi = new Shell();

export default shellApi;
