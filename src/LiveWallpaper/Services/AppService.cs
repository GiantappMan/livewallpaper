using GiantappUI.Helpers;
using GiantappUI.Services;
using MultiLanguageForXAML.DB;
using MultiLanguageForXAML;
using NLog;
using System;
using System.Reflection;
using System.Threading.Tasks;
using System.IO;
using System.Threading;
using System.Diagnostics;
using Microsoft.Toolkit.Uwp.Notifications;

namespace LiveWallpaper.Services
{
    internal class AppService : BaseAppService
    {
        #region fileds

        private Mutex? _mutex;
        readonly DesktopStartupHelper _desktopStartupHelper;
        readonly ConfigService _configService;
        private readonly Logger _logger = LogManager.GetCurrentClassLogger();

        #endregion

        public AppService(InitServiceOption option, Logger logger, ConfigService configService) : base(option, logger, configService)
        {
            _configService = configService;
            string exePath = Assembly.GetEntryAssembly()!.Location.Replace(".dll", ".exe");
            _desktopStartupHelper = new(AppName, exePath);
        }
        #region properties
        public EventHandler? SettingChanged = null;
        #endregion

        #region public
        internal void Init()
        {
            //全局捕获异常
            CatchApplicationError();
            var lanSetting = LoadUserConfig<Configs.LanguagesConfig>();

            //多语言初始化
            string i18nDir = Path.Combine(ApptEntryDir, "Assets\\Languages");
            LanService.Init(new JsonFileDB(i18nDir), true, lanSetting?.CurrentLan, "en");

            //检查单实例
            bool ok = CheckMutex();
            if (!ok)
                ShowToastAndKillProcess();

            //加載用戶配置
            var appSetting = LoadUserConfig<Configs.SystemConfig>();
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
        internal void ApplySetting(Configs.SystemConfig setting)
        {
            _desktopStartupHelper.Set(setting.RunWhenStarts);
            SettingChanged?.Invoke(this, new EventArgs());
        }
        #endregion

        #region private
        private bool CheckMutex()
        {
            try
            {
                //兼容腾讯桌面，曲线救国...
                _mutex = new Mutex(true, "cxWallpaperEngineGlobalMutex", out bool ret);
                if (!ret)
                {
                    return false;
                }
                _mutex.ReleaseMutex();
                return true;
            }
            catch (Exception ex)
            {
                _logger.Info(ex);
                return false;
            }
        }
        private void ShowToastAndKillProcess()
        {
            ShowGuidToastAsync();
            //杀掉其他实例
            try
            {
                var ps = Process.GetProcessesByName(AppName);
                var cp = Process.GetCurrentProcess();
                foreach (var p in ps)
                {
                    if (p.Id == cp.Id)
                        continue;
                    p.Kill();
                }
            }
            catch (Exception ex)
            {
                _logger.Info(ex);
            }
        }
        private void ShowGuidToastAsync()
        {
            string appDir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
            string imgPath = Path.Combine(appDir, "Assets\\guide.gif");
            new ToastContentBuilder()
             .AddText(LanService.Get("clientStarted"))
             .AddHeroImage(new Uri(imgPath))
             .AddButton(new ToastButtonDismiss(LanService.Get("ok")))
             .Show();
        }
        #endregion
    }
}
