/**
 * 内嵌播放器页面（对应 v3 的 LiveWallpaper3_VideoPlayer.exe / WebPlayer）：
 * - 通过 `wp-cmd` 事件接收控制命令（load / paused / volume / seek）
 * - 通过 `wp-time` 事件回报播放进度（500ms 节流）
 * - 也可以直接播放图片（动图兜底）与 gif/webp
 */
import { listen, emit } from "@tauri-apps/api/event";

interface CmdPayload {
  action: "load" | "paused" | "volume" | "seek";
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

function load(payload: CmdPayload) {
  const src = payload.src || "";
  if (!src) return;
  if (src === currentUrl) return;
  currentUrl = src;
  removeMedia();

  const isVideo = /\.(mp4|webm|mkv|flv|blv|avi|mov|m4v)(\?|$)/i.test(src);
  if (isVideo) {
    const video = document.createElement("video");
    video.id = "media";
    video.src = src;
    video.autoplay = true;
    video.loop = true;
    video.muted = (payload.volume ?? 0) === 0;
    video.volume = Math.min((payload.volume ?? 0) / 100, 1);
    video.className = fitClass(payload.panscan ?? true);
    video.addEventListener("timeupdate", () => {
      reportTime(video.duration || -1, video.currentTime || 0);
    });
    video.addEventListener("error", () => reportTime(-1, -1));
    media = video;
    root.appendChild(video);
    video.play().catch(() => {});
  } else {
    // 图片 / 动图（gif、webp）
    const img = document.createElement("img");
    img.id = "media";
    img.src = src;
    img.className = fitClass(payload.panscan ?? true);
    img.style.width = "100vw";
    img.style.height = "100vh";
    media = img;
    root.appendChild(img);
    reportTime(-1, -1);
  }
}

listen<CmdPayload>("wp-cmd", (event) => {
  const cmd = event.payload;
  switch (cmd.action) {
    case "load":
      load(cmd);
      break;
    case "paused": {
      const paused = cmd.paused ?? false;
      if (media instanceof HTMLVideoElement) {
        if (paused) media.pause();
        else media.play().catch(() => {});
      }
      break;
    }
    case "volume": {
      const volume = cmd.volume ?? 0;
      if (media instanceof HTMLVideoElement) {
        media.muted = volume === 0;
        media.volume = Math.min(volume / 100, 1);
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
});
