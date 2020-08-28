using Giantapp.LiveWallpaper.Engine;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using static Giantapp.LiveWallpaper.Engine.ScreenOption;

namespace LiveWallpaperCore.LocalServer.Models
{
    public class GeneralSettting
    {
        public bool StartWithWindows { get; set; }

        public string CurrentLan { get; set; }

        public static GeneralSettting GetDefaultGeneralSettting()
        {
            return new GeneralSettting();
        }
    }

    public class WallpaperSetting : LiveWallpaperOptions
    {
        public string WallpaperSaveDir { get; set; }

        public static WallpaperSetting GetDefaultWallpaperSetting()
        {
            string saveDir = GetDefaultSaveDir();
            var r = new WallpaperSetting()
            {
                WallpaperSaveDir = saveDir,
            };
            r.FixScreenOptions();
            return r;
        }
        public void FixScreenOptions()
        {
            if (ScreenOptions == null)
                ScreenOptions = new List<ScreenOption>();

            foreach (var screenItem in WallpaperApi.Screens)
            {
                var exist = ScreenOptions.FirstOrDefault(m => m.Screen == screenItem);
                if (exist == null)
                {
                    //新增了屏幕
                    ScreenOptions.Add(new ScreenOption() { Screen = screenItem });
                }
            }
            // 过滤移除的屏幕
            ScreenOptions = ScreenOptions.Where(m => WallpaperApi.Screens.Contains(m.Screen)).ToList();
        }

        public static string GetDefaultSaveDir()
        {
            string saveDir = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
            saveDir = Path.Combine(saveDir, "LiveWallpaper");
            return saveDir;
        }
        //public static uint[] ConveterToScreenIndexs(int displayIndex)
        //{
        //    uint[] screenIndexs;
        //    if (displayIndex < 0)
        //        screenIndexs = System.Windows.Forms.Screen.AllScreens.Select((m, i) => (uint)i).ToArray();
        //    else
        //        screenIndexs = new uint[] { (uint)displayIndex };
        //    return screenIndexs;
        //}
    }

    /// <summary>
    /// 用户设置
    /// </summary>
    public class UserSetting
    {
        public GeneralSettting General { get; set; }

        public WallpaperSetting Wallpaper { get; set; }

        public static UserSetting GetDefaultSettting()
        {
            return new UserSetting()
            {
                General = GeneralSettting.GetDefaultGeneralSettting(),
                Wallpaper = WallpaperSetting.GetDefaultWallpaperSetting()
            };
        }
    }
}
