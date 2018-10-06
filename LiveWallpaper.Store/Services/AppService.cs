using DZY.DotNetUtil.Helpers;
using LiveWallpaper.Store.Models.Settngs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Store.Services
{
    public class AppService
    {
        public AppService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            appData = $"{appData}\\LiveWallpaperStore";
            SettingPath = $"{appData}\\Config\\setting.json";
        }
        /// <summary>
        /// 配置文件地址
        /// </summary>
        public string SettingPath { get; private set; }
        public ServerSetting Setting { get; private set; }

        private ServerSetting GetDefaultServerSetting()
        {
            return new ServerSetting()
            {
                ServerUrl = "http://localhost:8080"
            };
        }

        //检查是否有配置需要重新生成
        public async Task CheckDefaultSetting()
        {
            var tempSetting = await JsonHelper.JsonDeserializeFromFileAsync<ServerSetting>(SettingPath);
            bool writeDefault = false;
            if (tempSetting == null)
            {
                //默认值
                tempSetting = GetDefaultServerSetting();
                writeDefault = true;
            }

            if (writeDefault)
                //生成默认配置
                await JsonHelper.JsonSerializeAsync(tempSetting, SettingPath);
            Setting = tempSetting;
        }
    }
}
