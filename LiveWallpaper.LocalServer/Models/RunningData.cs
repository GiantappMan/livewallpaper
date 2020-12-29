using Giantapp.LiveWallpaper.Engine;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Models
{
    public class RunningData
    {
        public int HostPort { get; set; }
        public Dictionary<string, WallpaperModel> CurrentWalpapers { get; set; }
    }
}
