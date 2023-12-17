# define PrintInfo
#if PrintInfo
using System.Runtime.InteropServices;
#endif
using System.Timers;
using Windows.Win32;

namespace WallpaperCore;

public class WindowStateChecker
{
    #region private fields
    private readonly System.Timers.Timer? _timer;
    private readonly Dictionary<string, WindowState> _cacheScreenState = new();
    private readonly List<IntPtr> _maximizedWindows = new();
    #endregion

    public WindowStateChecker()
    {
        _timer = new(1000);
        _timer.Elapsed += CheckWindowState; // 每秒调用一次CheckWindowState方法
        _maximizedWindows = GetAllMaximizedWindow();
    }

    #region properties
    public static WindowStateChecker Instance { get; } = new();

    // 定义一个枚举类型，表示窗口的状态
    public enum WindowState
    {
        Maximized,
        NotMaximized
    }
    public event Action<WindowState, Screen>? WindowStateChanged;
    #endregion

    #region private
    private List<IntPtr> GetAllMaximizedWindow()
    {
        var list = new List<IntPtr>();
        PInvoke.EnumWindows(new Windows.Win32.UI.WindowsAndMessaging.WNDENUMPROC((tophandle, topparamhandle) =>
        {
            //判断窗口是否可见
            if (!PInvoke.IsWindowVisible(tophandle))
            {
                return true;
            }

            //判断UWP程序是否可见
            int cloakedVal;
            unsafe
            {
                PInvoke.DwmGetWindowAttribute(tophandle, Windows.Win32.Graphics.Dwm.DWMWINDOWATTRIBUTE.DWMWA_CLOAKED, &cloakedVal, sizeof(int));
            }

            if (cloakedVal != 0)
            {
                return true;
            }

            //获取ClassName
            const int bufferSize = 256;
            string className;
            unsafe
            {
                fixed (char* classNameChars = new char[bufferSize])
                {
                    PInvoke.GetClassName(tophandle, classNameChars, bufferSize);
                    className = new(classNameChars);
                }
            }
            //过滤掉一些不需要的窗口
            string[] ignoreClass = new string[] { "WorkerW", "Progman" };
            if (ignoreClass.Contains(className))
            {
                return true;
            }

            if (IsWindowMaximized(tophandle))
            {
                list.Add(tophandle);
            }

            return true;
        }), IntPtr.Zero);
        return list;
    }

    private void CheckWindowState(object source, ElapsedEventArgs e)
    {
        _timer?.Stop();

        if (WindowStateChanged != null)
        {
            var hWnd = PInvoke.GetForegroundWindow();
            WindowState state = IsWindowMaximized(hWnd) ? WindowState.Maximized : WindowState.NotMaximized;
            var screen = Screen.FromHandle(hWnd);

            if (!_cacheScreenState.TryGetValue(screen.DeviceName, out var previousState) || state != previousState)
            {
                WindowStateChanged.Invoke(state, screen);
                _cacheScreenState[screen.DeviceName] = state;
            }
        }

        _timer?.Start();
    }
    #endregion

    public static bool IsWindowMaximized(IntPtr hWnd)
    {
        var handle = new Windows.Win32.Foundation.HWND(hWnd);
#if PrintInfo
        int bufferSize = PInvoke.GetWindowTextLength(handle) + 1;
        string windowName;
        unsafe
        {
            fixed (char* windowNameChars = new char[bufferSize])
            {
                if (PInvoke.GetWindowText(handle, windowNameChars, bufferSize) == 0)
                {
                    int errorCode = Marshal.GetLastWin32Error();
                }

                windowName = new(windowNameChars);
            }
        }
#endif

        if (PInvoke.IsZoomed(handle))
        {
#if PrintInfo
            System.Diagnostics.Debug.WriteLine($"{handle} {windowName} is IsZoomed");
#endif
            return true;
        }
        else
        {
            //屏幕几乎遮挡完桌面，也认为是最大化
            PInvoke.GetWindowRect(handle, out Windows.Win32.Foundation.RECT rect);
            var screen = Screen.FromHandle(hWnd);
            double? windowArea = rect.Width * rect.Height;
            double? screenArea = screen.Bounds.Width * screen.Bounds.Height;
            var tmp = windowArea / screenArea >= 0.9;

#if PrintInfo
            if (tmp)
            {
                System.Diagnostics.Debug.WriteLine($"{handle.Value} {windowName} windowArea, {rect.X},{rect.Y},{rect.Width},{rect.Height}");
                System.Diagnostics.Debug.WriteLine($"{handle.Value} {windowName} screenArea, {screen.DeviceName},{screen.Bounds.Width},{screen.Bounds.Height}");
                System.Diagnostics.Debug.WriteLine($"{handle.Value} {windowName} IsZoomed: {windowArea / screenArea}, {tmp}");
            }
#endif
            return tmp;
        }
    }

    public void Start()
    {
        _timer?.Start(); // 开始定时器
    }

    public void Stop()
    {
        _timer?.Stop(); // 停止定时器
        _cacheScreenState.Clear();
    }
}
