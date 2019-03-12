using Caliburn.Micro;
using DZY.WinAPI;
using DZY.WinAPI.Helpers;
using LiveWallpaperEngine;
using LiveWallpaperEngineRender.Renders;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Timers;

namespace LiveWallpaperEngineLib
{
    public static partial class WallpaperManager
    {
        /// <summary>
        /// 壁纸显示窗体
        /// </summary>
        private static string _lastwallPaper;
        private static Timer _timer;
        private static Process _currentProcess;
        private static bool _isPreviewing;
        private static VideoRender _videoRender;

        private static void InitUI()
        {
            _currentProcess = Process.GetCurrentProcess();
        }

        public static string VideoAspect { get; set; }

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
                    _timer = new Timer(1000);
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

        public static void ApplyVideoAspect()
        {
            if (_videoRender != null)
            {
                _videoRender.SetAspect(VideoAspect);
            }
        }
        public static void Show(Wallpaper wallpaper)
        {
            InnerShow(wallpaper.AbsolutePath);
        }

        private static void InnerShow(string absolutePath)
        {
            Execute.OnUIThread(() =>
            {
                var screen = LiveWallpaperEngineManager.AllScreens[0];
                if (_videoRender == null || _videoRender.RenderDisposed)
                {
                    _videoRender = new VideoRender();
                    _videoRender.InitRender(screen);
                    _videoRender.SetAspect(VideoAspect);
                }
                _videoRender.Play(absolutePath);

                LiveWallpaperEngineManager.Show(_videoRender, screen);
            });
        }

        public static void Mute(bool mute)
        {
            _videoRender?.Mute(mute);
        }

        public static void Pause()
        {
            _videoRender?.Pause();
        }

        public static void Resume()
        {
            _videoRender?.Resume();
        }

        public static void Close()
        {
            Execute.BeginOnUIThread(() =>
            {
                _videoRender?.CloseRender();
            });
        }

        public static void Dispose()
        {
            Close();
        }

        public static void Preivew(Wallpaper previewWallpaper)
        {
            _isPreviewing = true;
            Execute.OnUIThread(() =>
            {
                _lastwallPaper = _videoRender?.CurrentPath;
            });
            Show(previewWallpaper);
        }

        public static void StopPreview()
        {
            if (!_isPreviewing)
                return;

            _isPreviewing = false;
            if (_lastwallPaper != null)
                InnerShow(_lastwallPaper);
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
