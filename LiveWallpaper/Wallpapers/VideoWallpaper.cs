using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Wallpapers
{
    public class VideoWallpaper : ExeWallpaper
    {
        public VideoWallpaper() : base()
        {
            KillProcess("VideoPlayer");
        }
        public override Task Show(WallpapaerParameter para)
        {
            var browserPath = Services.AppService.AppDir;
            var path = para.Args;
            if (path.StartsWith("\\Wallpapers\\"))
                path = Services.AppService.AppDir + path;
            if (path.Contains(" "))
                path = $"\"{path}\"";
            return base.Show(new WallpapaerParameter()
            {
                Dir = browserPath,
                EnterPoint = "VideoPlayer\\VideoPlayer.exe",
                Args = path
            });
        }
    }
}
