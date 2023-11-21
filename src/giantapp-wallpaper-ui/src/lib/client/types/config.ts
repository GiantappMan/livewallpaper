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
  keepWallpaper: boolean;
};
