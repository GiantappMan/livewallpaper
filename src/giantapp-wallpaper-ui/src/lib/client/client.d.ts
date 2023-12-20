interface API {
  GetConfig(key: string): Promise<string>;
  SetConfig(key: string, value: string);
  GetWallpapers(): Promise<string>;
  GetScreens(): Promise<string>;
  ShowWallpaper(wallpaper: string);
  GetPlayingPlaylist(): Promise<string>;
  PauseWallpaper(screenIndex?: number): Promise<void>;
  ResumeWallpaper(screenIndex?: number): Promise<void>;
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
