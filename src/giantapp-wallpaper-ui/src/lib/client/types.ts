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
  /** 内嵌 mpv：libmpv（libmpv-2.dll）进程内渲染，随安装包内置 */
  Libmpv_Player,
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
  /** 画面叠加元素（封面"叠加"入口配置；不叠加时不传/字段为 false） */
  overlay?: { time: boolean };
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
  /** 生效皮肤 id；`default` 为内置界面 */
  skin: string;
};

export type ConfigGeneral = {
  autoStart: boolean;
  hideWindow: boolean;
  /** 开机自启时以 headless 模式（无窗口）运行 */
  autoStartHeadless: boolean;
  currentLan: string;
};

export type ConfigWallpaper = {
  directories: string[];
  coveredBehavior: WallpaperCoveredBehavior;
  defaultVideoPlayer: VideoPlayer;
  /** 退出时保留壁纸快照，下次启动自动恢复 */
  keepWallpaper: boolean;
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

/** 每屏遮挡覆盖率（实时检测结果） */
export type ScreenCoverage = {
  screenIndex: number;
  /** 被顶层窗口覆盖的屏幕面积百分比（0-100，多窗口取矩形并集） */
  percent: number;
  /** 达到遮挡判定：有最大化窗口，或覆盖率 ≥ 90% */
  covered: boolean;
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
  /** 当前被全屏窗口遮挡的屏幕索引（引擎每秒 tick 更新） */
  coveredScreens: number[];
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

export type MpvStatus = {
  available: boolean;
  path: string;
  downloading: boolean;
  /** 内嵌 mpv（libmpv-2.dll）是否可用 */
  libmpvAvailable: boolean;
};

export type MpvDownloadEvent =
  | {
      state: "progress";
      percent: number;
      receivedBytes: number;
      totalBytes: number;
    }
  | { state: "done"; path: string }
  | { state: "error"; message: string };

// ---------- 更新（界面热更新 + 程序自动更新） ----------

export type ConfigUpdate = {
  /** 界面热更新清单地址（ui.json）；为空表示未启用 */
  uiUrl: string;
  /** 启动时自动检查并应用界面更新 */
  uiAuto: boolean;
  /** 热更新界面是否生效 */
  uiActive: boolean;
  /** 程序更新检查地址 base（清单为 <base>/stable.json、<base>/preview.json） */
  appUrl: string;
  /** off | stable | preview */
  appChannel: string;
  /** 发现新版本后自动下载（安装始终需确认） */
  appAutoDownload: boolean;
};

/** 远程界面更新清单 */
export type UiRemoteManifest = {
  version: string;
  url: string;
  notes: string;
  date: string;
};

export type UiUpdateStatus = {
  uiUrl: string;
  uiAuto: boolean;
  uiActive: boolean;
  installedVersion: string | null;
  installedAt: string | null;
  appVersion: string;
  /** 实际生效的清单地址（自定义地址优先，否则按更新通道推导） */
  resolvedUrl: string | null;
  /** 清单地址是否跟随更新通道（未自定义 uiUrl） */
  urlFollowsChannel: boolean;
};

export type AppUpdateInfo = {
  version: string;
  url: string;
  notes: string;
  date: string;
  channel: string;
};

export type AppUpdateState = {
  channel: string;
  autoDownload: boolean;
  /** idle | available | downloading | downloaded | error */
  phase: string;
  percent: number;
  info: AppUpdateInfo | null;
  error: string | null;
  downloadedVersion: string | null;
};

/** 本地缓存的界面版本 */
export type UiVersionEntry = {
  version: string;
  date: string;
  notes: string;
  active: boolean;
};

export type UiUpdateEvent =
  | { state: "checking" }
  | { state: "available"; version: string; notes: string }
  | { state: "progress"; percent: number; receivedBytes: number; totalBytes: number }
  | { state: "applied"; version: string }
  | { state: "restored" }
  | { state: "error"; message: string };

export type AppUpdateEvent =
  | { state: "checking" }
  | { state: "upToDate" }
  | { state: "available"; version: string; notes: string; channel: string }
  | { state: "progress"; percent: number; receivedBytes: number; totalBytes: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

// ---------- 皮肤 ----------

export type SkinInfo = {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  /** `app`（完整界面）| `style`（仅 CSS 覆盖） */
  type: "app" | "style";
  entry: string;
  builtin: boolean;
  valid: boolean;
  invalidReason: string | null;
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

// ---------- 壁纸日历 ----------

/** 壁纸引用：绝对 filePath 为解析主键（后端回填展示 URL 经 previews） */
export interface CalendarRef {
  filePath: string;
  dir?: string | null;
  fileName?: string | null;
}

/** 时间段 HH:MM-HH:MM；end <= start 表示跨零点 */
export interface CalendarTimeSegment {
  start: string;
  end: string;
  wallpaper: CalendarRef;
}

export interface CalendarSlots {
  allDay?: CalendarRef | null;
  segments?: CalendarTimeSegment[];
}

/** 单日具体编排 */
export interface CalendarDayPlan extends CalendarSlots {
  date: string; // YYYY-MM-DD
  enabled: boolean;
}

/** 每年循环的节日日期 */
export type CalendarYearlyDate =
  | { kind: "solar"; month: number; day: number }
  | { kind: "lunar"; month: number; day: number; leap: boolean };

export interface CalendarYearlyRule extends CalendarSlots {
  id: string;
  name: string;
  enabled: boolean;
  date?: CalendarYearlyDate | null;
}

/** 每周规则；weekdays 取值 0=周日 … 6=周六（与 JS getDay 一致） */
export interface CalendarWeeklyRule extends CalendarSlots {
  id: string;
  name: string;
  enabled: boolean;
  weekdays: number[];
}

export interface CalendarDoc {
  enabled: boolean;
  days: CalendarDayPlan[];
  yearly: CalendarYearlyRule[];
  weekly: CalendarWeeklyRule[];
}

/** 引用的展示信息（media:// URL 由后端填充，前端无法自行构造） */
export interface CalendarRefInfo {
  fileUrl: string;
  coverUrl?: string | null;
  title?: string;
  wallpaperType?: WallpaperType;
}

export type CalendarPreviews = Record<string, CalendarRefInfo>;

export interface CalendarPayload {
  doc: CalendarDoc;
  /** 解析失败（缺失 / 类型不支持）的引用路径 */
  invalid: string[];
  previews: CalendarPreviews;
}

export type CalendarSource =
  | { kind: "day" }
  | { kind: "yearly"; id: string; name: string }
  | { kind: "weekly"; id: string; name: string };

export interface CalendarPreviewDay {
  date: string;
  source?: CalendarSource | null;
  filePath?: string | null;
  segmentCount: number;
}

export interface CalendarPreview {
  days: CalendarPreviewDay[];
  previews: CalendarPreviews;
}
