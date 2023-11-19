using System.Runtime.InteropServices;
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

        var _workerw = GetWorkerW();
        if (_workerw == IntPtr.Zero)
            return false;

        //HideInAltTab(hwnd);

        //_ = PInvoke.GetWindowRect(hwnd, out _);

        //_parentHandler = PInvoke.GetParent(_currentHandler);

        //System.Diagnostics.Debug.WriteLine($"FullScreen {_targetBounds}");
        UpdatePosition(bounds, handler, _workerw);
        //HideWindowBorder(_currentHandler);
        return true;
    }

    public static void UpdatePosition(Rectangle bounds, IntPtr target, IntPtr workerw)
    {
        var rect = new RECT(bounds);
        var hwnd = new HWND(target);
        var worker = new HWND(workerw);

        //for (int i = 0; i < 1; i++)
        //{
        //检查x秒，如果坐标有变化，重新应用
        //unsafe
        //{
        //    Span<Point> points = stackalloc Point[2];
        //    _ = PInvoke.MapWindowPoints(HWND.Null, worker, points);


        //先放到目标位置
        _ = SetWindowPos(hwnd, HWND.Null, bounds.X, bounds.Y, bounds.Width, bounds.Height, 0u);

        PInvoke.SetParent(hwnd, worker);
        RECT tmp = new(rect);
        //转换坐标
        _ = MapWindowPoints(target, workerw, ref tmp, 2);
        //if (tmp.X != _lastPos.X || tmp.Y != _lastPos.Y || tmp.Width != _lastPos.Width || tmp.Height != _lastPos.Height)
        //{
        _ = SetWindowPos(hwnd, HWND.Null, tmp.X, tmp.Y, tmp.Width, tmp.Height, 0u);
        //}
        //await Task.Delay(1000);
        //Thread.Sleep(1000);
        //}
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

    //internal static bool SetWindowPosEx(IntPtr targeHandler, RECT rect)
    //{
    //    return SetWindowPos(targeHandler, IntPtr.Zero, rect.X, rect.Y, rect.Width, rect.Height, 0u);
    //}

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32", ExactSpelling = true, SetLastError = true)]
    internal static extern int MapWindowPoints(IntPtr hWndFrom, IntPtr hWndTo, [In][Out] ref RECT rect, [MarshalAs(UnmanagedType.U4)] int cPoints);
}
