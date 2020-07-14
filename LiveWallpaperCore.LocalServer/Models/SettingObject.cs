using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using static Giantapp.LiveWallpaper.Engine.ScreenOption;

namespace LiveWallpaperCore.LocalServer.Models
{
    public class GeneralSettting
    {
        public bool StartWithWindows { get; set; }

        public bool MinimizeUI { get; set; }

        public string CurrentLan { get; set; }

        public bool RecordWindowSize { get; set; }

        public double Width { get; set; }

        public double Height { get; set; }

        public string WallpaperSaveDir { get; set; }

        public static string GetDefaultSaveDir()
        {
            string saveDir = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
            saveDir = Path.Combine(saveDir, "LivewallpaperCache");
            return saveDir;
        }

        public static GeneralSettting GetDefaultGeneralSettting()
        {
            string saveDir = GetDefaultSaveDir();
            return new GeneralSettting()
            {
                WallpaperSaveDir = saveDir,
                //StartWithWindows = true,
                //MinimizeUI = true,
                //RecordWindowSize = true,
                //Width = 436,
                //Height = 337,
                //CurrentLan = "zh"
            };
        }
    }

    public class WallpaperSetting
    {
        public ActionWhenMaximized ActionWhenMaximized { get; set; }
        public string AudioSource { get; set; }
        public string DisplayMonitor { get; set; }
        //public string VideoAspect { get; set; }

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

    public class SettingObject
    {
        public GeneralSettting General { get; set; }

        public WallpaperSetting Wallpaper { get; set; }
    }
}
