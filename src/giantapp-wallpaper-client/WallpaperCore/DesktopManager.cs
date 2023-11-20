using Windows.Win32;
using Windows.Win32.Foundation;

namespace WallpaperCore;

public static class DesktopManager
{
    /// <summary>
    /// 通过不公开命名创建workerW，此方法可以清除背景残影
    /// </summary>
    public static void CreateWorkerW()
    {
        var _progman = PInvoke.FindWindow("Progman", null);
        if (_progman == HWND.Null)
            return;
        unsafe
        {
            PInvoke.SendMessageTimeout(_progman,
                                   0x052C,
                                   new WPARAM(0xD),
                                   new IntPtr(0x1),
                                   Windows.Win32.UI.WindowsAndMessaging.SEND_MESSAGE_TIMEOUT_FLAGS.SMTO_NORMAL,
                                   1000
                                   );
        }
    }
    public static IntPtr GetWorkerW()
    {
        HWND workerw = HWND.Null;
        CreateWorkerW();
        var enumWindowResult = PInvoke.EnumWindows(new Windows.Win32.UI.WindowsAndMessaging.WNDENUMPROC((tophandle, topparamhandle) =>
     {
         var shelldll_defview = PInvoke.FindWindowEx(tophandle,
                                     HWND.Null,
                                     "SHELLDLL_DefView",
                                     null);

         if (shelldll_defview != HWND.Null)
         {
             string tophandleClassName = string.Empty;
             PWSTR pwstr;
             unsafe
             {
                 char* value = stackalloc char[201];
                 pwstr = new PWSTR(value);
             }
             if (PInvoke.GetClassName(tophandle, pwstr, 201) != 0)
             {
                 tophandleClassName = pwstr.ToString();
             }

             if (tophandleClassName != "WorkerW")
                 return true;

             workerw = PInvoke.FindWindowEx(HWND.Null,
                                      tophandle,
                                      "WorkerW",
                                     null);

             var _desktopWorkerw = tophandle;
             return false;
         }

         return true;
     }), new LPARAM());
        return workerw.Value;
    }

    public static bool SendHandleToDesktopBottom(IntPtr handler, Rectangle bounds)
    {
        if (handler == IntPtr.Zero)
            return false;

        var workerw = GetWorkerW();
        if (workerw == IntPtr.Zero)
            return false;

        //HideInAltTab(hwnd);

        //_ = PInvoke.GetWindowRect(hwnd, out _);

        //_parentHandler = PInvoke.GetParent(_currentHandler);

        //System.Diagnostics.Debug.WriteLine($"FullScreen {_targetBounds}");
        var hwnd = new HWND(handler);
        var worker = new HWND(workerw);

        //先放到屏幕外，防止产生残影
        _ = PInvoke.SetWindowPos(hwnd, HWND.Null, -10000, 0, 0, 0, 0u);

        PInvoke.SetParent(hwnd, worker);

        //转换相对worker坐标
        Span<Point> points = new Point[2];
        points[0].X = bounds.X;
        points[0].Y = bounds.Y;
        points[1].X = bounds.X + bounds.Width;
        points[1].Y = bounds.Y + bounds.Height;
        _ = PInvoke.MapWindowPoints(HWND.Null, worker, points);

        //重新设置大小
        var x = points[0].X;
        var y = points[0].Y;
        var width = points[1].X - points[0].X;
        var height = points[1].Y - points[0].Y;
        _ = PInvoke.SetWindowPos(hwnd, HWND.Null, x, y, width, height, 0u);
        //HideWindowBorder(_currentHandler);
        return true;
    }

    private static void HideInAltTab(HWND hwnd)
    {
        const uint WS_EX_TOOLWINDOW = 128u;
        //处理alt+tab可以看见本程序
        //https://stackoverflow.com/questions/357076/best-way-to-hide-a-window-from-the-alt-tab-program-switcher
        int exStyle = PInvoke.GetWindowLong(hwnd, Windows.Win32.UI.WindowsAndMessaging.WINDOW_LONG_PTR_INDEX.GWL_EXSTYLE);
        exStyle |= (int)WS_EX_TOOLWINDOW;
        _ = PInvoke.SetWindowLong(hwnd, Windows.Win32.UI.WindowsAndMessaging.WINDOW_LONG_PTR_INDEX.GWL_EXSTYLE, exStyle);
    }
}
