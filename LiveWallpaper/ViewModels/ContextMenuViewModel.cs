using Caliburn.Micro;
using DZY.DotNetUtil.Helpers;
using LiveWallpaper.Settings;
using LiveWallpaper.Services;
using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Dynamic;
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
        private SettingViewModel _settingVM;

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
            if (_settingVM != null)
                return;

            _settingVM = IoC.Get<SettingViewModel>();
            _settingVM.Deactivated += _settingVM_Deactivated;
            _windowManager.ShowWindow(_settingVM, null);
        }

        private async void _settingVM_Deactivated(object sender, DeactivationEventArgs e)
        {
            _settingVM.Deactivated -= _settingVM_Deactivated;
            bool ok = _settingVM.DialogResult;
            if (ok)
            {
                var config = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(AppService.SettingPath);
                await AppService.ApplySetting(config);
            }
            _settingVM = null;
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
            AppService.Dispose();
            Application.Current.Shutdown();
        }
    }
}
