using Caliburn.Micro;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using LiveWallpaper.ViewModels;
using LiveWallpaper.Managers;
using LiveWallpaperEngineLib;

namespace LiveWallpaper
{
    public class Bootstrapper : BootstrapperBase
    {
        private SimpleContainer container;
        private static NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();

        public Bootstrapper()
        {
            Initialize();
        }

        protected override void Configure()
        {
            WallpaperManager.Initlize();

            //自定义消息拦截
            container = new SimpleContainer();

            container.Instance(container)
            .Singleton<IEventAggregator, EventAggregator>()
            .Singleton<IWindowManager, WindowManager>()
            .Singleton<ContextMenuViewModel>(nameof(ContextMenuViewModel))
            .Singleton<MainViewModel>(nameof(MainViewModel))
            .PerRequest<CreateWallpaperViewModel>()
            .PerRequest<SettingViewModel>();
        }

        protected override void OnStartup(object sender, StartupEventArgs e)
        {
#if UWP
            logger.Info("OnStartup UWP");
#else
            logger.Info("OnStartup WPF");
#endif

            //if (!AppManager.Setting.General.MinimizeUI)
            DisplayRootViewFor<MainViewModel>();
        }

        protected override object GetInstance(Type service, string key)
        {
            return container.GetInstance(service, key);
        }

        protected override IEnumerable<object> GetAllInstances(Type service)
        {
            return container.GetAllInstances(service);
        }

        protected override void BuildUp(object instance)
        {
            container.BuildUp(instance);
        }
    }
}
