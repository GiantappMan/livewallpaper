using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Settings
{
    public class DisplayWallpaper
    {
        public string Path { get; set; }
        public uint DisplayIndex { get; set; }
    }

    public class AppData
    {
        //public string Wallpaper { get; set; }
        public List<DisplayWallpaper> Wallpapers { get; set; }
    }
}
