using Caliburn.Micro;
using DZY.WinAPI;
using LiveWallpaperEngine;
using LiveWallpaperEngine.Controls;
using LiveWallpaperEngine.NativeWallpapers;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Interop;

namespace LiveWallpaperEngine
{
    public static partial class WallpaperManager
    {
        /// <summary>
        /// 壁纸显示窗体
        /// </summary>
        public static RenderWindow RenderWindow { get; private set; }
        private static Wallpaper _lastwallPaper;
        private static SetWinEventHookDelegate _hookCallback;
        private static IntPtr _hook;
        private static Process _currentProcess;

        public static void Show(Wallpaper wallpaper)
        {
            if (_currentProcess == null)
                _currentProcess = Process.GetCurrentProcess();

            IntPtr handler = IntPtr.Zero;
            Execute.OnUIThread(() =>
            {
                if (RenderWindow == null)
                {
                    RenderWindow = new RenderWindow
                    {
                        Wallpaper = wallpaper
                    };
                    RenderWindow.Show();
                }
                else
                {
                    RenderWindow.Wallpaper = wallpaper;
                    RenderWindow.Visibility = System.Windows.Visibility.Visible;
                }

                handler = new WindowInteropHelper(RenderWindow).Handle;

                if (_hook == IntPtr.Zero)
                {
                    //监控其他程序是否最大化
                    _hookCallback = new SetWinEventHookDelegate(WinEventProc);
                    _hook = User32Wrapper.SetWinEventHook(SetWinEventHookEventType.EVENT_SYSTEM_FOREGROUND,
                        SetWinEventHookEventType.EVENT_OBJECT_LOCATIONCHANGE, IntPtr.Zero, _hookCallback, 0, 0, SetWinEventHookFlag.WINEVENT_OUTOFCONTEXT);
                }
            });

            HandlerWallpaper.Show(handler);
        }

        private static List<int> maximizedPid = new List<int>();
        private static void WinEventProc(IntPtr hook, SetWinEventHookEventType eventType, IntPtr window, int objectId, int childId, uint threadId, uint time)
        {
            try
            {
                if (eventType == SetWinEventHookEventType.EVENT_SYSTEM_FOREGROUND ||
                    eventType == SetWinEventHookEventType.EVENT_SYSTEM_MOVESIZEEND)
                {//焦点变化，窗口大小变化
                    var m = new OtherProgramChecker(_currentProcess).CheckMaximized();
                    System.Diagnostics.Debug.WriteLine($"最大化 {m} {DateTime.Now}");
                }

                if (eventType == SetWinEventHookEventType.EVENT_OBJECT_LOCATIONCHANGE)
                {//处理最大化操作
                    WINDOWPLACEMENT placment = new WINDOWPLACEMENT();
                    User32Wrapper.GetWindowPlacement(window, ref placment);
                    //string title = User32Wrapper.GetWindowText(window);
                    int pid = User32Wrapper.GetProcessId(window);
                    if (placment.showCmd == WINDOWPLACEMENTFlags.SW_HIDE)
                        return;

                    if (pid == _currentProcess.Id)
                        return;

                    if (placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWMAXIMIZED)
                    {
                        if (!maximizedPid.Contains(pid))
                        {
                            maximizedPid.Add(pid);
                            var m = new OtherProgramChecker(_currentProcess).CheckMaximized();
                            System.Diagnostics.Debug.WriteLine($"最大化 {m} {DateTime.Now}");
                        }
                    }

                    if (placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWNORMAL ||
                        placment.showCmd == WINDOWPLACEMENTFlags.SW_RESTORE ||
                        placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOW ||
                        placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWMINIMIZED)
                    {
                        if (maximizedPid.Contains(pid))
                        {
                            maximizedPid.Remove(pid);
                            var m = new OtherProgramChecker(_currentProcess).CheckMaximized();
                            System.Diagnostics.Debug.WriteLine($"最大化 {m} {DateTime.Now}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        /// <summary>
        /// 窗口是否是最大化
        /// </summary>
        /// <param name="handle"></param>
        /// <returns></returns>
        internal static bool IsMAXIMIZED(IntPtr handle)
        {
            WINDOWPLACEMENT placment = new WINDOWPLACEMENT();
            User32Wrapper.GetWindowPlacement(handle, ref placment);
            bool visible = User32Wrapper.IsWindowVisible(handle);
            if (visible)
            {
                if (placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWMAXIMIZED)
                {//窗口最大化
                    // Exclude suspended Windows apps
                    int ok = DwmapiWrapper.DwmGetWindowAttribute(handle, DwmapiWrapper.DWMWINDOWATTRIBUTE.DWMWA_CLOAKED, out var cloaked, Marshal.SizeOf<bool>());
                    //隐藏的UWP窗口
                    if (cloaked)
                    {
                        return false;
                    }
                    return true;
                }

                ////判断一些隐藏窗口
                ////http://forums.codeguru.com/showthread.php?445207-Getting-HWND-of-visible-windows
                //var wl = User32Wrapper.GetWindowLong(handle, WindowLongConstants.GWL_STYLE) & WindowStyles.WS_EX_APPWINDOW;
                //if (wl <= 0)
                //    return false;

                //判断是否是游戏全屏
                User32Wrapper.GetWindowRect(handle, out var r);
                if (r.Left == 0 && r.Top == 0)
                {
                    int with = r.Right - r.Left;
                    int height = r.Bottom - r.Top;

                    if (height == System.Windows.Forms.Screen.PrimaryScreen.Bounds.Height
                        && with == System.Windows.Forms.Screen.PrimaryScreen.Bounds.Width)
                    {
                        //当前窗口最大化，进入了游戏
                        var foregroundWIndow = User32Wrapper.GetForegroundWindow();
                        if (foregroundWIndow == handle)
                        {
                            var windowText = User32Wrapper.GetWindowText(handle);
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        internal static string GetWallpaperType(string filePath)
        {
            var extenson = Path.GetExtension(filePath);
            bool isVideo = VideoExtensions.FirstOrDefault(m => m.ToLower() == extenson.ToLower()) != null;
            if (isVideo)
                return WallpaperType.Video.ToString().ToLower();
            return null;
        }

        public static void Close()
        {
            if (RenderWindow == null)
                return;

            Execute.OnUIThread(() =>
            {
                RenderWindow.Visibility = System.Windows.Visibility.Collapsed;
                RenderWindow.Wallpaper = null;
            });

            if (_hook != IntPtr.Zero)
            {
                bool ok = User32Wrapper.UnhookWinEvent(_hook);
            }
            HandlerWallpaper.Close();
        }

        public static void Dispose()
        {
            if (RenderWindow == null)
                return;

            Close();

            RenderWindow.Close();
            RenderWindow = null;
        }

        public static void Preivew(Wallpaper previewWallpaper)
        {
            Execute.OnUIThread(() =>
            {
                _lastwallPaper = RenderWindow?.Wallpaper;
            });
            Show(previewWallpaper);
        }

        public static void StopPreview()
        {
            if (_lastwallPaper != null)
                Show(_lastwallPaper);
            else
                Close();
        }

        #region private

        #endregion
    }
}
