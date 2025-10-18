import { ApiResult } from "./types";

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
    const RELOAD_KEY = 'webview_reload_count';
    const MAX_RELOAD_TIMES = 5;
    const TIMEOUT_MS = 200;
    
    // 获取当前刷新次数
    const reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
    
    // 定时检查 API 是否可用，一旦可用就调用并停止检查
    const checkInterval = setInterval(() => {
      if (window.chrome?.webview?.hostObjects?.shell) {
        window.chrome.webview.hostObjects.shell.HideLoading();
        clearInterval(checkInterval);
        clearTimeout(timeoutCheck);
        // API 可用，清除刷新计数
        sessionStorage.removeItem(RELOAD_KEY);
      }
    }, 100); // 每 100ms 检查一次

    // 超时检查：1秒后如果还没有API
    const timeoutCheck = setTimeout(() => {
      if (!window.chrome?.webview?.hostObjects?.shell) {
        if (reloadCount < MAX_RELOAD_TIMES) {
          // 还没到最大刷新次数，刷新页面
          console.warn(`API 未在${TIMEOUT_MS}ms内可用，第${reloadCount + 1}次刷新页面`);
          sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1));
          clearInterval(checkInterval);
          window.location.reload();
        } else {
          // 已达到最大刷新次数，不再刷新，继续循环等待API注入
          console.warn(`已刷新${MAX_RELOAD_TIMES}次，停止刷新，持续等待API注入...`);
          clearTimeout(timeoutCheck);
          // checkInterval 继续运行，循环等待API
        }
      }
    }, TIMEOUT_MS);
  }
  
  closeWindow() {
    if (!window.chrome.webview) return;
    const { shell } = window.chrome.webview.hostObjects;
    shell.CloseWindow();
  }
}

const shellApi = new Shell();

export default shellApi;
