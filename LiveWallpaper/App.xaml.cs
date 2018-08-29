using Caliburn.Micro;
using Hardcodet.Wpf.TaskbarNotification;
using LiveWallpaper.Services;
using LiveWallpaper.ViewModels;
using MultiLanguageManager;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
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

        public App()
        {
            //异常捕获
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
            Current.DispatcherUnhandledException += Current_DispatcherUnhandledException;
            AppService.Initlize();
        }

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            //托盘初始化
            notifyIcon = (TaskbarIcon)FindResource("NotifyIcon");
            notifyIcon.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
            var container = IoC.Get<SimpleContainer>();
            container.Instance(notifyIcon);
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
    }
}
