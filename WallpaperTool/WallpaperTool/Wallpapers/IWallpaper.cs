using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WallpaperTool.Wallpapers
{
    public interface IWallpaper
    {
        Task Show(WallpapaerParameter para);
        Task Clean();
        //Task Dispose();
    }
}
