using Caliburn.Micro;
using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;

namespace LiveWallpaper.ViewModels
{
    public class ContextMenuViewModel : Screen
    {
        private Logger _logger = NLog.LogManager.GetCurrentClassLogger();
        private IWindowManager _windowManager;

        public ContextMenuViewModel(IWindowManager windowManager)
        {
            _windowManager = windowManager;
        }

        public void About()
        {
            try
            {
                Process.Start("https://mscoder.cn/products/LiveWallpaper.html");
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "About Ex");
            }
        }

        public void Config()
        {
            var vm = IoC.Get<ConfigViewModel>();
            _windowManager.ShowDialog(this, vm);
        }

        public void Main()
        {
            var vm = IoC.Get<MainViewModel>();
            if (vm.IsActive)
                vm.ActiveUI();
            else
                _windowManager.ShowWindow(vm);
        }

        public void ExitApp()
        {
            Application.Current.Shutdown();
        }
    }
}
