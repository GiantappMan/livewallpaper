using Caliburn.Micro;
using Hardcodet.Wpf.TaskbarNotification;
using LiveWallpaper.Managers;
using LiveWallpaper.ViewModels;
using LiveWallpaperEngineAPI;
using MultiLanguageForXAML;
using System;
using System.Drawing;
using System.Reflection;
using System.Threading;
using System.Windows;

namespace LiveWallpaper
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        private TaskbarIcon notifyIcon;
        private static NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        private Mutex mutex;

        public App()
        {
            Init();
        }

        private void Init()
        {
            try
            {
                //异常捕获
                AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
                Current.DispatcherUnhandledException += Current_DispatcherUnhandledException;
                //程序启动必要初始化
                AppManager.InitMuliLanguage();
                AppManager.InitlizeSetting();
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
        }

        protected override async void OnStartup(StartupEventArgs e)
        {
            try
            {
                mutex = new Mutex(true, "Livewallpaper", out bool ret);

                if (!ret)
                {
                    string msg = await LanService.Get("mainUI_programRunning");
                    MessageBox.Show(msg);
                    Environment.Exit(0);
                    return;
                }
                base.OnStartup(e);

                //托盘初始化
                notifyIcon = (TaskbarIcon)FindResource("NotifyIcon");
                notifyIcon.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
                var container = IoC.Get<SimpleContainer>();
                container.Instance(notifyIcon);
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
        }

        private void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            var ex = e.ExceptionObject as Exception;
            logger.Error(ex);
            MessageBox.Show(ex.Message);
        }

        private void Current_DispatcherUnhandledException(object sender, System.Windows.Threading.DispatcherUnhandledExceptionEventArgs e)
        {
            var ex = e.Exception;
            logger.Error(ex);
            MessageBox.Show(ex.Message);
        }

        protected override void OnExit(ExitEventArgs e)
        {
            WallpaperManager.Instance.Dispose();
            NLog.LogManager.Shutdown();
            notifyIcon.Dispose();
            base.OnExit(e);
        }

        private void TaskbarIcon_TrayMouseDoubleClick(object sender, RoutedEventArgs e)
        {
            var vm = IoC.Get<ContextMenuViewModel>(nameof(ContextMenuViewModel));
            if (vm != null)
                vm.Main();
        }

        private void Application_SessionEnding(object sender, SessionEndingCancelEventArgs e)
        {
            //关机时恢复系统壁纸，防止开机黑屏
            //HandlerWallpaper.DesktopWallpaperAPI.Enable(true);
            WallpaperManager.Instance.Dispose();
        }
    }
}
