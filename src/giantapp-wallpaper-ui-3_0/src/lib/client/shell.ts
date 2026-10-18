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

  minimizeWindow() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.MinimizeWindow();
  }

  maximizeWindow() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.MaximizeWindow();
  }

  restoreWindow() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.RestoreWindow();
  }

  //强制刷新：清空浏览器缓存并重新加载（等同 Ctrl+Shift+R）
  forceReload() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.ForceReload();
  }

  //窗口状态变化（Normal/Minimized/Maximized），由宿主 ShellApiObject.WindowStateChanged 事件推送
  onWindowStateChanged(callback: (state: string) => void): void {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.addEventListener('WindowStateChanged', (event: any) => {
      callback(event);
    });
  }

  isRunningInClient(): boolean {
    return typeof window !== 'undefined' && !!window.chrome?.webview;
  }
}

const shellApi = new Shell();

export default shellApi;
