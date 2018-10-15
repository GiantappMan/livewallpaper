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
using System.Timers;
using System.Windows.Interop;

namespace LiveWallpaperEngine
{
    public static partial class WallpaperManager
    {
        /// <summary>
        /// 壁纸显示窗体
        /// </summary>
        private static RenderWindow RenderWindow;
        private static Wallpaper _lastwallPaper;
        //private static SetWinEventHookDelegate _hookCallback;
        //private static IntPtr _hook;
        private static Timer _timer;
        private static Process _currentProcess;

        private static void InitUI()
        {
            _currentProcess = Process.GetCurrentProcess();
        }

        // 监控窗口最大化
        private static bool _maximized;
        private static List<int> maximizedPid = new List<int>();

        public static event EventHandler<bool> MaximizedEvent;

        public static void MonitorMaxiemized(bool enable)
        {
            if (enable)
            {
                if (_timer == null)
                {
                    _timer = new Timer(2000);
                }

                _timer.Elapsed -= _timer_Elapsed;
                _timer.Elapsed += _timer_Elapsed;
                _timer.Start();

                //用此种方案感觉不稳定
                //if (_hook == IntPtr.Zero)
                //{
                //    Execute.OnUIThread(() =>
                //    {

                //        //监控其他程序是否最大化
                //        _hookCallback = new SetWinEventHookDelegate(WinEventProc);
                //        _hook = User32Wrapper.SetWinEventHook(SetWinEventHookEventType.EVENT_SYSTEM_FOREGROUND,
                //            SetWinEventHookEventType.EVENT_OBJECT_LOCATIONCHANGE, IntPtr.Zero, _hookCallback, 0, 0, SetWinEventHookFlag.WINEVENT_OUTOFCONTEXT);
                //    });
                //}
            }
            else
            {
                _timer.Elapsed -= _timer_Elapsed;
                _timer.Stop();

                //用此种方案感觉不稳定
                //if (_hook != IntPtr.Zero)
                //{
                //    Execute.OnUIThread(() =>
                //    {
                //        bool ok = User32Wrapper.UnhookWinEvent(_hook);
                //        _hook = IntPtr.Zero;
                //    });
                //}
            }
        }

        public static void Show(Wallpaper wallpaper)
        {
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

            });

            HandlerWallpaper.Show(handler);
        }

        public static void Pause()
        {
            if (RenderWindow == null)
                return;
            RenderWindow.Pause();
        }

        public static void Resume()
        {
            if (RenderWindow == null)
                return;
            RenderWindow.Resume();
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

            HandlerWallpaper.Close();
        }

        public static void Dispose()
        {
            if (RenderWindow == null)
                return;

            MonitorMaxiemized(false);
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

        private static void RaiseMaximizedEvent(bool m)
        {
            if (_maximized == m)
                return;

            _maximized = m;
            MaximizedEvent?.Invoke(null, m);
            System.Diagnostics.Debug.WriteLine($"最大化 {m} {DateTime.Now}");
        }

        private static void _timer_Elapsed(object sender, ElapsedEventArgs e)
        {
            _timer.Stop();

            var m = new OtherProgramChecker(_currentProcess).CheckMaximized();
            RaiseMaximizedEvent(m);

            _timer.Start();
        }

        private static void WinEventProc(IntPtr hook, SetWinEventHookEventType eventType, IntPtr window, int objectId, int childId, uint threadId, uint time)
        {
            try
            {
                if (eventType == SetWinEventHookEventType.EVENT_SYSTEM_FOREGROUND ||
                    eventType == SetWinEventHookEventType.EVENT_SYSTEM_MOVESIZEEND)
                {//焦点变化，窗口大小变化
                    var m = new OtherProgramChecker(_currentProcess).CheckMaximized();
                    RaiseMaximizedEvent(m);
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
                            RaiseMaximizedEvent(m);
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
                            RaiseMaximizedEvent(m);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        #endregion
    }
}
