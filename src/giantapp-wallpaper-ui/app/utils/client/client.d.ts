interface API {
  GetConfig(key: string): Promise<string>;
  SetConfig(key: string, value: string);
  GetWallpapers(): Promise<string>;
  GetScreens(): Promise<string>;
  ShowWallpaper(wallpaper: string);
  PlayPrevInPlaylist(wallpaper: string);
  PlayNextInPlaylist(wallpaper: string);
  GetPlayingStatus(): Promise<string>;
  PauseWallpaper(screenIndex?: number): Promise<void>;
  ResumeWallpaper(screenIndex?: number): Promise<void>;
  StopWallpaper(screenIndex?: number): Promise<void>;
  SetVolume(volume: string, screenIndex?: string): Promise<void>;
  GetVersion(): Promise<string>;
  OpenUrl(url: string): Promise<void>;
  UploadToTmp(fileName: string, content: string): Promise<string>;
  CreateWallpaper(title: string, coverUrl: string, pathUrl: string): Promise<boolean>;
  CreateWallpaperNew(wallpaperJson: string): Promise<boolean>;
  UpdateWallpaperNew(wallpaperJson: string, oldPath: string): Promise<boolean>;
  DeleteWallpaper(wallpaperJSON: string): Promise<boolean>;
  Explore(path: string): Promise<void>;
  SetWallpaperSetting(wallpaperJSON: string, settingJSON: string): Promise<boolean>;
  DownloadWallpaper(coverUrl: string, wallpaperUrl: string, wallpaperMetaJson: string): Promise<boolean>;
  CancelDownloadWallpaper(id: string): Promise<boolean>;
  GetDownloadItemStatus(id: string): Promise<string>;
  OpenStoreReview(defaultUrl: string): Promise<boolean>;
  GetRealThemeMode(): string;
  OpenLogFolder(): void;
  addEventListener(type: string, listener: (e: any) => void);
}

interface Shell {
  ShowFolderDialog(): Promise<string>;
  HideLoading();
  CloseWindow();
}

interface Window {
  chrome: {
    webview: {
      hostObjects: {
        sync: {
          api: API;
          shell: Shell;
        };
        api: API;
        shell: Shell;
      };
    };
  };
}
