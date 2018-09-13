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

namespace LiveWallpaper.Services
{
    public class AppService
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();

        /// <summary>
        /// 程序入口
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

            Setting = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(SettingPath);
            if (Setting == null)
            {
                //默认值
                Setting = new SettingObject()
                {
                    General = new GeneralObject()
                    {
                        StartWithWindows = true,
                        CurrentLan = "zh"
                    }
                };
                //生成默认配置
                await JsonHelper.JsonSerializeAsync(Setting, SettingPath);
            }
            await ApplySetting(Setting);

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
                    var current = Wallpapers.FirstOrDefault(m => m.AbsolutePath == AppData.Wallpaper);
                    if (current != null)
                        WallpaperManager.Show(current);
                }
            });
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
                var wallpapers = WallpaperManager.GetWallpapers(AppService.LocalWallpaperDir);
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
            Thread.CurrentThread.CurrentUICulture = new System.Globalization.CultureInfo(setting.General.CurrentLan);
            await LanService.UpdateLanguage();

            await AutoStartupHelper.Instance.Set(setting.General.StartWithWindows);

            setting.General.StartWithWindows = await AutoStartupHelper.Instance.Check();
        }

        public static SettingObject Setting { get; private set; }

        public static AppData AppData { get; private set; }
    }
}
