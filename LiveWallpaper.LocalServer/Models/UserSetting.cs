using Giantapp.LiveWallpaper.Engine;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using static Giantapp.LiveWallpaper.Engine.ScreenOption;

namespace LiveWallpaper.LocalServer.Models
{
    public class GeneralSettting
    {
        public bool StartWithSystem { get; set; } = true;
        public string CurrentLan { get; set; }
        public string[] LanOptions { get; private set; } = new string[] { "en-US", "el", "ru", "zh-CN" };
        public string ConfigDir
        {
            get
            {
                string saveDir = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                saveDir = Path.Combine(saveDir, "LiveWallpaper", "config");
                return saveDir;
            }
        }
        /// <summary>
        /// 三方工具目录，例如ffmpeg
        /// </summary>
        private string _ThirdpartToolsDir;
        public string ThirdpartToolsDir
        {
            get
            {
                if (string.IsNullOrEmpty(_ThirdpartToolsDir))
                    _ThirdpartToolsDir = GetDefaultThirdpartToolsDir();

                return _ThirdpartToolsDir;
            }
            set
            {
                _ThirdpartToolsDir = value;
            }
        }

        public static string GetDefaultThirdpartToolsDir()
        {
            string saveDir = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            saveDir = Path.Combine(saveDir, "LiveWallpaper", "tools");
            return saveDir;
        }
    }

    public class WallpaperSetting : LiveWallpaperOptions
    {
        public WallpaperSetting() : base(GetDefaultPlayerDir())
        {

        }
        private string _WallpaperSaveDir;
        public string WallpaperSaveDir
        {
            get
            {
                if (string.IsNullOrEmpty(_WallpaperSaveDir))
                    _WallpaperSaveDir = GetDefaultSaveDir();

                return _WallpaperSaveDir;
            }
            set
            {
                _WallpaperSaveDir = value;
            }
        }
        public void FixScreenOptions()
        {
            if (ScreenOptions == null)
                ScreenOptions = new List<ScreenOption>();

            if (WallpaperApi.Screens == null)                
                return;

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
        public static string GetDefaultPlayerDir()
        {
            string saveDir = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            saveDir = Path.Combine(saveDir, "LiveWallpaper", "player");
            return saveDir;
        }
    }

    /// <summary>
    /// 用户设置
    /// </summary>
    public class UserSetting
    {
        public GeneralSettting General { get; set; } = new GeneralSettting();

        public WallpaperSetting Wallpaper { get; set; } = new WallpaperSetting();
    }
}
