/**
 * 内嵌播放器页面（对应 v3 的 LiveWallpaper3_VideoPlayer.exe / WebPlayer）：
 * - 通过 `wp-cmd` 事件接收控制命令（load / paused / volume / panscan / seek）
 * - 通过 `wp-time` 事件回报播放进度（500ms 节流）
 * - 也可以直接播放图片（动图兜底）与 gif/webp
 */
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

interface CmdPayload {
  action: "load" | "paused" | "volume" | "panscan" | "seek";
  src?: string;
  volume?: number;
  panscan?: boolean;
  paused?: boolean;
  percent?: number;
}

const label = window.__TAURI__!.window.getCurrentWindow().label;
const root = document.getElementById("root")!;
let media: HTMLVideoElement | HTMLImageElement | null = null;
let currentUrl = "";
// 最近一次的音量/铺满设置：换源 load 未携带时沿用，避免换源后闪断
let lastVolume = 0;
let lastPanscan = true;
// 期望暂停态（与宿主 WindowInfo.paused 对齐）：命令可能早于媒体元素
// 创建到达，必须先记住；load 换源、加载失败重试都要遵守，否则
// 遮挡/手动暂停下会被 autoplay 或重试逻辑重新播起来
let paused = false;

function applyPaused(video: HTMLVideoElement) {
  if (paused) {
    video.pause();
    return;
  }
  video.play().catch(() => {
    // 非静音自动播放被策略拦截时：先静音起播，播起来后恢复目标音量
    video.muted = true;
    video.play().catch(() => {});
    video.addEventListener(
      "playing",
      () => {
        video.muted = lastVolume === 0;
      },
      { once: true }
    );
  });
}
function fitClass(panscan: boolean) {
  return panscan ? "cover" : "contain";
}

function removeMedia() {
  if (media) {
    media.remove();
    media = null;
  }
  currentUrl = "";
}

function reportTime(duration: number, timePos: number) {
  emit("wp-time", { label, duration, timePos });
}

// 媒体加载过程诊断（加载成功/失败/重试），经 wp-log 到宿主日志
function dbg(msg: string) {
  emit("wp-log", { label, msg });
}

function load(payload: CmdPayload) {
  // 先同步暂停意图再处理换源：同源早退路径也要应用（宿主重发 load
  // 可能只为同步暂停态），否则丢命令的竞态永远无法自愈
  if (payload.paused !== undefined) {
    paused = payload.paused;
  }
  const src = payload.src || "";
  if (!src) return;
  if (src === currentUrl) {
    if (media instanceof HTMLVideoElement) applyPaused(media);
    return;
  }
  currentUrl = src;
  removeMedia();

  const volume = payload.volume ?? lastVolume;
  const panscan = payload.panscan ?? lastPanscan;
  lastVolume = volume;
  lastPanscan = panscan;

  // 媒体 URL 是全量百分号编码的（.mp4 -> %2Emp4），判定前先解码
  let decoded = src;
  try {
    decoded = decodeURIComponent(src);
  } catch {
    /* 保留原串 */
  }
  const isVideo = /\.(mp4|webm|mkv|flv|blv|avi|mov|m4v)(\?|$)/i.test(decoded);
  if (isVideo) {
    const video = document.createElement("video");
    video.id = "media";
    video.src = src;
    video.autoplay = !paused;
    video.loop = true;
    video.muted = volume === 0;
    video.volume = Math.min(volume / 100, 1);
    video.className = fitClass(panscan);
    video.addEventListener("timeupdate", () => {
      reportTime(video.duration || -1, video.currentTime || 0);
    });
    video.addEventListener("loadeddata", () => dbg("loadeddata"));
    video.addEventListener("canplay", () => dbg("canplay"));
    // 页面刚就绪的瞬间 WebView 网络栈可能尚未就绪，首个媒体请求会失败：
    // 自动重新加载源（退避重试），避免一次竞态就把壁纸卡成黑屏；
    // 重试后是否起播同样遵守暂停态
    let retries = 0;
    video.addEventListener("error", () => {
      const code = video.error ? video.error.code : -1;
      dbg(`media error code=${code} retries=${retries}`);
      reportTime(-1, -1);
      if (media !== video || retries >= 5 || currentUrl !== src) return;
      retries += 1;
      const delay = 300 * retries;
      setTimeout(() => {
        if (media !== video || currentUrl !== src) return;
        dbg(`retry ${retries} in ${delay}ms`);
        video.load();
        applyPaused(video);
      }, delay);
    });
    media = video;
    root.appendChild(video);
    applyPaused(video);
  } else {
    // 图片 / 动图（gif、webp）
    const img = document.createElement("img");
    img.id = "media";
    img.src = src;
    img.className = fitClass(panscan);
    img.style.width = "100vw";
    img.style.height = "100vh";
    media = img;
    root.appendChild(img);
    reportTime(-1, -1);
  }
}

// 就绪握手：listen 注册完成可能晚于 Rust 侧的 load 命令（窗口 ready 即发送），
// 上报 wp-ready 让宿主把当前加载命令重发一次，消除启动竞态。
// 必须用本 webview 作用域的 listen：全局 listen（EventTarget::Any）会收到
// 发往所有 webview 的命令，多屏时暂停屏幕 0 的指令会把屏幕 1 的视频也停掉。
getCurrentWebviewWindow()
  .listen<CmdPayload>("wp-cmd", (event) => {
  const cmd = event.payload;
  switch (cmd.action) {
    case "load":
      load(cmd);
      break;
    case "paused": {
      // 无论媒体元素是否已创建都先记住：命令可能先于 load 到达
      paused = cmd.paused ?? false;
      if (media instanceof HTMLVideoElement) {
        applyPaused(media);
      }
      break;
    }
    case "volume": {
      const volume = cmd.volume ?? 0;
      lastVolume = volume;
      if (media instanceof HTMLVideoElement) {
        media.muted = volume === 0;
        media.volume = Math.min(volume / 100, 1);
      }
      break;
    }
    case "panscan": {
      const panscan = cmd.panscan ?? false;
      lastPanscan = panscan;
      if (media) {
        media.className = fitClass(panscan);
      }
      break;
    }
    case "seek": {
      const percent = cmd.percent ?? 0;
      if (media instanceof HTMLVideoElement && media.duration > 0) {
        media.currentTime = (percent / 100) * media.duration;
      }
      break;
    }
  }
}).then(() => emit("wp-ready", { label })).catch(() => {});
