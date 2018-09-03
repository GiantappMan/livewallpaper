using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LiveWallpaper.Server.Models;
using LiveWallpaper.Wallpapers;
using LiveWallpaperEngine;

namespace LiveWallpaper.ViewModels
{
    public static class WallpaperManger
    {
        static ExeWallpaper exeWallPaper = new ExeWallpaper();
        static VideoWallpaper videoWallpaper = new VideoWallpaper();
        static HTMLWallpaper htmlWallpaper = new HTMLWallpaper();

        public static IWallpaper LastWallpaper { get; private set; }


        public static async Task ApplyWallpaper(Wallpaper w)
        {
            if (LastWallpaper != null)
                LastWallpaper.Clean();

            LastWallpaper = GetWallper(w.ProjectInfo.Type);
            await LastWallpaper.Show();
        }


        private static IWallpaper GetWallper(WallpaperType type)
        {
            switch (type)
            {
                case WallpaperType.Exe:
                    return exeWallPaper;
                case WallpaperType.WEB:
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

        internal static void Delete(Wallpaper w)
        {
            throw new NotImplementedException();
        }
    }
}
