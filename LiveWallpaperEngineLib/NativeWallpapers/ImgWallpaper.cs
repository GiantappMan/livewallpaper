using DZY.WinAPI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngine.NativeWallpapers
{
    public class ImgWallpaper
    {
        string _defaultBG;
        public async Task Clean()
        {
            if (string.IsNullOrEmpty(_defaultBG))
                return;

            await SetBG(_defaultBG);
            _defaultBG = null;
        }

        public async Task Show(Wallpaper para)
        {
            _defaultBG = await GetCurrentBG();
            await SetBG(para.AbsolutePath);
        }

        public static Task<string> GetCurrentBG()
        {
            return Task.Run(() =>
            {
                StringBuilder wallPaperPath = new StringBuilder(200);
                var temp = USER32Wrapper.SystemParametersInfo(USER32Wrapper.SPI_GETDESKWALLPAPER, 200, wallPaperPath, 0);
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
                var result = USER32Wrapper.SystemParametersInfo(USER32Wrapper.SPI_SETDESKWALLPAPER, 0, new StringBuilder(bg), USER32Wrapper.SPIF_UPDATEINIFILE);
            });
        }
    }
}
