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
        #region fields
        /// <summary>
        /// 壁纸显示窗体
        /// </summary>
        private static string _lastwallPaper;
        private static Timer _timer;
        private static Process _currentProcess;
        private static bool _isPreviewing;
        private static List<VideoRender> _videoRenders = new List<VideoRender>();
        private static int _displayMonitor;

        // 监控窗口最大化
        private static bool _maximized;
        private static List<int> maximizedPid = new List<int>();
        #endregion

        #region properties

        public static string VideoAspect { get; set; }

        #endregion

        #region events

        public static event EventHandler<bool> MaximizedEvent;

        #endregion

        public static void Initlize()
        {
            LiveWallpaperEngineManager.AllScreens.ForEach(m =>
            {
                //var render = new VideoRender();
                //var screen = m;
                //render.Init(screen);
                //bool ok = LiveWallpaperEngineManager.Show(render, screen);

                //按屏幕索引，预先生成位置
                _videoRenders.Add(null);
            });
        }

        #region public methods

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
            }
            else
            {
                _timer.Elapsed -= _timer_Elapsed;
                _timer.Stop();
            }
        }

        public static void ApplyVideoAspect()
        {
            ForeachVideoRenders((_videoRender, screen, index) =>
            {
                _videoRender?.SetAspect(VideoAspect);
            });
        }

        public static void Show(Wallpaper wallpaper)
        {
            InnerShow(wallpaper.AbsolutePath);
        }

        private static void ForeachVideoRenders(Action<VideoRender, System.Windows.Forms.Screen, int> action)
        {
            var tmpRenders = new List<VideoRender>(_videoRenders);
            for (int i = 0; i < tmpRenders.Count; i++)
            {
                var renderItem = _videoRenders[i];

                action(renderItem, LiveWallpaperEngineManager.AllScreens[i], i);
            }
        }

        private static void InnerShow(string absolutePath)
        {
            ForeachVideoRenders((_videoRender, screen, index) =>
            {
                if (_displayMonitor == index || _displayMonitor < 0)
                    if (_videoRender == null || _videoRender.RenderDisposed)
                    {
                        Execute.OnUIThread(() =>
                        {
                            _videoRender = new VideoRender();
                        });
                        _videoRender.Init(screen);
                        _videoRender.SetAspect($"{screen.Bounds.Width}:{screen.Bounds.Height}");
                        bool ok = LiveWallpaperEngineManager.Show(_videoRender, screen);
                        if (!ok)
                        {
                            LiveWallpaperEngineManager.Close(_videoRender);
                            System.Windows.MessageBox.Show("巨应壁纸貌似不能正常工作，请关闭杀软重试");
                        }
                        else
                            _videoRenders[index] = _videoRender;
                    }
                _videoRender?.Play(absolutePath);
            });
        }

        /// <summary>
        /// 播放指定屏幕的音频
        /// </summary>
        /// <param name="displayIndex"></param>
        public static void PlayAudio(int displayIndex)
        {
            ForeachVideoRenders((videoRender, screen, index) =>
            {
                if (index == displayIndex)
                    videoRender?.Mute(false);
                else
                    videoRender?.Mute(true);
            });
        }

        public static void Pause()
        {
            ForeachVideoRenders((_videoRender, screen, index) =>
            {
                _videoRender?.Pause();
            });
        }

        public static void Resume()
        {
            ForeachVideoRenders((_videoRender, screen, index) =>
            {
                _videoRender?.Resume();
            });
        }

        public static void Close()
        {
            Execute.BeginOnUIThread(() =>
            {
                ForeachVideoRenders((render, screen, i) =>
                {
                    //LiveWallpaperEngineManager.Close(_videoRender);
                    //_videoRender?.CloseRender();
                    render?.Stop();
                    //LiveWallpaperEngineManager.Close(render);
                    //_videoRenders[i] = null;
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

        public static void InitMonitor(int displayMonitor)
        {
            _displayMonitor = displayMonitor;
            ForeachVideoRenders((render, screen, i) =>
            {
                if (displayMonitor > -1 && i != displayMonitor)
                {
                    LiveWallpaperEngineManager.Close(render);
                    _videoRenders[i] = null;
                }
            });
        }

        #endregion

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

            if (_currentProcess == null)
                _currentProcess = Process.GetCurrentProcess();

            var m = new OtherProgramChecker(_currentProcess).CheckMaximized();
            RaiseMaximizedEvent(m);

            _timer.Start();
        }

        #endregion
    }
}
