using Caliburn.Micro;
using DZY.DotNetUtil.Helpers;
using LiveWallpaper.Settings;
using LiveWallpaper.Managers;
using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Dynamic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using LiveWallpaper.Events;
using DZY.DotNetUtil.WPF.Views;

namespace LiveWallpaper.ViewModels
{
    public class ContextMenuViewModel : Screen
    {
        private Logger _logger = NLog.LogManager.GetCurrentClassLogger();
        private IWindowManager _windowManager;
        private SettingViewModel _settingVM;
        IEventAggregator _eventAggregator;

        public ContextMenuViewModel(IWindowManager windowManager, IEventAggregator eventAggregator)
        {
            _windowManager = windowManager;
            _eventAggregator = eventAggregator;
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
            Config(null);
        }

        public void Config(object owner)
        {
            if (_settingVM != null)
                return;

            _settingVM = IoC.Get<SettingViewModel>();
            _settingVM.Deactivated += _settingVM_Deactivated;
            dynamic windowSettings = new ExpandoObject();
            if (owner == null)
                windowSettings.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            else
            {
                windowSettings.WindowStartupLocation = WindowStartupLocation.CenterOwner;
                windowSettings.Owner = owner;
            }
            _windowManager.ShowWindow(_settingVM, null, windowSettings);
        }

        private async void _settingVM_Deactivated(object sender, DeactivationEventArgs e)
        {
            _settingVM.Deactivated -= _settingVM_Deactivated;
            bool ok = _settingVM.DialogResult;
            if (ok)
            {
                await AppManager.ReApplySetting();
                await _eventAggregator.PublishOnUIThreadAsync(new SettingSaved());
            }
            _settingVM = null;
        }

        public void Main()
        {
            var vm = IoC.Get<MainViewModel>();
            if (vm.IsActive)
                vm.ActiveUI();
            else
            {
                dynamic windowSettings = new ExpandoObject();
                windowSettings.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                _windowManager.ShowWindow(vm, null, windowSettings);
            }
        }

        public void VIP()
        {
            var vm = AppManager.GetPurchaseViewModel();
            var view = new PurchaseView
            {
                DataContext = vm
            };
            view.Show();
        }
        public void QQ()
        {
            try
            {
                Process.Start("https://www.mscoder.cn/contact/");
            }
            catch (Exception)
            {
            }
        }
        public void ExitApp()
        {
            AppManager.Dispose();
            Application.Current.Shutdown();
        }
    }
}
