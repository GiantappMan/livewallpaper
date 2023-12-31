export type Wallpaper = {
  dir?: string;
  fileName?: string;
  fileUrl?: string;
  coverUrl?: string;
  meta: WallpaperMeta;
  setting: WallpaperSetting;
};

export enum WallpaperType {
  NotSupported,
  Img,
  AnimatedImg,
  Video,
  Web,
  Exe
};

export type WallpaperMeta = {
  title?: string;
  description?: string;
  cover?: string;
  author?: string;
  authorID?: string;
  createTime?: Date;
  updateTime?: Date;
  type?: WallpaperType;
};

export type WallpaperSetting = {
  enableMouseEvent?: boolean;
  hardwareDecoding?: boolean;
  isPanScan?: boolean;
  volume?: number;
};
