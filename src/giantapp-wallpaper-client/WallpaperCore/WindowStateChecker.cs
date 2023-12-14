//# define PrintInfo
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
    private readonly Dictionary<string, WindowState> _previousStates = new();
    #endregion

    public WindowStateChecker()
    {
        _timer = new(1000);
        _timer.Elapsed += CheckWindowState; // 每秒调用一次CheckWindowState方法
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

    private void CheckWindowState(object source, ElapsedEventArgs e)
    {
        _timer?.Stop();

        if (WindowStateChanged != null)
        {
            var hWnd = PInvoke.GetForegroundWindow();
            WindowState state = IsWindowMaximized(hWnd) ? WindowState.Maximized : WindowState.NotMaximized;
            var screen = Screen.FromHandle(hWnd);

            if (!_previousStates.TryGetValue(screen.DeviceName, out var previousState) || state != previousState)
            {
                WindowStateChanged.Invoke(state, screen);
                _previousStates[screen.DeviceName] = state;
            }
        }

        _timer?.Start();
    }

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
            System.Diagnostics.Debug.WriteLine($"{handle} {windowName} windowArea, {rect.X},{rect.Y},{rect.Width},{rect.Height}");
            System.Diagnostics.Debug.WriteLine($"{handle} {windowName} screenArea, {screen.DeviceName},{screen.Bounds.Width},{screen.Bounds.Height}");
            System.Diagnostics.Debug.WriteLine($"{handle} {windowName} IsZoomed: {windowArea / screenArea}, {tmp}");
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
        _previousStates.Clear();
    }
}
