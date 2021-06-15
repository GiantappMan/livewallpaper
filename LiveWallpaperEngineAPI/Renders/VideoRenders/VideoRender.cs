using Giantapp.LiveWallpaper.Engine.Forms;
using Giantapp.LiveWallpaper.Engine.VideoRenders;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    /// <summary>
    /// 直接内置视频播放功能，以便于快速启动
    /// </summary>
    public class VideoRender : BaseRender
    {
        private static readonly ConcurrentDictionary<string, MpvControl> _contrls = new();

        //每次升级就修改这个文件名
        public VideoRender() : base(WallpaperType.Video,
            new List<string>() {
                ".mp4", ".flv", ".blv", ".avi", ".mov", ".gif", ".webm", ".mkv" }
            , false)
        {

        }

        protected override Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel wallpaper, CancellationToken ct, params string[] screens)
        {
            List<RenderInfo> infos = new();
            var notInitScreen = screens.Where(item => !_contrls.ContainsKey(item));

            foreach (var screenItem in notInitScreen)
            {
                WallpaperApi.InvokeIfRequired(() =>
                {
                    var player = new MpvControl();
                    //初始化控件
                    _contrls.TryAdd(screenItem, player);
                });
            }

            foreach (var screenItem in screens)
            {
                if (ct.IsCancellationRequested)
                    break;

                var host = LiveWallpaperRenderForm.GetHost(screenItem);

                //显示控件
                _contrls.TryGetValue(screenItem, out MpvControl control);

                //设置参数
                var currentScreenOption = WallpaperApi.Options.ScreenOptions.FirstOrDefault(e => e.Screen == screenItem);
                bool isPanScan = currentScreenOption == null || currentScreenOption.PanScan;

                control.Play(wallpaper.RunningData.AbsolutePath, wallpaper.Option.HardwareDecoding, isPanScan);

                int volume = 0;
                if (screenItem == WallpaperApi.Options.AudioScreen)
                    volume = 100;

                control.SetVolume(volume);

                //播放后再显示
                host.ShowWallpaper(control.GetHandle());

                infos.Add(new RenderInfo()
                {
                    Wallpaper = wallpaper.Clone() as WallpaperModel,
                    Screen = screenItem
                });
            }

            return Task.FromResult(BaseApiResult<List<RenderInfo>>.SuccessState(infos));
        }

        protected override Task InnerCloseWallpaperAsync(List<RenderInfo> wallpaperRenders, WallpaperModel nextWallpaper)
        {
            //还要继续播放视频壁纸，不用关闭
            if (nextWallpaper != null && nextWallpaper.RunningData.Type == WallpaperType.Video)
            {
                return Task.CompletedTask;
            }

            //关闭壁纸
            foreach (var item in wallpaperRenders)
            {
                _contrls.TryGetValue(item.Screen, out MpvControl control);
                control.Stop();
            }

            return Task.CompletedTask;
        }
        protected override void InnerPause(RenderInfo renderInfo)
        {
            _contrls.TryGetValue(renderInfo.Screen, out MpvControl control);
            control?.Pause();
        }
        protected override void InnerResum(RenderInfo renderInfo)
        {
            _contrls.TryGetValue(renderInfo.Screen, out MpvControl control);
            control?.Resum();
        }
        public override void SetVolume(int v, string screen)
        {
            _contrls.TryGetValue(screen, out MpvControl control);
            control?.SetVolume(v);
        }
    }
}
