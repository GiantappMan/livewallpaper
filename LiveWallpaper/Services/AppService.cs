using DZY.DotNetUtil.Helpers;
using Hardcodet.Wpf.TaskbarNotification;
using LiveWallpaper.Models.Settings;
using MultiLanguageManager;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaper.Services
{
    public class AppService
    {
        public static async void Initlize()
        {
            //多语言
            Xaml.CustomMaps.Add(typeof(TaskbarIcon), TaskbarIcon.ToolTipTextProperty);

            string path = Path.Combine(Environment.CurrentDirectory, "Res\\Languages");
            LanService.Init(new JsonDB(path), true);

            //配置相关
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            SettingPath = $"{appData}\\LiveWallpaper\\Config\\setting.json";

            Setting = await JsonHelper.JsonDeserializeFromFileAsync<Setting>(SettingPath);
            if (Setting == null)
            {
                //默认值
                Setting = new Setting()
                {
                    General = new General()
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

        public static async Task ApplySetting(Setting setting)
        {
            Thread.CurrentThread.CurrentUICulture = new System.Globalization.CultureInfo(setting.General.CurrentLan);
            await LanService.UpdateLanguage();

            //todo setting.General.StartWithWindows;
        }

        public static string SettingPath { get; private set; }

        public static Setting Setting { get; private set; }
    }
}
