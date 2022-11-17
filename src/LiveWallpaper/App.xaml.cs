using GiantappUI.Services;
using LiveWallpaper.NotifyIcons;
using LiveWallpaper.Services;
using Microsoft.Extensions.DependencyInjection;
using System.Windows;
namespace LiveWallpaper
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        public App()
        {
            AppNotifyIcon notifyIcon = new();
            notifyIcon.Init();

            //基础服务初始化
            var services = new ServiceCollection();
            services.AddSingleton<AppService>();
            IocService.Init(new InitServiceOption() { AppName = nameof(LiveWallpaper) }, services);

            var appService = IocService.GetService<AppService>()!;
            appService.Init();
        }
    }
}
