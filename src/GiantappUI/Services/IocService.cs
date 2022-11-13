using Microsoft.Extensions.DependencyInjection;
using NLog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GiantappUI.Services
{

    public class InitServiceOption
    {
        public string? AppName { get; set; }
    }

    //https://docs.microsoft.com/zh-cn/windows/communitytoolkit/mvvm/Ioc
    public class IocService
    {
        private IocService()
        {

        }
        public static void Init(InitServiceOption serviceOption, ServiceCollection services)
        {
            Services = ConfigureServices(serviceOption, services);
        }

        public static T? GetService<T>()
        {
            return Services!.GetService<T>();
        }

        private static IServiceProvider? Services;

        private static IServiceProvider ConfigureServices(InitServiceOption serviceOption, ServiceCollection services)
        {
            services.AddSingleton(serviceOption);

            services.AddSingleton(LogManager.GetCurrentClassLogger());
            services.AddSingleton<ConfigService>();
            services.AddSingleton<BaseAppService>();

            //services.AddTransient<MainViewModel>();
            //services.AddTransient<ProjectsViewModel>();
            //services.AddSingleton<ISettingsService, SettingsService>();
            //services.AddSingleton<IClipboardService, ClipboardService>();
            //services.AddSingleton<IShareService, ShareService>();
            //services.AddSingleton<IEmailService, EmailService>();

            return services.BuildServiceProvider();
        }
    }
}
