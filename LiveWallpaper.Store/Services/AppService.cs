using DZY.DotNetUtil.Helpers;
using LiveWallpaper.Store.Models.Settngs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;

namespace LiveWallpaper.Store.Services
{
    public class AppService
    {
        public AppService()
        {
            //var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            //appData = $"{appData}\\LiveWallpaperStore";
            //SettingPath = $"{appData}\\Config\\setting.json";
        }

        ///// <summary>
        ///// 配置文件地址
        ///// </summary>
        //public string SettingPath { get; private set; }
        public SettingObject Setting { get; private set; }

        public async Task LoadConfig()
        {
            string json = null;
            bool ok = ApplicationData.Current.LocalSettings.Values.TryGetValue("config", out object temp);
            if (ok)
                json = temp.ToString();

            if (string.IsNullOrEmpty(json))
            {
                SettingObject setting = SettingObject.GetDefaultSetting();
                json = await JsonHelper.JsonSerializeAsync(setting);
            }


            var config = await JsonHelper.JsonDeserializeAsync<SettingObject>(json);
            config.CheckDefaultSetting();
            Setting = config;
        }
    }
}
