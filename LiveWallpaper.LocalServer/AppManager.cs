using Common.Helpers;
using Common.Windows.Helpers;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Models;
using LiveWallpaper.LocalServer.Utils;
using Microsoft.Toolkit.Uwp.Notifications;
using System;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Windows.ApplicationModel;
using Windows.Storage;
using Windows.UI.Notifications;

namespace LiveWallpaper.LocalServer
{
    public class AppManager
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        public static string RunningDataFilePath { get; private set; }
        public static string UserSettingFilePath { get; private set; }
        public static string CacheDir { get; private set; }
        public static string ConfigDir { get; private set; }
        public static string LogDir { get; private set; }
        private static IStartupManager _startupManager = null;

        static AppManager()
        {
            //_runningDataFilePath = $"{Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)}\\{AppName}\\runningData.json";
            //runningdata目录修改为和配置一个目录2021.9.30
            DesktopBridge.Helpers helpers = new();
            if (helpers.IsRunningAsUwp())
            {
                //uwp放在包里面，卸载时可以清理干净
                ConfigDir = Path.Combine(ApplicationData.Current.LocalCacheFolder.Path, $"Local\\{AppName}\\");
            }
            else
            {
                ConfigDir = $"{Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)}\\{AppName}\\";
            }
            //https://github.com/MicrosoftEdge/WebView2Feedback/issues/1900
            //CacheDir = $"{ConfigDir}Cache\\"; 配置路径过长导致webview2 service worker出bug
            CacheDir = $"{Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)}\\{AppName}\\Cache\\";
            RunningDataFilePath = $"{ConfigDir}Config\\runningData.json";
            UserSettingFilePath = $"{ConfigDir}Config\\userSetting.json";
            LogDir = $"{ConfigDir}/Logs";
            ToastNotificationManagerCompat.OnActivated += ToastNotificationManagerCompat_OnActivated;
        }

