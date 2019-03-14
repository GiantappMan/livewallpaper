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
        private static List<VideoRender> _videoRenders = new List<VideoRender>();

        private static void InitUI()
        {
            _currentProcess = Process.GetCurrentProcess();
            LiveWallpaperEngineManager.AllScreens.ForEach(m =>
            {
                var render = new VideoRender();
                var screen = m;
                render.Init(screen);
                bool ok = LiveWallpaperEngineManager.Show(render, screen);

                _videoRenders.Add(render);
            });
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
            ForeachVideoRenders((_videoRender, screen) =>
            {
                _videoRender.SetAspect(VideoAspect);
                return null;
            });
        }

        public static void Show(Wallpaper wallpaper)
        {
            InnerShow(wallpaper.AbsolutePath);
        }

        private static void ForeachVideoRenders(Func<VideoRender, System.Windows.Forms.Screen, VideoRender> func)
        {
            var tmpRenders = new List<VideoRender>(_videoRenders);
            for (int i = 0; i < tmpRenders.Count; i++)
            {
                var renderItem = _videoRenders[i];
                //if (monitors.Items[i] is CheckBox chk)
                //{
                //    if (chk.IsChecked != true)
                //        continue;
                //}

                var newRender = func(renderItem, LiveWallpaperEngineManager.AllScreens[i]);
                if (newRender != null)
                    _videoRenders[i] = newRender;
            }
        }

        private static void InnerShow(string absolutePath)
        {
            Execute.OnUIThread(() =>
            {
                ForeachVideoRenders((_videoRender, screen) =>
                {
                    bool returnNew = false;
                    if (_videoRender == null || _videoRender.RenderDisposed)
                    {
                        returnNew = true;
                        _videoRender = new VideoRender();
                        _videoRender.Init(screen);
                        _videoRender.SetAspect(VideoAspect);
                        bool ok = LiveWallpaperEngineManager.Show(_videoRender, screen);
                        if (!ok)
                        {
                            _videoRender.CloseRender();
                            System.Windows.MessageBox.Show(ok.ToString());
                        }
                    }
                    _videoRender.Play(absolutePath);

                    if (returnNew)
                        return _videoRender;
                    return null;
                });
            });

        }

        public static void Mute(bool mute)
        {
            ForeachVideoRenders((_videoRender, screen) =>
            {
                _videoRender?.Mute(mute);
                return null;
            });
        }

        public static void Pause()
        {
            ForeachVideoRenders((_videoRender, screen) =>
            {
                _videoRender?.Pause();
                return null;
            });
        }

        public static void Resume()
        {
            ForeachVideoRenders((_videoRender, screen) =>
            {
                _videoRender?.Resume();
                return null;
            });
        }

        public static void Close()
        {
            Execute.BeginOnUIThread(() =>
            {
                ForeachVideoRenders((_videoRender, screen) =>
                {
                    _videoRender?.CloseRender();
                    return null;
                });
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
                _lastwallPaper = _videoRenders[0]?.CurrentPath;
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
                    int pid = User32WrapperEx.GetProcessId(window);
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
