using Client.Apps.Configs;
using Client.Libs;
using Client.UI;
using GiantappWallpaper;
using MultiLanguageForXAML.DB;
using MultiLanguageForXAML;
using Newtonsoft.Json;
using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;

namespace Client.Apps;

/// <summary>
/// 每一个程序的特定业务逻辑，不通用代码
/// </summary>
internal class AppService
{
    public static readonly string ProductName = "LiveWallpaper3";
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private static readonly AutoStart _autoStart;
    private static readonly AppNotifyIcon _notifyIcon = new();
    static readonly string _domainStr = "client.giantapp.cn";
    //是否存关闭老进程
    private static bool _killOldProcess = false;

    static AppService()
    {
        string exePath = Assembly.GetEntryAssembly()!.Location.Replace(".dll", ".exe");
        _autoStart = new(ProductName, exePath);
    }

    #region public
    internal static void Init()
    {
        //检查单实例
        bool ok = CheckMutex();
        if (!ok)
        {
            _killOldProcess = KillOldProcess();
        }

        //配置初始化
        Configer.Init(ProductName);

        var generalConfig = Configer.Get<General>() ?? new();//常规设置
        var wallpaperConfig = Configer.Get<Wallpaper>() ?? new();//壁纸设置

        //多语言初始化
        string path = "Client.Assets.Languages";
        LanService.Init(new EmbeddedJsonDB(path), true, generalConfig.CurrentLan, "en");

        //托盘初始化
        _notifyIcon.Init();

        //ShellWindow初始化
        ShellWindow.CustomFolderMapping = new()
        {
            { _domainStr, "Assets/UI" }
        };
        ApplyCustomFolderMapping(wallpaperConfig.Directories);

        //前端api
        var api = new ApiObject();
        ApiObject.ConfigSetAfterEvent += Api_SetConfigEvent;
        ApiObject.CorrectConfigEvent += ApiObject_CorrectConfigEvent;
        ShellWindow.ClientApi = api;

        bool tmp = _autoStart.Check();
        if (tmp != generalConfig.AutoStart)
        {
            generalConfig.AutoStart = tmp;
            Configer.Set(generalConfig);
        }
        _autoStart.Set(generalConfig.AutoStart);

        //外观配置
        var appearance = Configer.Get<Appearance>() ?? new();
        ApplyTheme(appearance);

        if (_killOldProcess || generalConfig != null && !generalConfig.HideWindow)
            ShowShell();
    }

    internal static void ApplyTheme(Appearance? config)
    {
        if (config == null)
            return;
        ShellWindow.SetTheme(config.Theme, config.Mode);
    }

    internal static void ShowShell(string? path = "index.html")
    {
#if DEBUG
        if (path == "index.html")
            path = null;
        //本地开发
        ShellWindow.ShowShell($"http://localhost:3000/{path}");
        return;
#else
        ShellWindow.ShowShell($"https://{_domainStr}/{path}");
#endif
    }

    internal static string? ConvertPathToUrl(string? path)
    {
        //把壁纸目录，转换成对应的Url
        if (path == null)
            return null;

        var wallpaperConfig = Configer.Get<Wallpaper>() ?? new();
        var directories = wallpaperConfig.Directories ?? Wallpaper.DefaultWallpaperSaveFolder;
        for (int i = 0; i < directories.Length; i++)
        {
            var item = directories[i];
            if (path.StartsWith(item))
            {
                path = $"https://{i}.{_domainStr}{path[item.Length..]}";
                break;
            }
        }
        return path;
    }

    internal static string? ConvertUrlToPath(string? path)
    {
        //把Url转换成本地路径
        if (path == null)
            return null;

        var wallpaperConfig = Configer.Get<Wallpaper>() ?? new();
        var directories = wallpaperConfig.Directories ?? Wallpaper.DefaultWallpaperSaveFolder;
        for (int i = 0; i < directories.Length; i++)
        {
            var item = directories[i];
            if (path.StartsWith($"https://{i}.{_domainStr}"))
            {
                path = $"{item}{path[$"https://{i}.{_domainStr}".Length..]}";
                break;
            }
        }
        return path;
       
    }

    #endregion

    #region private

    private static Mutex? _mutex;
    private static bool CheckMutex()
    {
        try
        {
            //兼容腾讯桌面，曲线救国...
            _mutex = new Mutex(true, "cxWallpaperEngineGlobalMutex", out bool ret);
            if (!ret)
            {
                return false;
            }
            _mutex.ReleaseMutex();
            return true;
        }
        catch (Exception ex)
        {
            _logger.Info(ex);
            return false;
        }
    }

    private static bool KillOldProcess()
    {
        var res = false;
        string[] AppNames = new string[] {/*暂时支持一起开，方便下壁纸"LiveWallpaper2",*/ProductName };
        //杀掉其他实例
        foreach (var AppName in AppNames)
        {
            try
            {
                var ps = Process.GetProcessesByName(AppName);
                var cp = Process.GetCurrentProcess();
                foreach (var p in ps)
                {
                    if (p.Id == cp.Id)
                        continue;
                    p.Kill();
                    res = true || res;
                }
            }
            catch (Exception ex)
            {
                _logger.Info(ex);
            }
        }
        return res;
    }

    //配置目录映射到网址
    private static void ApplyCustomFolderMapping(string[]? directories)
    {
        if (directories == null || directories.Length == 0)
            directories = Wallpaper.DefaultWallpaperSaveFolder;

        var dict = new Dictionary<string, string>();
        //第一个是网址和UI映射
        var first = ShellWindow.CustomFolderMapping.FirstOrDefault();
        dict.Add(first.Key, first.Value);

        int index = 0;
        foreach (var item in directories)
        {
            string url = $"{index++}.{_domainStr}";
            dict.Add(url, item);
        }

        ShellWindow.CustomFolderMapping = dict;
    }

    #endregion
    #region callback
    private static void ApiObject_CorrectConfigEvent(object sender, CorrectConfigEventArgs e)
    {
        switch (e.Key)
        {
            case General.FullName:
                var configGeneral = JsonConvert.DeserializeObject<General>(e.Json);
                if (configGeneral != null)
                {
                    bool tmp = _autoStart.Check();
                    configGeneral.AutoStart = tmp;//用真实情况修改返回值
                    e.Corrected = configGeneral;
                }
                break;
            case Wallpaper.FullName:
                var configWallpaper = JsonConvert.DeserializeObject<Wallpaper>(e.Json) ?? new();
                if (configWallpaper.Directories == null || configWallpaper.Directories.Length == 0)
                {
                    configWallpaper.Directories = Wallpaper.DefaultWallpaperSaveFolder;
                    e.Corrected = configWallpaper;
                }
                break;
        }
    }

    private static void Api_SetConfigEvent(object sender, ConfigSetAfterEventArgs e)
    {
        switch (e.Key)
        {
            case Appearance.FullName:
                var configApperance = JsonConvert.DeserializeObject<Appearance>(e.Json);
                if (configApperance != null)
                {
                    ApplyTheme(configApperance);
                }
                break;
            case General.FullName:
                var configGeneral = JsonConvert.DeserializeObject<General>(e.Json);
                if (configGeneral != null)
                {
                    _autoStart.Set(configGeneral.AutoStart);
                    _notifyIcon.UpdateNotifyIconText(configGeneral.CurrentLan);
                }
                break;
            case Wallpaper.FullName:
                var configWallpaper = JsonConvert.DeserializeObject<Wallpaper>(e.Json);
                if (configWallpaper != null)
                {
                    ApplyCustomFolderMapping(configWallpaper.Directories);
                }
                break;
        }
    }


    #endregion
}
