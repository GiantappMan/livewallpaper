using DZY.Util.Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaperCore.LocalServer.Models;
using System;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer
{
    public class AppManager
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        private static string _runningDataFilePath;
        private static string _userSettingFilePath;
        private static IStartupManager _startupManager = null;


        static AppManager()
        {
            _runningDataFilePath = $"{AppDataDir}\\runningData.json";
            _userSettingFilePath = $"{AppDataDir}\\Config\\userSetting.json";
            _ = Initialize();
        }

        #region properties
        public static string AppDataDir { get; private set; }
        public static RunningData RunningData { get; private set; }
        public static UserSetting UserSetting { get; private set; }
        public static bool Initialized { get; private set; }
        #endregion

        public static async Task Initialize()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            AppDataDir = $"{appData}\\LiveWallpaper";

            try
            {
                //应用程序数据
                RunningData = await JsonHelper.JsonDeserializeFromFileAsync<RunningData>(_runningDataFilePath);
                if (RunningData == null)
                {
                    //生成默认运行数据
                    RunningData = new RunningData();
                    await JsonHelper.JsonSerializeAsync(RunningData, _runningDataFilePath);
                }

                UserSetting = await JsonHelper.JsonDeserializeFromFileAsync<UserSetting>(_userSettingFilePath);
                if (UserSetting == null)
                    UserSetting = UserSetting.GetDefaultSettting();

                //开机启动
                DesktopBridge.Helpers helpers = new DesktopBridge.Helpers();
                if (helpers.IsRunningAsUwp())
                    _startupManager = new DesktopBridgeStartupManager("LiveWallpaper");
                else
                {
                    string path = Assembly.GetEntryAssembly().Location.Replace(".dll", ".exe");
                    _startupManager = new DesktopStartupHelper("LiveWallpaper", path);
                }
            }
            catch (Exception ex)
            {
                logger.Error($"WallpaperStore constructor Ex:{ex}");
            }
            finally
            {
                Initialized = true;
            }
        }

        public static async Task WaitInitialized()
        {
            while (!Initialized)
                await Task.Delay(1000);
        }

        internal static Task SaveUserSetting(UserSetting setting)
        {
            return JsonHelper.JsonSerializeAsync(setting, _userSettingFilePath);
        }

        internal static async Task ApplyUserSetting(UserSetting setting)
        {
            string cultureName = setting.General.CurrentLan;
            if (cultureName == null)
                cultureName = Thread.CurrentThread.CurrentUICulture.Name;

            Thread.CurrentThread.CurrentUICulture = new System.Globalization.CultureInfo(cultureName);
            try
            {
                await _startupManager.Set(setting.General.StartWithWindows);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
            setting.General.StartWithWindows = await _startupManager.Check();
        }
    }
}
