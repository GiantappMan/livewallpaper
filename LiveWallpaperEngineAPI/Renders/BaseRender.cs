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
    public abstract class BaseRender : IRender
    {
        protected readonly List<RenderInfo> _currentWallpapers = new();
        private CancellationTokenSource _showWallpaperCts = new();
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

            //过滤无变化的屏幕
            var changedScreen = screens.Where(m =>
            {
                bool ok = false;
                var existRenderInfo = _currentWallpapers.FirstOrDefault(x => x.Screen == m);
                if (existRenderInfo == null)
                    ok = true;
                else
                {
                    //路径变化或者播放参数变化，都要重新播放，分组每次都要重新播放
                    ok = existRenderInfo.Wallpaper.RunningData.AbsolutePath != wallpaper.RunningData.AbsolutePath
                    || existRenderInfo.Wallpaper.RunningData.Type == WallpaperType.Group
                    || existRenderInfo.Wallpaper.Option != wallpaper.Option;
                }
                return ok;
            }).ToArray();

            if (changedScreen.Length > 0)
            {
                //每个render innershowwallpaper 内部处理
                ////关闭已经展现的壁纸
                //await CloseWallpaperAsync(wallpaper, changedScreen);

                //处理关闭数据
                CloseWallpaperData(changedScreen);

                _showWallpaperCts = new CancellationTokenSource();
                var showResult = await InnerShowWallpaper(wallpaper, _showWallpaperCts.Token, changedScreen);
                //包含的壁纸已经删除
                if (showResult == null)
                    return BaseApiResult<List<RenderInfo>>.SuccessState();
                if (!showResult.Ok)
                    return showResult;

                //更新当前壁纸
                showResult.Data.ForEach(m => _currentWallpapers.Add(m));
            }

            return BaseApiResult<List<RenderInfo>>.SuccessState();
        }
        public async Task CloseWallpaperAsync(WallpaperModel nextWallpaper, params string[] screens)
        {
            var playingWallpaper = CloseWallpaperData(screens);
            if (playingWallpaper.Count == 0)
                return;

            await InnerCloseWallpaperAsync(playingWallpaper, nextWallpaper);
        }

        private List<RenderInfo> CloseWallpaperData(params string[] screens)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screens.Contains(m.Screen)).ToList();
            if (playingWallpaper.Count == 0)
                return playingWallpaper;

            foreach (var item in screens)
                Debug.WriteLine($"close {GetType().Name} {item}");

            //取消对应屏幕等待未启动的进程            
            _showWallpaperCts?.Cancel();
            _showWallpaperCts?.Dispose();
            _showWallpaperCts = null;

            playingWallpaper.ToList().ForEach(m =>
            {
                _currentWallpapers.Remove(m);
            });
            return playingWallpaper;
        }

        /// <summary>
        /// 可重载，处理具体的关闭逻辑
        /// </summary>
        /// <param name="playingWallpaper"></param>
        /// <param name="closeBeforeOpening">是否是临时关闭，临时关闭表示马上又会继续播放其他壁纸</param>
        /// <returns></returns>
        protected virtual Task InnerCloseWallpaperAsync(List<RenderInfo> playingWallpaper, WallpaperModel nextWallpaper = null)
        {
            return Task.CompletedTask;
        }

        public void Dispose()
        {
        }

        public virtual void SetVolume(int v, string screen)
        {

        }

        public virtual int GetVolume(string screen)
        {
            return 0;
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

                    InnerPause(wallpaper);
                    wallpaper.IsPaused = true;
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(ex);
                    continue;
                }
            }
        }

        protected virtual void InnerPause(RenderInfo renderInfo)
        {

        }

        public void Resume(params string[] screens)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screens.Contains(m.Screen)).ToList();

            foreach (var wallpaper in playingWallpaper)
            {
                try
                {
                    InnerResum(wallpaper);
                    wallpaper.IsPaused = false;
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(ex);
                    continue;
                }
            }
        }

        protected virtual void InnerResum(RenderInfo renderInfo)
        {

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
