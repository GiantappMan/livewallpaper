using Giantapp.LiveWallpaper.Engine;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using static Giantapp.LiveWallpaper.Engine.ScreenOption;

namespace LiveWallpaperCore.LocalServer.Models
{
    public class GeneralSettting
    {
        public bool StartWithWindows { get; set; }

        public string CurrentLan { get; set; }

        public string WallpaperSaveDir { get; set; }

        public static string GetDefaultSaveDir()
        {
            string saveDir = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
            saveDir = Path.Combine(saveDir, "LiveWallpaper");
            return saveDir;
        }

        public static GeneralSettting GetDefaultGeneralSettting()
        {
            string saveDir = GetDefaultSaveDir();
            return new GeneralSettting()
            {
                WallpaperSaveDir = saveDir,
            };
        }
    }

    public class WallpaperSetting : LiveWallpaperOptions
    {
        public ActionWhenMaximized ActionWhenMaximized { get; set; }

        public static WallpaperSetting GetDefaultWallpaperSetting()
        {
            return new WallpaperSetting()
            {
                ActionWhenMaximized = ActionWhenMaximized.Pause
            };
        }

        public static uint[] ConveterToScreenIndexs(int displayIndex)
        {
            uint[] screenIndexs;
            if (displayIndex < 0)
                screenIndexs = System.Windows.Forms.Screen.AllScreens.Select((m, i) => (uint)i).ToArray();
            else
                screenIndexs = new uint[] { (uint)displayIndex };
            return screenIndexs;
        }
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
