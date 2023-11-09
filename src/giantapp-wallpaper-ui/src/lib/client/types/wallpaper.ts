export type Wallpaper = {
  dir?: string;
  fileName?: string;
  filePath?: string;
  coverPath?: string;
  meta?: WallpaperMeta;
  setting?: WallpaperSetting;
};

export type WallpaperMeta = {
  title?: string;
  description?: string;
  author?: string;
  authorID?: string;
  createTime?: Date;
  updateTime?: Date;
};

export type WallpaperSetting = {
  enableMouseEvent?: boolean;
  hardwareDecoding?: boolean;
  isPanScan?: boolean;
  volume?: number;
};
