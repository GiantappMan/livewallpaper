using Common.Helpers;
using Common.Windows.Helpers;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Models;
using LiveWallpaper.LocalServer.Utils;
using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer
{
    public class AppManager
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        private static readonly string _runningDataFilePath;
        private static readonly string _userSettingFilePath;
        private static IStartupManager _startupManager = null;


        static AppManager()
        {
            //MyDocuments这个路径不会虚拟化，方便从Dart端读取 (Flutter 方案已放弃，注释先留着)
            _runningDataFilePath = $"{Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)}\\{AppName}\\runningData.json";
            _userSettingFilePath = $"{Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)}\\{AppName}\\Config\\userSetting.json";
        }

        #region properties
        public static string FFmpegSaveDir
        {
            get
            {
                string distDir = Path.Combine(UserSetting.General.ThirdpartToolsDir, "FFmpeg");
                return distDir;
            }
        }

        private static FileDownloader _FFMpegDownloader = null;
        public static FileDownloader FFMpegDownloader
        {
            get
            {
                if (_FFMpegDownloader == null)
                {
                    _FFMpegDownloader = new FileDownloader
                    {
                        DistDir = FFmpegSaveDir
                    };
                }

                return _FFMpegDownloader;
            }
        }

        private static FileDownloader _PlayerDownloader = null;
        public static FileDownloader PlayerDownloader
        {
            get
            {
                if (_PlayerDownloader == null)
                {
                    _PlayerDownloader = new FileDownloader();
                }

                return _PlayerDownloader;
            }
        }

        public const string AppName = "LiveWallpaper";
        public static string AppDataDir { get; private set; }
        public static RunningData RunningData { get; private set; }
        public static UserSetting UserSetting { get; private set; }
        public static bool Initialized { get; private set; }
        public static event EventHandler CultureChanged;
        #endregion

        public static async Task Initialize(int hostPort)
        {
            try
            {
                //应用程序数据
                RunningData = await JsonHelper.JsonDeserializeFromFileAsync<RunningData>(_runningDataFilePath);
                if (RunningData == null)
                {
                    //生成默认运行数据
                    RunningData = new RunningData();
                }
                //更新端口号
                RunningData.HostPort = hostPort;
                await JsonHelper.JsonSerializeAsync(RunningData, _runningDataFilePath);

                if (UserSetting == null)
                    await LoadUserSetting();

                //开机启动
                DesktopBridge.Helpers helpers = new DesktopBridge.Helpers();
                if (helpers.IsRunningAsUwp())
                    _startupManager = new DesktopBridgeStartupManager(AppName);
                else
                {
                    string path = Assembly.GetEntryAssembly().Location.Replace(".dll", ".exe");
                    _startupManager = new DesktopStartupHelper(AppName, path);
                }

                await ApplySetting(UserSetting);

                if (RunningData.CurrentWalpapers != null)
                {
                    foreach (var item in RunningData.CurrentWalpapers)
                    {
                        await WallpaperApi.ShowWallpaper(item.Value, item.Key);
                    }
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

        public static async Task LoadUserSetting()
        {
            UserSetting = await JsonHelper.JsonDeserializeFromFileAsync<UserSetting>(_userSettingFilePath);
            if (UserSetting == null)
                UserSetting = new UserSetting();
            UserSetting.Wallpaper.FixScreenOptions();
        }

        internal static async Task SaveCurrentWalpapers()
        {
            RunningData.CurrentWalpapers = WallpaperApi.CurrentWalpapers;
            await SaveRunningData(RunningData);
        }

        internal static async Task SaveUserSetting(UserSetting setting)
        {
            try
            {
                await JsonHelper.JsonSerializeAsync(setting, _userSettingFilePath);

                bool lanChanged = false;
                if (UserSetting.General.CurrentLan != setting.General.CurrentLan)
                    lanChanged = true;

                //更新内存对象
                UserSetting = setting;

                //多语言变化
                if (lanChanged)
                    CultureChanged?.Invoke(null, null);

                await ApplySetting(UserSetting);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        internal static async Task SaveRunningData(RunningData data)
        {
            try
            {
                await JsonHelper.JsonSerializeAsync(data, _runningDataFilePath);
                //更新内存对象
                RunningData = data;

                //怀疑是重复的多余调用 2021-5-8
                //await ApplySetting(UserSetting);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        private static async Task ApplySetting(UserSetting setting)
        {
            //设置开机启动
            _ = await _startupManager.Set(setting.General.StartWithSystem);
            // 更新开机启动结果
            if (setting?.General?.StartWithSystem != null)
                setting.General.StartWithSystem = await _startupManager.Check();

            string ffmpegSaveDir = FFmpegSaveDir;
            if (_FFMpegDownloader != null)
            {
                _FFMpegDownloader.DistDir = ffmpegSaveDir;
            }

            ProcessHelper.AddPathToEnvoirment(ffmpegSaveDir);

            //设置壁纸参数
            _ = await WallpaperApi.SetOptions(setting.Wallpaper);
        }
    }
}
