using Caliburn.Micro;
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

        public static void Show(Wallpaper wallpaper)
        {
            IntPtr handler = IntPtr.Zero;
            Execute.OnUIThread(() =>
            {
                if (RenderWindow == null)
                {
                    RenderWindow = new RenderWindow();
                    RenderWindow.Wallpaper = wallpaper;
                    RenderWindow.Show();
                }
                else
                {
                    RenderWindow.Wallpaper = wallpaper;
                }

                handler = new WindowInteropHelper(RenderWindow).Handle;
            });

            HandlerWallpaper.Show(handler);
        }

        public static void Close()
        {
            if (RenderWindow == null)
                return;

            Execute.OnUIThread(() =>
            {
                RenderWindow.Wallpaper = null;
            });
            HandlerWallpaper.Close();
        }

        public static void Dispose()
        {
            if (RenderWindow == null)
                return;

            Close();

            RenderWindow.Close();
            RenderWindow = null;
        }

        public static void Preivew(Wallpaper previewWallpaper)
        {
            Execute.OnUIThread(() =>
            {
                _lastwallPaper = RenderWindow?.Wallpaper;
            });
            Show(previewWallpaper);
        }

        public static void StopPreview()
        {
            if (_lastwallPaper != null)
                Show(_lastwallPaper);
            else
                Close();
        }

        #region private



        #endregion
    }
}
