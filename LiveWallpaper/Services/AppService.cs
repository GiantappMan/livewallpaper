using DZY.DotNetUtil.Helpers;
using Hardcodet.Wpf.TaskbarNotification;
using LiveWallpaper.Settings;
using MultiLanguageManager;
using System;
using System.Collections.Generic;
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
        public static string AppDir { get; private set; }

        private static NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        public static async void Initlize()
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
            AppDir = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            string path = Path.Combine(AppDir, "Res\\Languages");
            logger.Info($"lanPath:{path}");
            LanService.Init(new JsonDB(path), true);

            //配置相关
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            SettingPath = $"{appData}\\LiveWallpaper\\Config\\setting.json";

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
        }

        public static async Task ApplySetting(SettingObject setting)
        {
            Thread.CurrentThread.CurrentUICulture = new System.Globalization.CultureInfo(setting.General.CurrentLan);
            await LanService.UpdateLanguage();

            await AutoStartupHelper.Instance.Set(setting.General.StartWithWindows);

            setting.General.StartWithWindows = await AutoStartupHelper.Instance.Check();
        }

        public static string SettingPath { get; private set; }

        public static SettingObject Setting { get; private set; }
    }
}
