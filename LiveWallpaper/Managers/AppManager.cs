using DZY.DotNetUtil.Helpers;
using Hardcodet.Wpf.TaskbarNotification;
using LiveWallpaper.Settings;
using LiveWallpaperEngine;
using LiveWallpaperEngine.Controls;
using MultiLanguageManager;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace LiveWallpaper.Managers
{
    public class AppManager
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();

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
        /// 数据保存目录
        /// </summary>
        public static string AppDataDir { get; private set; }
        /// <summary>
        /// 本地壁纸路径
        /// </summary>
        public static string LocalWallpaperDir { get; private set; }

        public static List<Wallpaper> Wallpapers { get; private set; }

        public static SettingObject Setting { get; private set; }

        public static AppData AppData { get; private set; }

        public static async Task Initlize()
        {
            //开机启动
#if UWP
            AutoStartupHelper.Initlize(AutoStartupType.Store, "LiveWallpaper");
#else
            AutoStartupHelper.Initlize(AutoStartupType.Win32, "LiveWallpaper");
#endif

            //多语言
            Xaml.CustomMaps.Add(typeof(TaskbarIcon), TaskbarIcon.ToolTipTextProperty);
            //不能用Environment.CurrentDirectory，开机启动目录会出错
            ApptEntryDir = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            string path = Path.Combine(ApptEntryDir, "Res\\Languages");
            LanService.Init(new JsonDB(path), true, "zh");

            //配置相关
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            AppDataDir = $"{appData}\\LiveWallpaper";
            SettingPath = $"{AppDataDir}\\Config\\setting.json";
            LocalWallpaperDir = $"{AppDataDir}\\Wallpapers";
            AppDataPath = $"{AppDataDir}\\appData.json";

            await CheckDefaultSetting();

            //应用程序数据
            AppData = await JsonHelper.JsonDeserializeFromFileAsync<AppData>(AppDataPath);
            if (AppData == null)
            {
                AppData = new AppData();
                await ApplyAppDataAsync();
            }

            //加载壁纸
            await Task.Run(() =>
            {
                RefreshLocalWallpapers();
                if (AppData.Wallpaper != null)
                {
                    WallpaperManager.MaximizedEvent += WallpaperManager_MaximizedEvent;
                    var current = Wallpapers.FirstOrDefault(m => m.AbsolutePath == AppData.Wallpaper);
                    if (current != null)
                        WallpaperManager.Show(current);
                    WallpaperManager.MonitorMaxiemized(true);
                }
            });
        }

        //检查是否有配置需要重新生成
        private static async Task CheckDefaultSetting()
        {
            var tempSetting = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(SettingPath);
            bool writeDefault = false;
            if (tempSetting == null)
            {
                //默认值
                tempSetting = new SettingObject
                {
                    General = GetDefaultGeneralSettting(),
                    Wallpaper = GetDefaultWallpaperSetting(),
                    Server = GetDefaultServerSetting()
                };
                writeDefault = true;
            }

            //默认值
            if (tempSetting.General == null)
            {
                writeDefault = true;
                tempSetting.General = GetDefaultGeneralSettting();
            }
            if (tempSetting.Wallpaper == null)
            {
                writeDefault = true;
                tempSetting.Wallpaper = GetDefaultWallpaperSetting();
            }
            if (tempSetting.Server == null)
            {
                writeDefault = true;
                tempSetting.Server = GetDefaultServerSetting();
            }

            if (writeDefault)
                //生成默认配置
                await JsonHelper.JsonSerializeAsync(tempSetting, SettingPath);

            await ApplySetting(tempSetting);
        }

        private static void WallpaperManager_MaximizedEvent(object sender, bool e)
        {
            switch (Setting.Wallpaper.ActionWhenMaximized)
            {
                case ActionWhenMaximized.Play: break;
                case ActionWhenMaximized.Pause:
                    if (e)
                        WallpaperManager.Pause();
                    else
                        WallpaperManager.Resume();
                    break;
                case ActionWhenMaximized.Stop:
                    if (e)
                        WallpaperManager.Close();
                    else
                    {
                        var current = Wallpapers.FirstOrDefault(m => m.AbsolutePath == AppData.Wallpaper);
                        if (current != null)
                            WallpaperManager.Show(current);
                        WallpaperManager.Show(current);
                    }
                    break;
            }
        }

        private static ServerSetting GetDefaultServerSetting()
        {
            return new ServerSetting()
            {
                ServerUrl = "http://localhost:8080"
            };
        }

        private static WallpaperSetting GetDefaultWallpaperSetting()
        {
            return new WallpaperSetting()
            {
                ActionWhenMaximized = ActionWhenMaximized.Pause
            };
        }

        private static GeneralSettting GetDefaultGeneralSettting()
        {
            return new GeneralSettting()
            {
                StartWithWindows = true,
                CurrentLan = "zh"
            };
        }

        internal static void Dispose()
        {
            WallpaperManager.Close();
        }

        public static List<Wallpaper> RefreshLocalWallpapers()
        {
            Wallpapers = new List<Wallpaper>();

            if (!Directory.Exists(LocalWallpaperDir))
                Directory.CreateDirectory(LocalWallpaperDir);

            try
            {
                var wallpapers = WallpaperManager.GetWallpapers(AppManager.LocalWallpaperDir);
                foreach (var item in wallpapers)
                {
                    Wallpapers.Add(item);
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }

            return Wallpapers;
        }

        public static async Task ApplyAppDataAsync()
        {
            await JsonHelper.JsonSerializeAsync(AppData, AppDataPath);
        }

        public static async Task ApplySetting(SettingObject setting)
        {
            Setting = setting;

            Thread.CurrentThread.CurrentUICulture = new System.Globalization.CultureInfo(setting.General.CurrentLan);
            await LanService.UpdateLanguage();

            await AutoStartupHelper.Instance.Set(setting.General.StartWithWindows);

            setting.General.StartWithWindows = await AutoStartupHelper.Instance.Check();
        }

    }
}
