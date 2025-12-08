//# define PrintInfo
#if PrintInfo
using System.Runtime.InteropServices;
#endif
using Microsoft.Win32;
using NLog;
using NLog.Filters;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Timers;
using System.Xml.Linq;
using Windows.Win32;
using Windows.Win32.Foundation;

namespace WallpaperCore.Libs;

/// <summary>
/// 检查窗口是否最大化了
/// </summary>
public class WindowStateChecker
{
    #region private fields
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private readonly Dictionary<string, WindowState> _globalCacheScreenState = new();
    private List<IntPtr> _checkHandles = new();//等待检查的窗口
    //正在检查中
    private bool _isChecking = false;

    //是否已锁屏
    private static bool _isLocked = false;

    #endregion
    static WindowStateChecker()
    {
        SystemEvents.SessionSwitch += (s, e) =>
        {
            if (e.Reason == SessionSwitchReason.SessionLock)
            {
                _isLocked = true;
            }
            else if (e.Reason == SessionSwitchReason.SessionUnlock)
            {
                _isLocked = false;
            }
        };
    }

    public WindowStateChecker(System.Timers.Timer timer)
    {
        timer.Elapsed += CheckWindowState; // 每秒调用一次CheckWindowState方法
    }

    #region properties
    // 定义一个枚举类型，表示窗口的状态
    public enum WindowState
    {
        Maximized,
        NotMaximized
    }
    public event Action<WindowState, Screen>? WindowStateChanged;
    #endregion

    #region private
    private List<IntPtr> GetAllWindowHandle()
    {
        var list = new List<IntPtr>();
        PInvoke.EnumWindows(new Windows.Win32.UI.WindowsAndMessaging.WNDENUMPROC((tophandle, topparamhandle) =>
        {
            list.Add(tophandle);

            return true;
        }), IntPtr.Zero);
        return list;
    }

    private void CheckWindowState(object source, ElapsedEventArgs e)
    {
        if (_isChecking)
            return;

        _isChecking = true;
        try
        {
            if (WindowStateChanged != null)
            {
                var tmp = GetAllWindowHandle();
                _checkHandles.AddRange(tmp);

                //下次有限检查的句柄
                var nextCheckHandles = new List<IntPtr>();
                //当前屏幕状态，默认没有最大化
                Dictionary<string, (WindowState, string?, string?)> currentScreenState = new();
                foreach (var item in Screen.AllScreens)
                    currentScreenState.Add(item.DeviceName, (WindowState.NotMaximized, null, null));
                //遍历检查列表
                List<IntPtr> checkHandlesCopy = new(_checkHandles);
                foreach (var item in checkHandlesCopy)
                {
                    var screen = Screen.FromHandle(item);
                    if (!currentScreenState.ContainsKey(screen.DeviceName))
                    {
                        //新插入的屏幕可能会触发这里
                        currentScreenState.Add(screen.DeviceName, (WindowState.NotMaximized, null, null));
                    }

                    //已经有其他程序最大化
                    if (string.IsNullOrEmpty(screen.DeviceName) || currentScreenState[screen.DeviceName].Item1 == WindowState.Maximized)
                        continue;

                    WindowState state = IsWindowMaximized(item, out string? title, out string? className) ? WindowState.Maximized : WindowState.NotMaximized;
                    //最大化的handle优先插入到前面，方便下次检查
                    if (state == WindowState.Maximized)
                    {
                        if (!nextCheckHandles.Contains(item))
                        {
                            nextCheckHandles.Add(item);
                        }
                    }
                    else
                    {
                    }

                    currentScreenState[screen.DeviceName] = (state, title, className);
                }
                _checkHandles = nextCheckHandles;

                //更新数据
                foreach (var item in currentScreenState)
                {
                    var screen = Screen.AllScreens.FirstOrDefault(m => m.DeviceName == item.Key);
                    if (screen == null)
                        continue;

                    var screenName = item.Key;
                    var state = item.Value;
                    if (!_globalCacheScreenState.TryGetValue(screenName, out var previousState) || state.Item1 != previousState)
                    {
                        WindowStateChanged?.Invoke(state.Item1, screen);
                        _logger.Info($"{screenName}: (State:{state.Item1}, ClassName: {state.Item2}, Title: {state.Item3})");

                        _globalCacheScreenState[screenName] = state.Item1;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "CheckWindowState");
        }
        finally
        {
            _isChecking = false;
        }
    }
    #endregion

    public static bool IsWindowMaximized(IntPtr hWnd, out string? title, out string? className)
    {
        className = title = null;
        if (_isLocked)
            return true;

        HWND handle = new(hWnd);
        //判断是否最小化了
        if (PInvoke.IsIconic(handle))
        {
            return false;
        }

        //判断窗口是否可见
        if (!DeskTopHelper.IsWindowVisible(handle))
        {
            return false;
        }

        var localTitle = DeskTopHelper.GetWindowTitle(handle);
        var localClassName = DeskTopHelper.GetClassName(handle);
        title = localTitle;
        className = localClassName;

        string[] ignoreClass = new string[] { "WorkerW", "Progman", "CEF-OSC-WIDGET", "Shell_TrayWnd" };
        //过滤掉一些不需要的窗口
        if (ignoreClass.Contains(className))
        {
            return false;
        }
        //过滤掉此应用本身
        if (className.StartsWith("HwndWrapper") && className.Contains("LiveWallpaper3.exe"))
        {
            return false;
        }

        var filters = WallpaperApi.Settings.CoveringProcessFilters;
        if (filters.Any(filter => filter.Title == localTitle)) return false;
        switch (WallpaperApi.Settings.CoveringProcessFilterPriority)
        {
            case WallpaperCoveringProcessFilterPriority.Class:
                if (filters.Any(filter => filter.ClassName == localClassName)) return false;
                break;
            case WallpaperCoveringProcessFilterPriority.Executable:
                uint pid = 0;
                unsafe
                {
                    PInvoke.GetWindowThreadProcessId(handle, &pid);
                }

                try
                {
                    Process process = Process.GetProcessById((int)pid);
                    var localFileName = process.MainModule.FileName;
                    if (filters.Any(filter => filter.FileName == localFileName)) return false;
                } catch (Exception)
                {
                    //do nothing
                }

                break;
        }

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
            System.Diagnostics.Debug.WriteLine($"{handle},{windowName},{className} is IsZoomed");
#endif
            return true;
        }
        else
        {
            //屏幕几乎遮挡完桌面，也认为是最大化
            PInvoke.GetWindowRect(handle, out var rect);
            var screen = Screen.FromHandle(hWnd);
            double? windowArea = rect.Width * rect.Height;
            double? screenArea = screen.Bounds.Width * screen.Bounds.Height;
            var tmp = windowArea / screenArea >= 0.9;

#if PrintInfo
            if (tmp)
            {
                System.Diagnostics.Debug.WriteLine($"{handle.Value},{windowName} windowArea,{className} {rect.X},{rect.Y},{rect.Width},{rect.Height}");
                System.Diagnostics.Debug.WriteLine($"{handle.Value},{windowName} screenArea,{className} , {screen.DeviceName},{screen.Bounds.Width},{screen.Bounds.Height}");
                System.Diagnostics.Debug.WriteLine($"{handle.Value},{windowName},{className} IsZoomed: {windowArea / screenArea}, {tmp}");
            }
#endif
            return tmp;
        }
    }

    public void Stop()
    {
        _globalCacheScreenState.Clear();
    }
}
