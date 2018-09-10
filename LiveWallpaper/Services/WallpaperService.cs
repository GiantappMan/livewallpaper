using LiveWallpaperEngine;
using LiveWallpaperEngine.Controls;
using LiveWallpaperEngine.NativeWallpapers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Interop;

namespace LiveWallpaper.Services
{
    public class WallpaperService
    {
        /// <summary>
        /// 壁纸显示窗体
        /// </summary>
        public static RenderWindow RenderWindow { get; private set; }
        private static Wallpaper _lastwallPaper;

        public static async Task Show(Wallpaper wallpaper)
        {
            if (RenderWindow == null)
                RenderWindow = new RenderWindow();
            else
            {
                RenderWindow.Wallpaper = wallpaper;
                return;
            }

            RenderWindow.Wallpaper = wallpaper;
            RenderWindow.Show();

            var handler = new WindowInteropHelper(RenderWindow).Handle;
            await HandlerWallpaper.Show(handler);
        }

        public static void Close()
        {
            if (RenderWindow == null)
                return;

            RenderWindow.Wallpaper = null;
        }

        public static async Task Dispose()
        {
            if (RenderWindow == null)
                return;

            RenderWindow.Close();
            RenderWindow = null;
            await HandlerWallpaper.Clean();
        }

        public static async Task Preivew(Wallpaper previewWallpaper)
        {
            _lastwallPaper = RenderWindow?.Wallpaper;
            await Show(previewWallpaper);
        }

        public static async Task StopPreview()
        {
            if (_lastwallPaper != null)
                await Show(_lastwallPaper);
            else
                Close();
        }

        #region private



        #endregion
    }
}
