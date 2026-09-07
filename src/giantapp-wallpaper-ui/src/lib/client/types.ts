// 壁纸数据模型（与 v3 客户端 JSON 字段一致，服务端 serde 序列化对齐）

export enum WallpaperType {
  NotSupported,
  Img,
  AnimatedImg,
  Video,
  Web,
  Exe,
  Playlist,
}

export enum Fit {
  Center = 0,
  Tile,
  Stretch,
  Fit,
  Fill,
  Span,
}

export enum VideoPlayer {
  Default_Player,
  MPV_Player,
  System_Player,
}

export enum PlayMode {
  /** 顺序播放 */
  Order,
  /** 随机播放 */
  Random,
  /** 定时切换 */
  Timer,
}

export interface WallpaperMeta {
  id?: string;
  title?: string;
  description?: string;
  cover?: string;
  author?: string;
  authorID?: string;
  createTime?: string;
  updateTime?: string;
  type?: WallpaperType;
  playIndex?: number;
  wallpapers?: Wallpaper[];
}

export interface WallpaperSetting {
  /** 播放时长 hh:mm / hh:mm:ss（播放列表项） */
  duration?: string;
  /** web/exe：鼠标交互 */
  enableMouseEvent: boolean;
  /** video：硬件解码 */
  hardwareDecoding: boolean;
  /** video：填充放大（裁剪黑边） */
  isPanScan: boolean;
  videoPlayer: VideoPlayer;
  playMode: PlayMode;
  /** img：填充方式 */
  fit: Fit;
  /** img：退出还原桌面 */
  keepWallpaper: boolean;
}

export interface WallpaperRunningInfo {
  screenIndexes: number[];
  isPaused?: boolean;
}

export interface Wallpaper {
  dir?: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  coverUrl?: string;
  coverPath?: string;
  meta: WallpaperMeta;
  setting: WallpaperSetting;
  runningInfo: WallpaperRunningInfo;
}

export const defaultSetting = (): WallpaperSetting => ({
  enableMouseEvent: true,
  hardwareDecoding: true,
  isPanScan: true,
  videoPlayer: VideoPlayer.Default_Player,
  playMode: PlayMode.Order,
  fit: Fit.Fill,
  keepWallpaper: true,
});

export function getFileType(
  path?: string | null
): "img" | "video" | "web" | "app" | "playlist" | "animated" | null {
  if (!path) return null;
  const imgExt = [".jpg", ".jpeg", ".bmp", ".png", ".jfif", ".avif"];
  const videoExt = [".mp4", ".flv", ".blv", ".avi", ".mov", ".webm", ".mkv"];
  const webExt = [".html", ".htm"];
  const appExt = [".exe"];
  const animatedImgExt = [".gif", ".webp"];
  const playlistExt = [".playlist"];
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
  if (imgExt.includes(ext)) return "img";
  if (videoExt.includes(ext)) return "video";
  if (webExt.includes(ext)) return "web";
  if (appExt.includes(ext)) return "app";
  if (animatedImgExt.includes(ext)) return "animated";
  if (playlistExt.includes(ext)) return "playlist";
  return null;
}

export function isPlaylist(meta?: WallpaperMeta): boolean {
  return meta?.type === WallpaperType.Playlist;
}

/** 是否包含传入的 fileUrl（含播放列表成员） */
export function isSame(wallpaper: Wallpaper, targetWallpaper?: Wallpaper | null): boolean {
  if (!wallpaper || !wallpaper.fileUrl || !targetWallpaper) return false;
  const fileUrl = targetWallpaper.fileUrl;
  if (isPlaylist(wallpaper.meta)) {
    return wallpaper.meta.wallpapers?.some((w) => w.fileUrl === fileUrl) || false;
  }
  return wallpaper.fileUrl === fileUrl;
}

/** 查找真正播放的壁纸（播放列表当前项） */
export function findPlayingWallpaper(wallpaper: Wallpaper): Wallpaper {
  if (!isPlaylist(wallpaper.meta)) return wallpaper;
  const wallpapers = wallpaper.meta.wallpapers;
  if (!wallpapers || wallpapers.length === 0) return wallpaper;
  const index = (wallpaper.meta.playIndex || 0) % wallpapers.length;
  return wallpapers[index];
}

/** 按 fileUrl 查找壁纸成员 */
export function findWallpaperByFileUrl(
  wallpaper: Wallpaper,
  fileUrl: string
): Wallpaper | null {
  if (!wallpaper || !fileUrl) return null;
  if (wallpaper.fileUrl === fileUrl) return wallpaper;
  if (isPlaylist(wallpaper.meta)) {
    return wallpaper.meta.wallpapers?.find((w) => w.fileUrl === fileUrl) || null;
  }
  return null;
}

export function getWallpaperTypeString(dictionary: any, type?: WallpaperType) {
  let key: string | undefined;
  switch (type) {
    case WallpaperType.Img:
      key = "img";
      break;
    case WallpaperType.AnimatedImg:
      key = "animated_img";
      break;
    case WallpaperType.Video:
      key = "video";
      break;
    case WallpaperType.Web:
      key = "web";
      break;
    case WallpaperType.Playlist:
      key = "playlist";
      break;
  }
  if (!key) return "";
  return dictionary["local"][`wallpaper_type_${key}`];
}

// ---------- 配置 ----------

export enum WallpaperCoveredBehavior {
  /** 不做任何处理 */
  None,
  /** 暂停播放 */
  Pause,
  /** 停止播放 */
  Stop,
}

export type ConfigAppearance = {
  theme: string;
  mode: "system" | "light" | "dark";
};

export type ConfigGeneral = {
  autoStart: boolean;
  hideWindow: boolean;
  currentLan: string;
};

export type ConfigWallpaper = {
  directories: string[];
  coveredBehavior: WallpaperCoveredBehavior;
  defaultVideoPlayer: VideoPlayer;
};

// ---------- 运行状态 ----------

export type Screen = {
  index: number;
  bitsPerPixel: number;
  bounds: string; // "0, 0, 1920, 1080"
  deviceName: string;
  primary: boolean;
  workingArea: string;
};

export type TimePos = {
  duration: number;
  position: number;
};

export type PlayingStatus = {
  screens: Screen[];
  wallpapers: Wallpaper[];
  audioScreenIndex: number;
  volume: number;
};

export type DownloadItem = {
  id: string;
  desc: string;
  percent: number;
  totalBytes: number;
  receivedBytes: number;
  isDownloading: boolean;
  isDownloadCompleted: boolean;
  /** 兼容 v3 的大写命名 */
  IsCanceled: boolean;
};

export type DownloadStatus = {
  items: DownloadItem[];
};

export type DownloadHistoryItem = {
  id: string;
  title: string;
  filePath: string;
  coverPath: string | null;
  totalBytes: number;
  /** 完成时间（Unix 毫秒） */
  completedAt: number;
  /** 封面 media URL（后端生成） */
  coverUrl: string | null;
  /** 媒体文件 media URL（后端生成） */
  fileUrl: string;
};
