using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WallpaperTool.Wallpapers
{
    public class VideoWallpaper : ExeWallpaper
    {
        public VideoWallpaper() : base()
        {
            KillProcess("VideoPlayer");
        }
        public override Task Show(WallpapaerParameter para)
        {
            var browserPath = Directory.GetCurrentDirectory();
            var path = para.Args;
            if (path.StartsWith("\\Wallpapers\\"))
                path = Directory.GetCurrentDirectory() + path;
            if (path.Contains(" "))
                path = $"\"{path}\"";
            return base.Show(new WallpapaerParameter()
            {
                Dir = browserPath,
                EnterPoint = "VideoPlayer.exe",
                Args = path
            });
        }
    }
}
