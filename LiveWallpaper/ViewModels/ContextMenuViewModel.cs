using Caliburn.Micro;
using DZY.DotNetUtil.Helpers;
using LiveWallpaper.Models.Settings;
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

        public async void Config()
        {
            if (_settingVM != null)
                return;

            _settingVM = IoC.Get<SettingViewModel>();
            dynamic settings = new ExpandoObject();
            var ok = _windowManager.ShowDialog(_settingVM, null, settings);
            if (ok != null && ok)
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
            Application.Current.Shutdown();
        }
    }
}
