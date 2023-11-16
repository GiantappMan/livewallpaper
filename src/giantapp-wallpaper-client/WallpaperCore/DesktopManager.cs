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

    public static bool SendToBackground(IntPtr handler)
    {
        const uint WS_EX_TOOLWINDOW = 128u;

        if (handler == IntPtr.Zero)
            return false;

        var _workerw = GetWorkerW();
        if (_workerw == IntPtr.Zero)
            return false;


        var hwnd = new HWND(handler);
        //处理alt+tab可以看见本程序
        //https://stackoverflow.com/questions/357076/best-way-to-hide-a-window-from-the-alt-tab-program-switcher
        int exStyle = PInvoke.GetWindowLong(hwnd, Windows.Win32.UI.WindowsAndMessaging.WINDOW_LONG_PTR_INDEX.GWL_EXSTYLE);
        exStyle |= (int)WS_EX_TOOLWINDOW;
        _ = PInvoke.SetWindowLong(hwnd, Windows.Win32.UI.WindowsAndMessaging.WINDOW_LONG_PTR_INDEX.GWL_EXSTYLE, exStyle);


        //_ = PInvoke.GetWindowRect(hwnd, out _);

        //_parentHandler = PInvoke.GetParent(_currentHandler);

        PInvoke.SetParent(hwnd, new HWND(_workerw));
        //System.Diagnostics.Debug.WriteLine($"FullScreen {_targetBounds}");
        //UpdatePosition(_targetBounds, 5);
        //HideWindowBorder(_currentHandler);
        return true;
    }
}
