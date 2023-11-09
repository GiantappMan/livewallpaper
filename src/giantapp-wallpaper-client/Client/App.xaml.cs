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
    }

    #region override

    protected override void OnStartup(StartupEventArgs e)
    {
        _logger.Info($"{AppService.ProductName} Start");
        AppService.Init();
        base.OnStartup(e);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _logger.Info($"{AppService.ProductName} Exit");
        base.OnExit(e);
    }

    #endregion
}
