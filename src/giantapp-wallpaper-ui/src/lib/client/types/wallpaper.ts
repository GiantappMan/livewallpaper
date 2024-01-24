import { PlayMode } from "./playlist";

export class Wallpaper {
  constructor(init?: Partial<Wallpaper>) {
    Object.assign(this, init);
  }
  dir?: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  coverUrl?: string;
  meta: WallpaperMeta = new WallpaperMeta();
  setting: WallpaperSetting = new WallpaperSetting();
  runningInfo: WallpaperRunningInfo = new WallpaperRunningInfo();
  static getFileType(path?: string | null): "img" | "video" | "app" | null {
    if (!path)
      return null;
    //根据后缀名返回 img/video
    const imgExt = [".jpg", ".jpeg", ".bmp", ".png", ".jfif", ".gif", ".webp"];
    const videoExt = [".mp4", ".flv", ".blv", ".avi", ".mov", ".webm", ".mkv"];
    const appExt = [".exe"];
    const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
    if (imgExt.includes(ext))
      return "img";
    if (videoExt.includes(ext))
      return "video";
    if (appExt.includes(ext))
      return "app";
    return null;
  }

  //是否包含传入的fileUrl
  static isSame(wallpaper: Wallpaper, targetWallpaper?: Wallpaper | null): boolean {
    if (!wallpaper || !wallpaper.fileUrl || !targetWallpaper)
      return false;
    const fileUrl = targetWallpaper.fileUrl;
    if (wallpaper.setting.isPlaylist) {
      return wallpaper.setting.wallpapers?.some(w => w.fileUrl === fileUrl) || false;
    }
    return wallpaper.fileUrl === fileUrl;
  }

  //查找真正播放的wallpaper
  static findPlayingWallpaper(wallpaper: Wallpaper): Wallpaper {
    if (!wallpaper.setting.isPlaylist)
      return wallpaper;
    const wallpapers = wallpaper.setting.wallpapers;
    if (!wallpapers || wallpapers.length === 0)
      return wallpaper;
    const index = wallpaper.setting.playIndex || 0;
    return wallpapers[index];
  }

  //查找fileUrl匹配的wallpaper
  static findWallpaperByFileUrl(wallpapers: Wallpaper, fileUrl: string): Wallpaper | null {
    if (!wallpapers || !fileUrl)
      return null;
    if (wallpapers.fileUrl === fileUrl)
      return wallpapers;
    if (wallpapers.setting.isPlaylist) {
      return wallpapers.setting.wallpapers?.find(w => w.fileUrl === fileUrl) || null;
    }
    return null;
  }
};

export enum WallpaperType {
  NotSupported,
  Img,
  AnimatedImg,
  Video,
  Web,
  Exe
};

export class WallpaperMeta {
  title?: string;
  description?: string;
  cover?: string;
  author?: string;
  authorID?: string;
  createTime?: Date;
  updateTime?: Date;
  type?: WallpaperType;
};

export class WallpaperSetting {
  constructor(init?: Partial<WallpaperSetting>) {
    Object.assign(this, init);
  }
  isPlaylist?: boolean = false;
  isPaused?: boolean = false;
  // exe
  enableMouseEvent?: boolean = false;
  // video
  hardwareDecoding?: boolean = true;
  isPanScan?: boolean = false;
  // volume: number = 0;
  // playlist
  mode?: PlayMode = PlayMode.Order;
  playIndex?: number = 0;
  wallpapers?: Wallpaper[] = [];
};

export class WallpaperRunningInfo {
  screenIndexes: number[] = [];
}