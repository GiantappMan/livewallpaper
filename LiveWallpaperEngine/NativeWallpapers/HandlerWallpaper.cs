using DZY.WinAPI;
using DZY.WinAPI.Desktop.API;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngine.NativeWallpapers
{
    public class HandlerWallpaper
    {
        static IDesktopWallpaper _desktopWallpaperAPI = DesktopWallpaperFactory.Create();
        static IntPtr _workerw;
        //static string _defaultBG;

        static bool _showed;
        static bool _initlized;

        public static void Close()
        {
            if (!_showed)
                return;

            _showed = false;

            if (!_initlized)
                Initlize();
            //if (!string.IsNullOrEmpty(_defaultBG))
            //{
            //    ImgWallpaper.SetBG(_defaultBG);
            //    _defaultBG = null;
            //}

            _desktopWallpaperAPI.Enable(true);

            //var resul = W32.RedrawWindow(workerw, IntPtr.Zero, IntPtr.Zero, RedrawWindowFlags.Invalidate);
            //var temp = W32.GetParent(workerw);
            //W32.SendMessage(temp, 0x000F, 0, IntPtr.Zero);
            //W32.SendMessage(workerw, 0x000F, 0, IntPtr.Zero);
            //W32.SendMessage(workerw, W32.WM_CHANGEUISTATE, 2, IntPtr.Zero);
            //W32.SendMessage(workerw, W32.WM_UPDATEUISTATE, 2, IntPtr.Zero);
        }

        public static void Show(IntPtr handler)
        {
            if (handler == IntPtr.Zero || _showed)
                return;
            _showed = true;

            if (!_initlized)
            {
                bool isOk = Initlize();
                if (!isOk)
                    return;
            }
            //_defaultBG = await ImgWallpaper.GetCurrentBG();
            USER32Wrapper.SetParent(handler, _workerw);
            _desktopWallpaperAPI.Enable(false);
        }

        private static bool Initlize()
        {
            IntPtr progman = USER32Wrapper.FindWindow("Progman", null);
            IntPtr result = IntPtr.Zero;
            USER32Wrapper.SendMessageTimeout(progman,
                                   0x052C,
                                   new IntPtr(0),
                                   IntPtr.Zero,
                                   SendMessageTimeoutFlags.SMTO_NORMAL,
                                   1000,
                                   out result);
            _workerw = IntPtr.Zero;
            var result1 = USER32Wrapper.EnumWindows(new EnumWindowsProc((tophandle, topparamhandle) =>
            {
                IntPtr p = USER32Wrapper.FindWindowEx(tophandle,
                                            IntPtr.Zero,
                                            "SHELLDLL_DefView",
                                            IntPtr.Zero);

                if (p != IntPtr.Zero)
                {
                    // Gets the WorkerW Window after the current one.
                    _workerw = USER32Wrapper.FindWindowEx(IntPtr.Zero,
                                             tophandle,
                                             "WorkerW",
                                             IntPtr.Zero);
                }

                return true;
            }), IntPtr.Zero);
            _initlized = result1;
            return result1;
        }
    }

}
