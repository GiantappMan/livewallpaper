interface API {
  GetConfig(key: string): Promise<string>;
  SetConfig(key: string, value: string);
}
interface Window {
  chrome: {
    webview: {
      hostObjects: {
        sync: {
          api: API;
        };
        api: API;
      };
    };
  };
}
