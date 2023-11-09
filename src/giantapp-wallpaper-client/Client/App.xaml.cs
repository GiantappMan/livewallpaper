using Client.UI;
using MultiLanguageForXAML;
using MultiLanguageForXAML.DB;
using System.Diagnostics;
using System.Threading;
using System;
using System.Windows;
using Client.Libs;
using NLog;
using Client.Apps;
using Client.Apps.Configs;

namespace GiantappWallpaper;

public partial class App : Application
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    //是否存关闭老进程
    private bool _killOldProcess = false;
    public App()
    {
        //多语言初始化
        string path = "Client.Assets.Languages";
        LanService.Init(new EmbeddedJsonDB(path), true, "en");

        //配置初始化
        Configer.Init(AppService.ProductName);

        //日志初始化
        NLogHelper.Init(AppService.ProductName);

        //托盘初始化
        AppNotifyIcon notifyIcon = new();
        notifyIcon.Init();

        //检查单实例
        bool ok = CheckMutex();
        if (!ok)
        {
            _killOldProcess = KillOldProcess();
        }
    }

    #region override

    protected override void OnStartup(StartupEventArgs e)
    {
        _logger.Info($"{AppService.ProductName} Start");
        //业务逻辑初始化
        AppService.Init();
        //杀了进程，或者取配置显示窗口
        var config = Configer.Get<General>();
        if (_killOldProcess || config != null && !config.HideWindow)
            ShellWindow.ShowShell();
        base.OnStartup(e);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _logger.Info($"{AppService.ProductName} Exit");
        base.OnExit(e);
    }

    #endregion

    #region private

    private bool CheckMutex()
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

    private Mutex? _mutex;
    private bool KillOldProcess()
    {
        var res = false;
        string[] AppNames = new string[] {/*暂时支持一起开，方便下壁纸"LiveWallpaper2",*/ "LiveWallpaper3" };
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
}
