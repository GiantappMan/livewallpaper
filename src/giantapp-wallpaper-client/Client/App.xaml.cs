using System.Windows;
using Client.Libs;
using NLog;
using Client.Apps;

namespace GiantappWallpaper;

public partial class App : Application
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();

    public App()
    {
        //日志初始化
        NLogHelper.Init(AppService.ProductName);
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
