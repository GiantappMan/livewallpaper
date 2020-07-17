using DZY.Util.Common.Helpers;
using LiveWallpaperCore.LocalServer.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Store
{
    public class WallpaperStore
    {
        static bool _initialized = false;
        static WallpaperStore()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            AppDataDir = $"{appData}\\LiveWallpaper";
            SettingPath = $"{AppDataDir}\\Config\\setting.json";
            AppDataPath = $"{AppDataDir}\\appData.json";

            Task.Run(async () =>
            {
                try
                {
                    //应用程序数据
                    AppData = await JsonHelper.JsonDeserializeFromFileAsync<AppData>(AppDataPath);
                    if (AppData == null)
                    {
                        //生成默认运行数据
                        AppData = new AppData();
                        await JsonHelper.JsonSerializeAsync(AppData, AppDataPath);
                    }

                    Setting = await JsonHelper.JsonDeserializeFromFileAsync<SettingObject>(SettingPath);
                    LocalWallpaperDir = Setting.General.WallpaperSaveDir;
                }
                catch (Exception ex)
                {

                }
                finally
                {
                    _initialized = true;
                }
            });
        }

        #region properties
        public static string AppDataDir { get; }
        public static string SettingPath { get; }
        public static string AppDataPath { get; }
        public static AppData AppData { get; private set; }
        public static SettingObject Setting { get; private set; }
        public static string LocalWallpaperDir { get; private set; }
        #endregion

        internal static async Task<List<Wallpaper>> GetWallpapers()
        {
            while (!_initialized)
            {
                await Task.Delay(1000);
            }
            DirectoryInfo dirInfo = new DirectoryInfo(LocalWallpaperDir);

            List<Wallpaper> result = new List<Wallpaper>();
            //test E:\SteamLibrary\steamapps\workshop\content\431960
            //foreach (var item in Directory.EnumerateFiles(dir, "project.json", SearchOption.AllDirectories))
            var files = await Task.Run(() => dirInfo.GetFiles("project.json", SearchOption.AllDirectories).OrderByDescending(m => m.CreationTime));
            foreach (var item in files)
            {
                var info = await JsonHelper.JsonDeserializeFromFileAsync<ProjectInfo>(item.FullName);
                var saveDir = Path.GetDirectoryName(item.FullName);

                result.Add(new Wallpaper()
                {
                    Dir = saveDir,
                    Info = info,
                });
            }

            return result;
        }
    }
}
