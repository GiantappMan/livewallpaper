using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WallpaperTool.Wallpapers
{
    public class ImgWallpaper : IWallpaper
    {
        string _defaultBG;
        public async Task Clean()
        {
            if (string.IsNullOrEmpty(_defaultBG))
                return;

            await SetBG(_defaultBG);
            _defaultBG = null;
        }

        public Task Dispose()
        {
            throw new NotImplementedException();
        }

        public async Task Show(WallpapaerParameter para)
        {
            _defaultBG = await GetCurrentBG();
            await SetBG(para.ToString());
        }

        public static Task<string> GetCurrentBG()
        {
            return Task.Run(() =>
            {
                StringBuilder wallPaperPath = new StringBuilder(200);
                var temp = W32.SystemParametersInfo(W32.SPI_GETDESKWALLPAPER, 200, wallPaperPath, 0);
                if (temp > 0)
                {
                    return wallPaperPath.ToString();
                }
                return null;
            });
        }

        public static Task SetBG(string bg)
        {
            return Task.Run(() =>
            {
                var result = W32.SystemParametersInfo(W32.SPI_SETDESKWALLPAPER, 0, new StringBuilder(bg), W32.SPIF_UPDATEINIFILE);
            });
        }
    }
}
