import { i18n, Locale } from "@/i18n-config";
import { VideoPlayer } from "./wallpaper";

export type ConfigAppearance = {
  theme: string;
  mode: "system" | "light" | "dark";
};

export type ConfigGeneral = {
  autoStart: boolean;
  hideWindow: boolean;
  currentLan: Locale;
};

export enum WallpaperCoveredBehavior {
  //不做任何处理
  None,
  //暂停播放
  Pause,
  //停止播放
  Stop
}

export type WallpaperCoveringProcessFilter = {
  pid: number;
  title: string;
  className: string;
  fileName: string;
};

export enum WallpaperCoveringProcessFilterPriority {
  //窗口标题必须匹配
  Title,
  //匹配标题，否则查找相同类型的窗口
  Class,
  //匹配标题，否则查找相同可执行程序的窗口
  Executable
}

export type ConfigWallpaper = {
  directories: string[];
  // keepWallpaper: boolean;
  coveredBehavior: WallpaperCoveredBehavior;
  coveringProcessFilters: WallpaperCoveringProcessFilter[];
  coveringProcessFilterPriority: WallpaperCoveringProcessFilterPriority;
  defaultVideoPlayer: VideoPlayer;
};
