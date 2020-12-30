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
        /// <summary>
        /// 最近一次草稿目录
        /// </summary>
        public string LastDraftPath { get; internal set; }
    }
}
