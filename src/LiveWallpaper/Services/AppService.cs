using GiantappUI.Helpers;
using GiantappUI.Services;
using MultiLanguageForXAML.DB;
using MultiLanguageForXAML;
using NLog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace LiveWallpaper.Services
{

    internal class AppService : BaseAppService
    {
        #region fileds

        readonly DesktopStartupHelper _desktopStartupHelper;
        readonly ConfigService _configService;
        #endregion

        public AppService(InitServiceOption option, Logger logger, ConfigService configService) : base(option, logger, configService)
        {
            _configService = configService;
            string exePath = Assembly.GetEntryAssembly()!.Location.Replace(".dll", ".exe");
            _desktopStartupHelper = new("LiveWallpaper3", exePath);
        }
        #region properties
        public EventHandler<UserConfigs.Setting>? SettingChanged;
        #endregion

        #region public
        internal void Init()
        {
            //全局捕获异常
            CatchApplicationError();
            var lanSetting = LoadUserConfig<UserConfigs.Languages>();
            //多语言初始化
            string i18nDir = Path.Combine(ApptEntryDir, "Assets\\Languages");
            LanService.Init(new JsonFileDB(i18nDir), true, lanSetting?.CurrentLan, "en");

            var appSetting = LoadUserConfig<UserConfigs.Setting>();
            ApplySetting(appSetting);
        }
        internal T LoadUserConfig<T>() where T : new()
        {
            var res = _configService.LoadUserConfig<T>();
            return res;
        }
        internal Task<T> LoadUserConfigAsync<T>() where T : new()
        {
            return Task.Run(() => LoadUserConfig<T>());
        }
        internal void SaveUserConfig(object config)
        {
            _configService.SaveUserConfig(config);
        }
        internal Task SaveUserConfigAsync(object config)
        {
            return Task.Run(() => SaveUserConfig(config));
        }
        internal bool CheckRunWhenStarts()
        {
            var r = _desktopStartupHelper.Check();
            return r;
        }
        internal void ApplySetting(UserConfigs.Setting setting)
        {
            _desktopStartupHelper.Set(setting.RunWhenStarts);
            SettingChanged?.Invoke(this, setting);
        }
        #endregion
    }
}
