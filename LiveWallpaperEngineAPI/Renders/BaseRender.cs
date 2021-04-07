using Giantapp.LiveWallpaper.Engine.Utils;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using WinAPI.Extension;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    public class BaseRender : IRender
    {
        private readonly List<RenderInfo> _currentWallpapers = new List<RenderInfo>();
        private CancellationTokenSource _showWallpaperCts = new CancellationTokenSource();
        public WallpaperType SupportType { get; private set; }
        public List<string> SupportExtension { get; private set; }
        public bool SupportMouseEvent { get; private set; }

        protected BaseRender(WallpaperType type, List<string> extension, bool supportMouseEvent)
        {
            SupportType = type;
            SupportExtension = extension;
            SupportMouseEvent = supportMouseEvent;
        }
        public async Task<BaseApiResult<List<RenderInfo>>> ShowWallpaper(WallpaperModel wallpaper, params string[] screens)
        {
            foreach (var item in screens)
                Debug.WriteLine($"show {GetType().Name} {item}");

            List<RenderInfo> changedRender = new List<RenderInfo>();
            //过滤无变化的屏幕
            var changedScreen = screens.Where(m =>
            {
                bool ok = false;
                var existRender = _currentWallpapers.FirstOrDefault(x => x.Screen == m);
                if (existRender == null)
                    ok = true;
                else
                {
                    ok = existRender.Wallpaper.RunningData.AbsolutePath != wallpaper.RunningData.AbsolutePath;
                    changedRender.Add(existRender);
                }
                return ok;
            }).ToArray();

            if (changedScreen.Length > 0)
            {
                //关闭已经展现的壁纸
                await InnerCloseWallpaperAsync(changedRender, true);

                _showWallpaperCts = new CancellationTokenSource();
                var showResult = await InnerShowWallpaper(wallpaper, _showWallpaperCts.Token, changedScreen);
                if (!showResult.Ok)
                    return showResult;

                //更新当前壁纸
                showResult.Data.ForEach(m => _currentWallpapers.Add(m));
            }

            return BaseApiResult<List<RenderInfo>>.SuccessState();
        }
        public async Task CloseWallpaperAsync(params string[] screens)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screens.Contains(m.Screen)).ToList();
            if (playingWallpaper.Count == 0)
                return;

            foreach (var item in screens)
                Debug.WriteLine($"close {GetType().Name} {item}");

            //取消对应屏幕等待未启动的进程            
            _showWallpaperCts?.Cancel();
            _showWallpaperCts?.Dispose();
            _showWallpaperCts = null;

            await InnerCloseWallpaperAsync(playingWallpaper);

            playingWallpaper.ToList().ForEach(m =>
            {
                _currentWallpapers.Remove(m);
            });
        }

        /// <summary>
        /// 可重载，处理具体的关闭逻辑
        /// </summary>
        /// <param name="playingWallpaper"></param>
        /// <param name="closeBeforeOpening">是否是临时关闭，临时关闭表示马上又会继续播放其他壁纸</param>
        /// <returns></returns>
        protected virtual Task InnerCloseWallpaperAsync(List<RenderInfo> playingWallpaper, bool closeBeforeOpening = false)
        {
            return Task.CompletedTask;
        }

        public void Dispose()
        {
        }

        public int GetVolume(string screen)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screen == m.Screen).FirstOrDefault();
            int result = AudioHelper.GetVolume(playingWallpaper.PId);
            return result;
        }

        public void Pause(params string[] screens)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screens.Contains(m.Screen)).ToList();

            foreach (var wallpaper in playingWallpaper)
            {
                try
                {
                    //多次pause可能导致视频无法恢复等问题
                    if (wallpaper.IsPaused)
                        continue;

                    var p = Process.GetProcessById(wallpaper.PId);
                    p.Suspend();
                    wallpaper.IsPaused = true;
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(ex);
                    continue;
                }
            }
        }

        public void Resume(params string[] screens)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screens.Contains(m.Screen)).ToList();

            foreach (var wallpaper in playingWallpaper)
            {
                try
                {
                    var p = Process.GetProcessById(wallpaper.PId);
                    p.Resume();
                    wallpaper.IsPaused = false;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine(ex);
                    continue;
                }
            }
        }

        public void SetVolume(int v, string screen)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screen == m.Screen).FirstOrDefault();
            if (playingWallpaper != null)
                AudioHelper.SetVolume(playingWallpaper.PId, v);
        }

        protected virtual Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel wallpaper, CancellationToken ct, params string[] screens)
        {
            var infos = screens.Select(m => new RenderInfo()
            {
                Wallpaper = wallpaper,
                Screen = m
            }).ToList();

            return Task.FromResult(BaseApiResult<List<RenderInfo>>.SuccessState(infos));
        }
    }
}
