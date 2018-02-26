using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WallpaperTool.Wallpapers;

namespace WallpaperTool.Server.Models
{
    public class Wallpaper
    {
        public string ID { get; set; }
        public string Name { get; set; }
        public WallpaperType Type { get; set; }
        public string LocalURL { get; set; }
        public string ServerURL { get; set; }
        public WallpapaerParameter PackInfo { get; set; }
        public string Author { get; set; }
        public DateTime? CreatedTime { get; set; }
        public DateTime? UpdatedTime { get; set; }
    }
}
