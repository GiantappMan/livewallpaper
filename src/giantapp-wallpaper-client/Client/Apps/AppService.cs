#define DEBUG_LOCAL
using Client.Apps.Configs;
using Client.Libs;
using Client.UI;
using GiantappWallpaper;
using MultiLanguageForXAML.DB;
using MultiLanguageForXAML;
using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using WallpaperCore;
using ConfigWallpaper = Client.Apps.Configs.Wallpaper;
using System.IO;
using System.Linq;
using Microsoft.Win32;
using System.Threading.Tasks;
using System.Globalization;
using System.Text.Json;
using WallpaperCore.Libs;
using WallpaperCore.WallpaperRenders;
using Windows.Storage;

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

        //ScreenChanged
        SystemEvents.DisplaySettingsChanged += (s, e) =>
        {
            Debouncer.Shared.Delay(() =>
            {
                //拔插显示器，分辨率修改
                WallpaperApi.RePlayWallpaper();
                SaveSnapshot();
                _apiObject.TriggerRefreshPageEvent();
            }, 1000);
        };

        //用户锁屏
        SystemEvents.SessionSwitch += (s, e) =>
        {
            if (e.Reason == SessionSwitchReason.SessionLock)
            {
                //锁屏关闭壁纸
                SaveSnapshot();
                WallpaperApi.PauseWallpaper();
                //WallpaperApi.StopWallpaper();
            }
            else if (e.Reason == SessionSwitchReason.SessionUnlock)
            {

                WallpaperApi.ResumeWallpaper();

                //检查如果壁纸关了                
                //解锁重现运行，有些电脑锁屏自动杀进程
                //var snapshot = Configer.Get<WallpaperApiSnapshot>();
                //await WallpaperApi.RestoreFromSnapshot(snapshot);
            }
        };

        DownloadService.StatusChangedEvent += (s, e) =>
        {
            _apiObject.TriggerDownloadStatusChangedEvent();
        };
    }

    #region properties

    public static readonly string DomainStr = "client.giantapp.cn";
    public static readonly string TempDomainStr = "tmp." + DomainStr;
    public static readonly string ProductName = "LiveWallpaper3";
    public static string TempFolder { get; private set; } = Path.Combine(Path.GetTempPath(), ProductName);

    #endregion

    #region public
    internal static async Task Init()
    {
        //UWP 通过Package.appxmanifest注册启动协议
        if (!UWPHelper.IsRunningAsUwp())
            //注册启动协议
            RegisterUriScheme();

        //这里用绝对路径，因为从网页启动后，相对路径会报错
        string appPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        string uiPath = Path.Combine(appPath, "Assets/UI");

        //全局文件夹映射
        _globalFolderMapping = new()  {
            { DomainStr, uiPath  },
            {TempDomainStr, TempFolder }
        };

#if !(DEBUG_LOCAL && DEBUG)
        //检查单实例
        bool ok = CheckMutex();
        if (!ok)
        {
            _killOldProcess = KillOldProcess();
        }
#endif

        //配置初始化
        Configer.Init(ProductName);

        var generalConfig = Configer.Get<General>() ?? new();//常规设置
        var wallpaperConfig = Configer.Get<ConfigWallpaper>() ?? new();//壁纸设置
        WallpaperApi.DefaultVideoPlayer = wallpaperConfig.DefaultVideoPlayer;
        PlaylistRender.PlaylistChanged += PlaylistRender_PlaylistChanged;
        //从快照恢复壁纸
        var snapshot = Configer.Get<WallpaperApiSnapshot>();
        if (snapshot != null)
        {
            await WallpaperApi.RestoreFromSnapshot(snapshot);
            //重新获取快照，有可能pid重新生成了
            SaveSnapshot();
        }


        //多语言初始化
        string path = "Client.Assets.Languages";
        generalConfig.CheckLan();
        LanService.Init(new EmbeddedJsonDB(path), true, generalConfig.CurrentLan, "en");

        //托盘初始化
        _notifyIcon.Init();

#if !(DEBUG_LOCAL && DEBUG)
        //除了需要刷新的页面和本地调试用，其他可以不设
        //ShellWindow.RewriteMapping = new()
        //{
        //    {"/hub","/hub.html" },
        //    {"/about","/about.html" },
        //    { "/settings(.*)", "/settings(.*).html" },
        //    {"/zh","/zh.html" },
        //    {"/en","/en.html" },
        //};
        ShellWindow.AutoAppendHtmlDomains = new[] { DomainStr };
#endif

        ApplySaveFolderMapping(wallpaperConfig.EnsureDirectories());

        //前端api
        ApiObject.ConfigSetAfterEvent += Api_SetConfigEvent;
        ApiObject.CorrectConfigEvent += ApiObject_CorrectConfigEvent;
        ShellWindow.ClientApi = _apiObject;
        ShellWindow.Origins = new[] {
            "http://localhost:3001",
            "http://localhost:3000",
            "https://wallpaper.giantapp.cn",
            "https://www.giantapp.cc"
        };

        bool tmp = await _autoStart.Check();
        if (tmp != generalConfig.AutoStart)
        {
            generalConfig.AutoStart = tmp;
            Configer.Set(generalConfig, out _);
        }
        await _autoStart.Set(generalConfig.AutoStart);

        //外观配置
        var appearance = Configer.Get<Appearance>() ?? new();
        ApplyTheme(appearance);

        if (_killOldProcess || generalConfig != null && !generalConfig.HideWindow)
            ShowShell();
    }

    //保存快照，下次启动可恢复
    internal static void SaveSnapshot()
    {
        var status = WallpaperApi.GetSnapshot();
        //保存到配置文件
        Configer.Set(status, out _, true);
    }

    internal static void ApplyTheme(Appearance? config)
    {
        if (config == null)
            return;

        string modeStr = CultureInfo.CurrentCulture.TextInfo.ToTitleCase(config.Mode);
        Enum.TryParse<Mode>(modeStr, out var mode);
        ShellWindow.SetTheme(config.Theme, mode);
    }

    internal static void ShowShell(string? path = null)
    {
        var config = Configer.Get<General>() ?? new();
        config.CheckLan();

        string url = $"https://{DomainStr}/{config.CurrentLan}";
#if DEBUG_LOCAL && DEBUG
        //if (path == "index")
        //    path = null;
        //本地开发
        url = $"http://localhost:3000/{config.CurrentLan}";
        //ShellWindow.ShowShell($"http://localhost:3000/{config.CurrentLan}/{path}");
        //return;
#else
        //ShellWindow.ShowShell($"https://{DomainStr}/{config.CurrentLan}/{path}");
#endif
        if (!string.IsNullOrEmpty(path))
            url += $"/{path}";
        ShellWindow.ShowShell(url);

    }

    internal static async void Exit()
    {
        var config = Configer.Get<ConfigWallpaper>() ?? new();
        if (!config.KeepWallpaper)
        {
            await WallpaperApi.Dispose();
            Configer.Set<WallpaperApiSnapshot?>(null, out _, true);
        }
        //退出
        System.Windows.Application.Current.Shutdown();
        DeskTopHelper.Refresh();
    }

    internal static string? ConvertPathToUrl(ConfigWallpaper? wallpaperConfig, string? path)
    {
        //把壁纸目录，转换成对应的Url
        if (wallpaperConfig == null || path == null)
            return null;

        var directories = wallpaperConfig.EnsureDirectories();
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

        var directories = wallpaperConfig.EnsureDirectories();
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

    //打开文件夹
    public static void OpenFolder(string path)
    {
        try
        {
            string? targetPath = path;

            if (UWPHelper.IsRunningAsUwp())
                targetPath = GetUwpRealPath(path);

            //uwp映射路径不存在，真实路径却存在
            //感觉uwp映射路径没有生成文件了？ 2024.6
            if (!File.Exists(targetPath) && !Directory.Exists(targetPath) &&
                (File.Exists(path) || Directory.Exists(path)))
                targetPath = path;

            Process.Start("Explorer.exe", $" /select, {targetPath}");
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "OpenFolder");
        }
    }

    public static void OpenLogFolder()
    {
        if (NLogHelper.Folder != null)
            OpenFolder(NLogHelper.Folder);
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
            return;

        var dict = new Dictionary<string, string>(_globalFolderMapping);
        int index = 0;
        foreach (var item in directories)
        {
            string url = $"{index++}.{DomainStr}";
            dict.Add(url, item);
        }

        ShellWindow.ApplyCustomFolderMapping(dict);
    }

    private static void RegisterUriScheme()
    {
        //启动exe
        string applicationPath = Assembly.GetExecutingAssembly().Location;

        RegistryKey key = Registry.CurrentUser.OpenSubKey("SOFTWARE\\Classes", true);
        RegistryKey subkey = key.CreateSubKey(ProductName);
        subkey.SetValue("", "URL:livewallpaper3");
        subkey.SetValue("URL Protocol", "");

        //RegistryKey defaultIcon = subkey.CreateSubKey("DefaultIcon");
        //defaultIcon.SetValue("", "\"" + applicationPath + "\",1");

        RegistryKey command = subkey.CreateSubKey(@"shell\open\command");
        command.SetValue("", "\"" + applicationPath + "\" \"%1\"");
    }

    private static string? GetUwpRealPath(string? path)
    {
        try
        {
            if (path == null)
                return null;
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            //uwp 真实存储路径不一样
            //https://stackoverflow.com/questions/48849076/uwp-app-does-not-copy-file-to-appdata-folder
            if (path.Contains(appData))
            {
                string realAppData = Path.Combine(ApplicationData.Current.LocalCacheFolder.Path, "Local");
                path = path.Replace(appData, realAppData);
            }

            return path;
        }
        catch (Exception)
        {
            return path;
        }
    }
    #endregion

    #region callback

    private static void PlaylistRender_PlaylistChanged(object sender, EventArgs e)
    {
        SaveSnapshot();
    }

    //发送给前端的配置，需要修改的时候
    private static async void ApiObject_CorrectConfigEvent(object sender, CorrectConfigEventArgs e)
    {
        switch (e.Key)
        {
            case General.FullName:
                var configGeneral = JsonSerializer.Deserialize<General>(e.Json, WallpaperApi.JsonOptitons) ?? new();
                bool tmp = await _autoStart.Check();
                configGeneral.AutoStart = tmp;//用真实情况修改返回值
                e.Corrected = configGeneral;
                break;
            case ConfigWallpaper.FullName:
                var configWallpaper = JsonSerializer.Deserialize<ConfigWallpaper>(e.Json, WallpaperApi.JsonOptitons);
                if (configWallpaper == null || configWallpaper.Directories.Length == 0)
                {
                    configWallpaper ??= new();
                    configWallpaper.Directories = configWallpaper.EnsureDirectories();
                    e.Corrected = configWallpaper;
                }
                break;
            case Appearance.FullName:
                var configApperance = JsonSerializer.Deserialize<Appearance>(e.Json, WallpaperApi.JsonOptitons);
                if (configApperance == null)
                {
                    configApperance = new();
                    e.Corrected = configApperance;
                }
                break;
        }
    }

    //修改配置后的回调
    private static async void Api_SetConfigEvent(object sender, ConfigSetAfterEventArgs e)
    {
        switch (e.Key)
        {
            case Appearance.FullName:
                var configApperance = JsonSerializer.Deserialize<Appearance>(e.Json, WallpaperApi.JsonOptitons);
                if (configApperance != null)
                {
                    ApplyTheme(configApperance);
                }
                break;
            case General.FullName:
                var configGeneral = JsonSerializer.Deserialize<General>(e.Json, WallpaperApi.JsonOptitons);
                if (configGeneral != null)
                {
                    await _autoStart.Set(configGeneral.AutoStart);
                    _notifyIcon.UpdateNotifyIconText(configGeneral.CurrentLan);
                }
                break;
            case ConfigWallpaper.FullName:
                var configWallpaper = JsonSerializer.Deserialize<ConfigWallpaper>(e.Json, WallpaperApi.JsonOptitons);
                ConfigWallpaper? oldConfig = null;
                if (!string.IsNullOrEmpty(e.OldJson))
                    oldConfig = JsonSerializer.Deserialize<ConfigWallpaper>(e.OldJson, WallpaperApi.JsonOptitons);

                if (configWallpaper != null)
                {
                    if (WallpaperApi.Settings.CoveredBehavior != configWallpaper.CoveredBehavior)
                    {
                        WallpaperApi.Settings.CoveredBehavior = configWallpaper.CoveredBehavior;
                        SaveSnapshot();
                    }

                    //保存目录发生变化
                    if (oldConfig?.Directories == null || !configWallpaper.Directories.SequenceEqual(oldConfig.Directories))
                    {
                        ApplySaveFolderMapping(configWallpaper.EnsureDirectories());
                        _apiObject.TriggerRefreshPageEvent();
                    }
                    WallpaperApi.DefaultVideoPlayer = configWallpaper.DefaultVideoPlayer;
                }
                break;
        }
    }

    #endregion
}
