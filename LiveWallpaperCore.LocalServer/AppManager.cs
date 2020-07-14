using DZY.Util.Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaperCore.LocalServer.Models;
using NLog;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Windows.Data.Xml.Dom;
using Windows.Foundation;
using Windows.Storage;
using Windows.UI.Notifications;

namespace LiveWallpaperCore.LocalServer
{
    public class AppManager
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        private static IStartupManager _startupManager = null;

        /// <summary>
        /// 默认配置
        /// </summary>
        public static string SettingDefaultFile { get; private set; }

        /// <summary>
        /// 配置描述文件
        /// </summary>
        public static string SettingDescFile { get; private set; }

        /// <summary>
        /// 程序入口目录
        /// </summary>
        public static string ApptEntryDir { get; private set; }
        /// <summary>
        /// 配置文件地址
        /// </summary>
        public static string SettingPath { get; private set; }
        /// <summary>
        /// 应用程序数据
        /// </summary>
        public static string AppDataPath { get; private set; }
        /// <summary>
        /// 注册数据
        /// </summary>
        public static string PurchaseDataPath { get; private set; }
        /// <summary>
        /// 数据保存目录
        /// </summary>
        public static string AppDataDir { get; private set; }
        /// <summary>
        /// UWP真实AppDatam目录
        /// </summary>
        private static string _UWPRealAppDataDir;
        public static string UWPRealAppDataDir
        {
            get
            {
                DesktopBridge.Helpers helpers = new DesktopBridge.Helpers();
                if (!helpers.IsRunningAsUwp())
                    return null;

                if (string.IsNullOrEmpty(_UWPRealAppDataDir))
                {
                    //使用时再读取，防止初始化等待太久
                    _UWPRealAppDataDir = Path.Combine(ApplicationData.Current.LocalCacheFolder.Path, "Roaming\\LiveWallpaper");
                }
                return _UWPRealAppDataDir;
            }
        }
        /// <summary>
        /// 本地壁纸路径
        /// </summary>
        public static string LocalWallpaperDir { get; private set; }

        public static List<Wallpaper> Wallpapers { get; private set; }

        public static SettingObject Setting { get; private set; }

        public static AppData AppData { get; private set; }
        public static IntPtr MainHandle { get; internal set; }
        public static bool SettingInitialized { get; private set; }

        public static string GetLangaugesFilePath()
        {
            //不能用Environment.CurrentDirectory，开机启动目录会出错
            ApptEntryDir = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            string path = Path.Combine(ApptEntryDir, "Res\\Languages");
            return path;
        }

        public static async void InitlizeSetting()
        {
            if (SettingInitialized)
                return;

            //开机启动
            DesktopBridge.Helpers helpers = new DesktopBridge.Helpers();
            if (helpers.IsRunningAsUwp())
                _startupManager = new DesktopBridgeStartupManager("LiveWallpaper");
            else
            {
                string path = Assembly.GetEntryAssembly().Location.Replace(".dll", ".exe");
                _startupManager = new DesktopStartupHelper("LiveWallpaper", path);
            }

            //配置相关
            SettingDefaultFile = Path.Combine(AppDomain.CurrentDomain.SetupInformation.ApplicationBase, "Res\\setting.default.json");
            SettingDescFile = Path.Combine(AppDomain.CurrentDomain.SetupInformation.ApplicationBase, "Res\\setting.desc.json");

            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            AppDataDir = $"{appData}\\LiveWallpaper";
            SettingPath = $"{AppDataDir}\\Config\\setting.json";
            AppDataPath = $"{AppDataDir}\\appData.json";
            PurchaseDataPath = $"{AppDataDir}\\purchaseData.json";

            await CheckDefaultSetting();

            //应用程序数据
            AppData = await JsonHelper.JsonDeserializeFromFileAsync<AppData>(AppDataPath);
            if (AppData == null)
            {
                AppData = new AppData();
                await ApplyAppDataAsync();
            }

            Setting = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(SettingPath);
            LocalWallpaperDir = Setting.General.WallpaperSaveDir;
            SettingInitialized = true;
        }

        public static async void Run()
        {
            //再次读取配置
            await ApplySetting(Setting);

            //加载壁纸
            RefreshLocalWallpapers();

            ShowCurrentWallpapers();
        }

