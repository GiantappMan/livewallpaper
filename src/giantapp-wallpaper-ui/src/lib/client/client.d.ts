interface API {
  GetConfig(key: string): Promise<string>;
  SetConfig(key: string, value: string);
  GetWallpapers(): Promise<string>;
  GetScreens(): Promise<string>;
  ShowWallpaper(wallpaper: string);
  GetPlayingPlaylist(): Promise<string>;
  PauseWallpaper(screenIndex?: number): Promise<void>;
  ResumeWallpaper(screenIndex?: number): Promise<void>;
  StopWallpaper(screenIndex?: number): Promise<void>;
  SetVolume(volume: string, screenIndex?: string): Promise<void>;
  GetVersion(): Promise<string>;
  OpenUrl(url: string): Promise<void>;
  UploadToTmp(fileName: string, content: string): Promise<string>;
  CreateWallpaper(title: string, path: string): Promise<boolean>;
  DeleteWallpaper(wallpaperJSON: string): Promise<boolean>;
  addEventListener(type: string, listener: (e: any) => void);
}

interface Shell {
  ShowFolderDialog(): Promise<string>;
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
