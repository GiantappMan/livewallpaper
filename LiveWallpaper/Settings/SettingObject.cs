using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Settings
{
    public class GeneralSettting
    {
        public bool StartWithWindows { get; set; }

        public bool MinimizeUI { get; set; }

        public string CurrentLan { get; set; }
    }

    public enum ActionWhenMaximized
    {
        Play,
        Stop,
        Pause
    }

    public class WallpaperSetting
    {
        public ActionWhenMaximized ActionWhenMaximized { get; set; }
    }

    public class ServerSetting
    {
        public string ServerUrl { get; set; }
    }

    public class SettingObject
    {
        public GeneralSettting General { get; set; }

        public WallpaperSetting Wallpaper { get; set; }

        public ServerSetting Server { get; set; }
    }
}
