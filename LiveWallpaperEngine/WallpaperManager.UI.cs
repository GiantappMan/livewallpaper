using Caliburn.Micro;
using LiveWallpaperEngine;
using LiveWallpaperEngine.Controls;
using LiveWallpaperEngine.NativeWallpapers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Interop;

namespace LiveWallpaperEngine
{
    public static partial class WallpaperManager
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
                    RenderWindow = new RenderWindow
                    {
                        Wallpaper = wallpaper
                    };
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

        internal static string GetWallpaperType(string filePath)
        {
            var extenson = Path.GetExtension(filePath);
            bool isVideo = VideoExtensions.FirstOrDefault(m => m.ToLower() == extenson.ToLower()) != null;
            if (isVideo)
                return WallpaperType.Video.ToString().ToLower();
            return null;
        }

        public static void Close()
        {
            if (RenderWindow == null)
                return;

            HandlerWallpaper.Close();

            Execute.OnUIThread(() =>
            {
                RenderWindow.Wallpaper = null;
            });
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
