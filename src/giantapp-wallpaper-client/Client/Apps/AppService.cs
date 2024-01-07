#define DEBUG_LOCAL
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
using System.Linq;
using System.Reflection;
using System.Threading;
using WallpaperCore;
using ConfigWallpaper = Client.Apps.Configs.Wallpaper;
using System.IO;

namespace Client.Apps;

/// <summary>
/// 每一个程序的特定业务逻辑，不通用代码
/// </summary>
internal class AppService
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private static readonly AutoStart _autoStart;
    private static readonly AppNotifyIcon _notifyIcon = new();
    private static readonly ApiObject _apiObject = new();

    //是否存关闭老进程
    private static bool _killOldProcess = false;

    private static Dictionary<string, string> _globalFolderMapping = new();

    static AppService()
    {
        string exePath = Assembly.GetEntryAssembly()!.Location.Replace(".dll", ".exe");
        _autoStart = new(ProductName, exePath);
    }
    #region properties

    public static readonly string DomainStr = "client.giantapp.cn";
    public static readonly string TempDomainStr = "tmp." + DomainStr;
    public static readonly string ProductName = "LiveWallpaper3";
    public static string TempFolder { get; private set; } = Path.Combine(Path.GetTempPath(), ProductName);

    #endregion
    #region public
    internal static async void Init()
    {
        //全局文件夹映射
        _globalFolderMapping = new()  {
            { DomainStr, "Assets/UI" },
            {TempDomainStr, TempFolder }
        };

        //检查单实例
        bool ok = CheckMutex();
        if (!ok)
        {
            _killOldProcess = KillOldProcess();
        }

        //配置初始化
        Configer.Init(ProductName);

        //从快照恢复壁纸
        var snapshot = Configer.Get<WallpaperApiSnapshot>();
        if (snapshot != null)
        {
            await WallpaperApi.RestoreFromSnapshot(snapshot);
            //重新获取快照，有可能pid重新生成了
            Configer.Set(WallpaperApi.GetSnapshot(), true);
        }

        var generalConfig = Configer.Get<General>() ?? new();//常规设置
        var wallpaperConfig = Configer.Get<ConfigWallpaper>() ?? new();//壁纸设置

        //多语言初始化
        string path = "Client.Assets.Languages";
        LanService.Init(new EmbeddedJsonDB(path), true, generalConfig.CurrentLan, "en");

        //托盘初始化
        _notifyIcon.Init();

#if !(DEBUG_LOCAL && DEBUG)
        //除了需要刷新的页面和本地调试用，其他可以不设
        ShellWindow.RewriteMapping = new()
        {
            {"/index","/index.html" },
            {"/community","/community.html" },
            { "/settings(.*)", "/settings(.*).html" },
        };
#endif

        ApplySaveFolderMapping(wallpaperConfig.Directories);

        //前端api
        ApiObject.ConfigSetAfterEvent += Api_SetConfigEvent;
        ApiObject.CorrectConfigEvent += ApiObject_CorrectConfigEvent;
        ShellWindow.ClientApi = _apiObject;

        bool tmp = await _autoStart.Check();
        if (tmp != generalConfig.AutoStart)
        {
            generalConfig.AutoStart = tmp;
            Configer.Set(generalConfig);
        }
        await _autoStart.Set(generalConfig.AutoStart);

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

    internal static void ShowShell(string? path = "index")
    {
#if DEBUG_LOCAL && DEBUG
        if (path == "index")
            path = null;
        //本地开发
        ShellWindow.ShowShell($"http://localhost:3000/{path}");
        return;
#else
        ShellWindow.ShowShell($"https://{_domainStr}/{path}");
#endif
    }

    internal static void Exit()
    {
        var config = Configer.Get<ConfigWallpaper>() ?? new();
        if (!config.KeepWallpaper)
        {
            WallpaperApi.Dispose();
            Configer.Set<WallpaperApiSnapshot?>(null, true);
        }
        //退出
        System.Windows.Application.Current.Shutdown();
        DesktopManager.Refresh();
    }
    internal static string? ConvertPathToUrl(ConfigWallpaper? wallpaperConfig, string? path)
    {
        //把壁纸目录，转换成对应的Url
        if (wallpaperConfig == null || path == null)
            return null;

        var directories = wallpaperConfig.Directories ?? ConfigWallpaper.DefaultWallpaperSaveFolder;
        for (int i = 0; i < directories.Length; i++)
        {
            var item = directories[i];
            if (path.StartsWith(item + "\\"))
            {
                path = $"https://{i}.{DomainStr}{path[item.Length..]}";
                //replase \\ to //
                path = path.Replace("\\", "/");
                break;
            }
        }
        return path;
    }

    internal static string? ConvertUrlToPath(ConfigWallpaper? wallpaperConfig, string? path)
    {
        //把Url转换成本地路径
        if (wallpaperConfig == null || path == null)
            return null;

        var directories = wallpaperConfig.Directories ?? ConfigWallpaper.DefaultWallpaperSaveFolder;
        for (int i = 0; i < directories.Length; i++)
        {
            var item = directories[i];
            if (path.StartsWith($"https://{i}.{DomainStr}"))
            {
                path = $"{item}{path[$"https://{i}.{DomainStr}".Length..]}";
                path = path.Replace("/", "\\");
                break;
            }
        }
        return path;
    }

    internal static string ConvertTmpPathToUrl(string filename)
    {
        string path = $"https://{filename.Replace(TempFolder, TempDomainStr)}";
        path = path.Replace("\\", "/");
        return path;
    }

    internal static string ConvertUrlToTmpPath(string url)
    {
        if (url.Contains(TempDomainStr))
        {
            string path = url.Replace($"https://{TempDomainStr}", TempFolder);
            path = path.Replace("/", "\\");
            return path;
        }
        return url;
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
    private static void ApplySaveFolderMapping(string[]? directories)
    {
        if (directories == null || directories.Length == 0)
            directories = ConfigWallpaper.DefaultWallpaperSaveFolder;

        var dict = new Dictionary<string, string>(_globalFolderMapping);
        int index = 0;
        foreach (var item in directories)
        {
            string url = $"{index++}.{DomainStr}";
            dict.Add(url, item);
        }

        ShellWindow.ApplyCustomFolderMapping(dict);
    }

    #endregion

    #region callback
    private static async void ApiObject_CorrectConfigEvent(object sender, CorrectConfigEventArgs e)
    {
        switch (e.Key)
        {
            case General.FullName:
                var configGeneral = JsonConvert.DeserializeObject<General>(e.Json) ?? new();
                bool tmp = await _autoStart.Check();
                configGeneral.AutoStart = tmp;//用真实情况修改返回值
                e.Corrected = configGeneral;
                break;
            case ConfigWallpaper.FullName:
                var configWallpaper = JsonConvert.DeserializeObject<ConfigWallpaper>(e.Json);
                if (configWallpaper == null || configWallpaper.Directories.Length == 0)
                {
                    configWallpaper ??= new();
                    configWallpaper.Directories = ConfigWallpaper.DefaultWallpaperSaveFolder;
                    e.Corrected = configWallpaper;
                }
                break;
        }
    }

    private static async void Api_SetConfigEvent(object sender, ConfigSetAfterEventArgs e)
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
                    await _autoStart.Set(configGeneral.AutoStart);
                    _notifyIcon.UpdateNotifyIconText(configGeneral.CurrentLan);
                }
                break;
            case ConfigWallpaper.FullName:
                var configWallpaper = JsonConvert.DeserializeObject<ConfigWallpaper>(e.Json);
                if (configWallpaper != null)
                {
                    ApplySaveFolderMapping(configWallpaper.Directories);
                    _apiObject.TriggerRefreshPageEvent();
                }
                break;
        }
    }

    #endregion
}