        private static async void ToastNotificationManagerCompat_OnActivated(ToastNotificationActivatedEventArgsCompat e)
        {
            // Obtain the arguments from the notification
            ToastArguments args = ToastArguments.Parse(e.Argument);
            string actionString = "action";
            if (args.Contains(actionString))
            {
                string action = args.Get(actionString);
                switch (action)
                {
                    case "review":
                        try
                        {
                            await OpenStoreReview();
                            RunningData = await JsonHelper.JsonDeserializeFromFileAsync<RunningData>(RunningDataFilePath);
                            RunningData.CurrentVersionReviewed = true;
                            await JsonHelper.JsonSerializeAsync(RunningData, RunningDataFilePath);
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine(ex);
                        }
                        break;
                }
            }
            ToastNotificationManagerCompat.History.Clear();

            // Obtain any user input (text boxes, menu selections) from the notification
            //ValueSet userInput = toastArgs.UserInput;

            //// Need to dispatch to UI thread if performing UI operations
            //Application.Current.Dispatcher.Invoke(delegate
            //{
            //    // TODO: Show the corresponding content
            //    MessageBox.Show("Toast activated. Args: " + toastArgs.Argument);
            //});
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
        public static string EntryVersion { get; private set; }
        public static event EventHandler CultureChanged;
        #endregion

        public static async Task<bool> OpenStoreReview()
        {
            try
            {
                //旧方法，不推荐的方式.但是推荐的方式获取不到ID
                var pfn = Package.Current.Id.FamilyName;
                var uri = new Uri($"ms-windows-store://review/?PFN={pfn}");
                bool success = await Windows.System.Launcher.LaunchUriAsync(uri);
                return success;
                //var id = Package.Current.Id.ProductId;
                //bool ok = await Windows.System.Launcher.LaunchUriAsync(new Uri("ms-windows-store://review/?ProductId=9WZDNCRFHVJL"));
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
                return false;
            }
        }

        public static async Task Initialize(int hostPort)
        {
            try
            {
                //应用程序数据
                RunningData = await JsonHelper.JsonDeserializeFromFileAsync<RunningData>(RunningDataFilePath);
                if (RunningData == null)
                {
                    //生成默认运行数据
                    RunningData = new RunningData();
                }
                //更新端口号
                RunningData.HostPort = hostPort;
                EntryVersion = Assembly.GetEntryAssembly().GetName().Version.ToString();

                if (RunningData.CurrentVersion == null)
                {
                    _ = ShowGuidToastAsync();//第一次启动
                }

                if (RunningData.CurrentVersion != EntryVersion)
                {
                    RunningData.CurrentVersion = EntryVersion;
                    RunningData.CurrentVersionLaunchedCount = 0;
                    RunningData.CurrentVersionReviewed = false;
                }
                else
                {
                    RunningData.CurrentVersionLaunchedCount++;
                }

                await JsonHelper.JsonSerializeAsync(RunningData, RunningDataFilePath);

                if (!RunningData.CurrentVersionReviewed && RunningData.CurrentVersionLaunchedCount > 0 && RunningData.CurrentVersionLaunchedCount % 15 == 0)
                {
                    ShowReviewToast();
                }

                if (UserSetting == null)
                    await LoadUserSetting();

                //开机启动
                DesktopBridge.Helpers helpers = new();
                if (helpers.IsRunningAsUwp())
                    _startupManager = new DesktopBridgeStartupManager("LiveWallpaper2");
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
                        string screen = item.Key;
                        if (item.Value != null && item.Value.RunningData != null && item.Value.RunningData.Dir != null)
                        {
                            //重新读取模型，有可能保存的是脏数据
                            var wallpaper = await WallpaperApi.CreateWallpaperModelFromDir(item.Value.RunningData.Dir, true);
                            if (wallpaper == null)
                                continue;
                            var r = await WallpaperApi.ShowWallpaper(wallpaper, screen);
                            System.Diagnostics.Debug.WriteLine($"{r.Ok},{r.Error}");
                        }
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

        public static async Task ShowGuidToastAsync()
        {
            string appDir = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            string imgPath = Path.Combine(appDir, "Assets\\guide.gif");
            new ToastContentBuilder()
             .AddText(await GetText("clientStarted"))
             .AddHeroImage(new Uri(imgPath))
             .AddButton(new ToastButtonDismiss(await GetText("ok")))
             .Show();
        }

        private static async void ShowReviewToast()
        {
            var toastContent = new ToastContent()
            {
                Visual = new ToastVisual()
                {
                    BindingGeneric = new ToastBindingGeneric()
                    {
                        Children =
                                {
                                    new AdaptiveText()
                                    {
                                        Text =await GetText("reviewTitle")
                                    },
                                    new AdaptiveText()
                                    {
                                        Text = await GetText("reviewContent")
                                    }
                                }
                    }
                },
                Actions = new ToastActionsCustom()
                {
                    Buttons =
                            {
                                new ToastButton(await GetText("thumbUp"), "action=review")
                                {
                                    ActivationType = ToastActivationType.Background
                                },
                                new ToastButtonDismiss(await GetText("close"))
                            }
                },
                Launch = "action=viewEvent&eventId=63851"
            };

            // Create the toast notification
            var toastNotif = new ToastNotification(toastContent.GetXml());

            // And send the notification
            ToastNotificationManagerCompat.CreateToastNotifier().Show(toastNotif);
        }

        public static async Task<string> GetText(string key)
        {
            if (UserSetting == null)
            {
                await LoadUserSetting();
            }
            string culture = UserSetting.General.CurrentLan ?? Thread.CurrentThread.CurrentCulture.Name;
            var r = await LanService.Instance.GetTextAsync(key, culture);
            return r;
        }


        public static async Task WaitInitialized()
        {
            while (!Initialized)
                await Task.Delay(1000);
        }

        public static async Task LoadUserSetting()
        {
            UserSetting = await JsonHelper.JsonDeserializeFromFileAsync<UserSetting>(UserSettingFilePath);
            if (UserSetting == null)
                UserSetting = new UserSetting();
            UserSetting.Wallpaper.FixScreenOptions();
        }

        internal static async Task SaveCurrentWalpapers()
        {
            RunningData.CurrentWalpapers = WallpaperApi.CurrentWalpapers;
            await SaveRunningData(RunningData);
        }

        public static async Task<BaseApiResult> SaveUserSetting(UserSetting setting)
        {
            try
            {
                await JsonHelper.JsonSerializeAsync(setting, UserSettingFilePath);

                bool lanChanged = false;
                if (UserSetting.General.CurrentLan != setting.General.CurrentLan)
                    lanChanged = true;

                //更新内存对象
                UserSetting = setting;

                //多语言变化
                if (lanChanged)
                    CultureChanged?.Invoke(null, null);

                var result = await ApplySetting(UserSetting);
                return result;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
                return null;
            }
        }

        internal static async Task SaveRunningData(RunningData data)
        {
            try
            {
                await JsonHelper.JsonSerializeAsync(data, RunningDataFilePath);
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

        private static async Task<BaseApiResult> ApplySetting(UserSetting setting)
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

            WallpaperApi.WallpaperDir = UserSetting.Wallpaper.WallpaperSaveDir;

            //设置壁纸参数
            var r = await WallpaperApi.SetOptions(setting.Wallpaper);
            return r;
        }
    }
}
