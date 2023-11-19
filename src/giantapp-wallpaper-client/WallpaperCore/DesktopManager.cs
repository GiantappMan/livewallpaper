using System.Runtime.InteropServices;
using Windows.Win32;
using Windows.Win32.Foundation;

namespace WallpaperCore;

public static class DesktopManager
{
    public static IntPtr GetWorkerW()
    {
        HWND workerw = HWND.Null;
        var _progman = PInvoke.FindWindow("Progman", null);
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

        var hwnd = new HWND(handler);
        //HideInAltTab(hwnd);

        //_ = PInvoke.GetWindowRect(hwnd, out _);

        //_parentHandler = PInvoke.GetParent(_currentHandler);

        PInvoke.SetParent(hwnd, new HWND(_workerw));
        //System.Diagnostics.Debug.WriteLine($"FullScreen {_targetBounds}");
        UpdatePosition(bounds, _workerw, 5);
        //HideWindowBorder(_currentHandler);
        return true;
    }

    public static void UpdatePosition(Rectangle bounds, IntPtr workerw, int tryCount = 1)
    {
        var rect = new RECT(bounds);

        RECT _lastPos = new();
        for (int i = 0; i < tryCount; i++)
        {
            //检查x秒，如果坐标有变化，重新应用
            //unsafe
            //{
            //    Span<Point> points = stackalloc Point[2];
            //    _ = PInvoke.MapWindowPoints(HWND.Null, new HWND(workerw), points);
            //}
            RECT tmp = new(rect);
            _ = MapWindowPoints(IntPtr.Zero, workerw, ref tmp, 2);
            if (tmp.X != _lastPos.X || tmp.Y != _lastPos.Y || tmp.Width != _lastPos.Width || tmp.Height != _lastPos.Height)
            {
                _lastPos = tmp;
                _ = PInvoke.SetWindowPos(new HWND(workerw), HWND.Null, _lastPos.X, _lastPos.Y, _lastPos.Width, _lastPos.Height, 0u);
            }
            //await Task.Delay(1000);
            Thread.Sleep(1000);
        }
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

    internal static bool SetWindowPosEx(IntPtr targeHandler, RECT rect)
    {
        return SetWindowPos(targeHandler, IntPtr.Zero, rect.X, rect.Y, rect.Width, rect.Height, 0u);
    }

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32", ExactSpelling = true, SetLastError = true)]
    internal static extern int MapWindowPoints(IntPtr hWndFrom, IntPtr hWndTo, [In][Out] ref RECT rect, [MarshalAs(UnmanagedType.U4)] int cPoints);
}
