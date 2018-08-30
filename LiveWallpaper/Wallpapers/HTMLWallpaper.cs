using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Wallpapers
{
    public class HTMLWallpaper : ExeWallpaper
    {
        public HTMLWallpaper() : base()
        {
            KillProcess("Browser");
        }
        public override Task Show(WallpapaerParameter para)
        {
            var browserPath = Services.AppService.AppDir;
            var url = para.Args;
            if (url.StartsWith("\\Wallpapers\\"))
                url = Services.AppService.AppDir + url;
            return base.Show(new WallpapaerParameter()
            {
                Dir = browserPath,
                EnterPoint = "Browser\\Browser.exe",
                Args = url
            });
        }
    }
}
