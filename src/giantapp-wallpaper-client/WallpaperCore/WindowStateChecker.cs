using System.Runtime.InteropServices;
using System.Timers;

namespace WallpaperCore;

public class WindowStateChecker
{
    // 定义一个枚举类型，表示窗口的状态
    public enum WindowState
    {
        Maximized,
        NotMaximized
    }

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    static extern bool IsZoomed(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
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
        IntPtr hWnd = GetForegroundWindow();
        WindowState state = IsWindowMaximized(hWnd) ? WindowState.Maximized : WindowState.NotMaximized;
        WindowStateChanged?.Invoke(state, hWnd);
    }

    public static bool IsWindowMaximized(IntPtr hWnd)
    {
        if (IsZoomed(hWnd))
        {
            return true;
        }
        else
        {
            GetWindowRect(hWnd, out RECT rect);
            var screen = Screen.FromHandle(hWnd);
            double? windowArea = (rect.Right - rect.Left) * (rect.Bottom - rect.Top);
            double? screenArea = screen.Bounds.Width * screen.Bounds.Height;
            var tmp = windowArea / screenArea >= 0.95;
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
