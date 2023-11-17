interface API {
  GetConfig(key: string): Promise<string>;
  SetConfig(key: string, value: string);
  GetWallpapers(): Promise<string>;
  GetScreens(): Promise<string>;
  ShowWallpaper(wallpaper: string, screenIndex: number | null);
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
