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

export type ConfigUpdate = {
  url: string;
  channel: "stable" | "preview";
  //已安装安装包的来源渠道，后端安装时记录；前端改配置时需原样带回，避免被重置
  installedChannel?: string;
};

export type UpdateState = {
  state: "idle" | "checking" | "downloading" | "downloaded" | "upToDate" | "error";
  error?: string;
  version?: string;
  notes?: string;
  percent?: number;
};

export enum WallpaperCoveredBehavior {
  //不做任何处理
  None,
  //暂停播放
  Pause,
  //停止播放
  Stop
}

export type ConfigWallpaper = {
  directories: string[];
  // keepWallpaper: boolean;
  coveredBehavior: WallpaperCoveredBehavior;
  defaultVideoPlayer: VideoPlayer;
};
