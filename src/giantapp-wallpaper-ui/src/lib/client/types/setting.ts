export type SettingAppearance = {
  theme: string;
  mode: "system" | "light" | "dark";
};

export type SettingGeneral = {
  autoStart: boolean;
  hideWindow: boolean;
};

export type SettingWallpaper = {
  directories: string[];
};
