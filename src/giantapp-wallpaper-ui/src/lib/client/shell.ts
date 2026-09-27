/**
 * 窗口外壳操作（对应 v3 ShellApiObject）。
 */
import { invoke } from "@tauri-apps/api/core";
import type { ApiResult } from "./api";

class Shell {
  async showFolderDialog(): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return { error: "no client", data: null };
      const data = await invoke<string | null>("show_folder_dialog");
      return { error: null, data: data ?? null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  /** 原生选文件对话框，返回绝对路径（HTML input 沙盒拿不到真实路径）。
   *  filters 为扩展名白名单（如 ["mp4","jpg"]，带不带点均可），缺省不过滤。 */
  async showFileDialog(filters?: string[], title?: string): Promise<ApiResult<string>> {
    try {
      if (!this.isRunningInClient()) return { error: "no client", data: null };
      const data = await invoke<string | null>("show_file_dialog", {
        title: title ?? null,
        filters: filters ?? null,
      });
      return { error: null, data: data ?? null };
    } catch (e) {
      console.error(e);
      return { error: e, data: null };
    }
  }

  hideLoading() {
    if (!this.isRunningInClient()) return;
    invoke("hide_loading").catch(console.error);
  }

  isRunningInClient(): boolean {
    return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  }
}

const shellApi = new Shell();
export default shellApi;
