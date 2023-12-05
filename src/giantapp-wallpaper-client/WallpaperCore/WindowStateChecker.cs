using System.Timers;
using Windows.Win32;

namespace WallpaperCore;

public class WindowStateChecker
{
    // 定义一个枚举类型，表示窗口的状态
    public enum WindowState
    {
        Maximized,
        NotMaximized
    }

    private readonly System.Timers.Timer? _timer;

    // 定义一个事件，当窗口状态改变时触发
    public event Action<WindowState, IntPtr>? WindowStateChanged;

    public WindowStateChecker()
    {
        _timer = new(1000); // 设置定时器的间隔为1秒
        _timer.Elapsed += CheckWindowState; // 每秒调用一次CheckWindowState方法
    }

    private void CheckWindowState(object source, ElapsedEventArgs e)
    {
        var hWnd = PInvoke.GetForegroundWindow();
        WindowState state = IsWindowMaximized(hWnd) ? WindowState.Maximized : WindowState.NotMaximized;
        WindowStateChanged?.Invoke(state, hWnd);
    }

    public static bool IsWindowMaximized(IntPtr hWnd)
    {
        var handle = new Windows.Win32.Foundation.HWND(hWnd);
        if (PInvoke.IsZoomed(handle))
        {
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
            return tmp;
        }
    }

    public static Screen GetScreenFromWindow(IntPtr hWnd)
    {
        return Screen.FromHandle(hWnd);
    }

    public void StartChecking()
    {
        _timer?.Start(); // 开始定时器
    }

    public void StopChecking()
    {
        _timer?.Stop(); // 停止定时器
    }
}
