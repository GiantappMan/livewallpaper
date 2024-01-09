export class Wallpaper {
  dir?: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  coverUrl?: string;
  meta: WallpaperMeta = new WallpaperMeta();
  setting: WallpaperSetting = new WallpaperSetting();
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
  enableMouseEvent?: boolean;
  hardwareDecoding?: boolean;
  isPanScan?: boolean;
  volume?: number;
};
