using System.Windows;
using Client.Libs;
using NLog;
using Client.Apps;
using System.Security.Policy;

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

    protected override async void OnStartup(StartupEventArgs e)
    {
        _logger.Info($"{AppService.ProductName} Start {string.Join(" ", e.Args)}");
        await AppService.Init();
        //读取参数
        if (e.Args.Length > 0)
        {
            string parameter = e.Args[0]["livewallpaper3://".Length..];
            AppService.ShowShell($"hub?target={parameter}");
        }

        base.OnStartup(e);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _logger.Info($"{AppService.ProductName} Exit");
        base.OnExit(e);
    }

    #endregion
}
