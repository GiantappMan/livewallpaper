using Client.Apps.Configs;
using Client.Libs;
using GiantappWallpaper;
using Newtonsoft.Json;
using NLog;
using System;
using System.Diagnostics;
using System.IO;
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

    private static readonly AutoStart autoStart;
    //是否存关闭老进程
    private static bool _killOldProcess = false;

    static AppService()
    {
        string exePath = Assembly.GetEntryAssembly()!.Location.Replace(".dll", ".exe");
        autoStart = new(ProductName, exePath);
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

        //前端api
        var api = new ApiObject();
        ApiObject.ConfigSetAfterEvent += Api_SetConfigEvent;
        ApiObject.CorrectConfigEvent += ApiObject_CorrectConfigEvent;
        ShellWindow.ClientApi = api;

        //常规设置
        var general = Configer.Get<General>() ?? new();
        bool tmp = autoStart.Check();
        if (tmp != general.AutoStart)
        {
            general.AutoStart = tmp;
            Configer.Set(general);
        }
        autoStart.Set(general.AutoStart);

        if (_killOldProcess || general != null && !general.HideWindow)
            ShellWindow.ShowShell();

        //外观配置
        var appearance = Configer.Get<Appearance>() ?? new();
        ApplyTheme(appearance);
    }

    internal static void ApplyTheme(Appearance? config)
    {
        if (config == null)
            return;
        ShellWindow.SetTheme(config.Theme, config.Mode);
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
                    bool tmp = autoStart.Check();
                    configGeneral.AutoStart = tmp;//用真实情况修改返回值
                    e.Corrected = configGeneral;
                }
                break;
            case Wallpaper.FullName:
                var configWallpaper = JsonConvert.DeserializeObject<Wallpaper>(e.Json) ?? new();
                if (configWallpaper.Directories.Length == 0)
                {
                    //给默认值
                    string folder = GetDefaultWallpaperSaveFolder();
                    configWallpaper.Directories = new string[] { folder };
                    e.Corrected = configWallpaper;
                }
                break;
        }
    }

    internal static string GetDefaultWallpaperSaveFolder()
    {
        if (Directory.Exists(@"D:\"))
            return @"D:\LiveWallpaper";

        string folder = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
        folder = Path.Combine(folder, "LiveWallpaper");
        return folder;
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
                    autoStart.Set(configGeneral.AutoStart);
                }
                break;
        }
    }
    #endregion
}