        public static async void CheckUpates(IntPtr mainHandler)
        {
            StoreHelper store = new StoreHelper(mainHandler);

#if DEBUG
            return;
#endif

            await store.DownloadAndInstallAllUpdatesAsync(() =>
            {
                string xml = $@"
            <toast>
                <visual>
                    <binding template='ToastGeneric'>
                        <text>检测到新版本</text>
                        <text>是否更新</text>
                    </binding>
                </visual>
                <actions>
                        <action
                            content='ok'
                            activationType='foreground'
                            arguments='check'/>

                        <action
                            content='cancel'
                            activationType='foreground'
                            arguments='cancel'/>
                    </actions>
            </toast>";

                XmlDocument doc = new XmlDocument();
                doc.LoadXml(xml);
                var toast = new ToastNotification(doc);

                bool result = false;
                TypedEventHandler<ToastNotification, object> callback = (ToastNotification sender, object args) =>
                {
                    if (args.ToString() == "check")
                    {
                        result = true;
                    }
                };
                toast.Activated += callback;
                var tn = ToastNotificationManager.CreateToastNotifier();
                tn.Show(toast);
                toast.Activated -= callback;

                return result;
            }, (progress) =>
            {
                if ((int)progress.PackageUpdateState >= 3)
                    ShowBalloonTip("温馨提示", "如果更新失败，请关闭软件打开应用商店手动更新。");
                //icon.ShowBalloonTip("温馨提示", $"如果更新失败，请关闭软件打开应用商店手动更新。", BalloonIcon.Info);
            });
        }

        private static void ShowBalloonTip(string title, string content, bool confirm = false)
        {
            string xml = $@"
            <toast>
                <visual>
                    <binding template='ToastGeneric'>
                        <text>{title }</text>
                        <text>{content}</text>
                    </binding>
                </visual>
                {(confirm ?
                @"
                <actions>
                        <action
                            content='ok'
                            activationType='foreground'
                            arguments='check'/>

                        <action
                            content='cancel'
                            activationType='foreground'
                            arguments='cancel'/>
                </actions>
                " : null)}
            </toast>";

            XmlDocument doc = new XmlDocument();
            doc.LoadXml(xml);
            var toast = new ToastNotification(doc);

            bool result = false;
            TypedEventHandler<ToastNotification, object> callback = (ToastNotification sender, object args) =>
            {
                if (args.ToString() == "check")
                {
                    result = true;
                }
            };
            toast.Activated += callback;
            var tn = ToastNotificationManager.CreateToastNotifier();
            tn.Show(toast);
            toast.Activated -= callback;
        }


        //检查是否有配置需要重新生成
        private static async Task CheckDefaultSetting()
        {
            var tmpSetting = await JsonHelper.JsonDeserializeFromFileAsync<object>(SettingPath);
            var defaultData = await JsonHelper.JsonDeserializeFromFileAsync<object>(SettingDefaultFile);
            //生成覆盖默认配置
            await JsonHelper.JsonSerializeAsync(tmpSetting, SettingPath);
        }

        private static void ShowCurrentWallpapers()
        {
            if (AppData.Wallpapers == null)
                return;

            foreach (var item in AppData.Wallpapers)
            {
                var w = Wallpapers.FirstOrDefault(m => m.Path == item.Path);
                if (w == null)
                    continue;

                logger.Info($"ShowCurrentWallpapers {w.Path} , {item.Screen}");
                _ = WallpaperManager.ShowWallpaper(new WallpaperModel()
                {
                    Path = w.Path
                }, item.Screen);
            }
        }

        internal static async Task ShowWallpaper(Wallpaper w, params string[] screens)
        {
            await WallpaperManager.ShowWallpaper(new WallpaperModel()
            {
                Path = w.Path
            }, screens);

            if (AppData.Wallpapers == null)
                AppData.Wallpapers = new List<DisplayWallpaper>();

            foreach (var screenItem in screens)
            {
                var exist = AppData.Wallpapers.FirstOrDefault(m => m.Screen == screenItem);
                if (exist == null)
                {
                    exist = new DisplayWallpaper() { Screen = screenItem, Path = w.Path };
                    AppData.Wallpapers.Add(exist);
                }
                exist.Path = w.Path;
            }


            await ApplyAppDataAsync();
        }

        internal static void Dispose()
        {
            //WallpaperManager.Dispose();
        }

        public static void RefreshLocalWallpapers()
        {
            Wallpapers = new List<Wallpaper>();

            if (!SettingInitialized)
                return;

            try
            {
                if (!Directory.Exists(LocalWallpaperDir))
                    Directory.CreateDirectory(LocalWallpaperDir);

                var wallpapers = Wallpaper.GetWallpapers(LocalWallpaperDir);
                foreach (var item in wallpapers)
                {
                    Wallpapers.Add(item);
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
        }

        public static async Task ApplyAppDataAsync()
        {
            await JsonHelper.JsonSerializeAsync(AppData, AppDataPath);
        }

        public static async Task ReApplySetting()
        {
            var setting = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(SettingPath);
            Setting = setting;
            await ApplySetting(setting);
        }

        public static async Task ApplySetting(SettingObject setting)
        {
            LocalWallpaperDir = Setting.General.WallpaperSaveDir;
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

            var screenSetting = WallpaperManager.Screens.Select((m) => new ScreenOption()
            {
                Screen = m,
                WhenAppMaximized = setting.Wallpaper.ActionWhenMaximized,
            }).ToList();

            var liveWallpaperOptions = new LiveWallpaperOptions
            {
                AppMaximizedEffectAllScreen = true,
                AudioScreen = setting.Wallpaper.AudioSource,
                ScreenOptions = screenSetting
            };
            await WallpaperManager.SetOptions(liveWallpaperOptions);
        }
    }
}
