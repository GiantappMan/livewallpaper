using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WallpaperTool.Server.Models;
using WallpaperTool.Wallpapers;

namespace WallpaperTool.ViewModels
{
    public static class WallpaperManger
    {
        static ExeWallpaper exeWallPaper = new ExeWallpaper();
        static VideoWallpaper videoWallpaper = new VideoWallpaper();
        static HTMLWallpaper htmlWallpaper = new HTMLWallpaper();

        public static IWallpaper LastWallpaper { get; private set; }


        public static async Task ApplyWallpaper(WallpaperType type, WallpapaerParameter info)
        {
            if (LastWallpaper != null)
                LastWallpaper.Clean();

            LastWallpaper = GetWallper(type);
            await LastWallpaper.Show(info);
        }


        private static IWallpaper GetWallper(WallpaperType type)
        {
            switch (type)
            {
                case WallpaperType.Exe:
                    return exeWallPaper;
                case WallpaperType.HTML:
                    return htmlWallpaper;
                case WallpaperType.Video:
                    return videoWallpaper;
            }
            return null;
        }

        internal static void Clean()
        {
            if (LastWallpaper != null)
                LastWallpaper.Clean();
        }
    }
}
