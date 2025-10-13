using Giantapp.LiveWallpaper.Engine.Forms;
using Giantapp.LiveWallpaper.Engine.Libs;
using Giantapp.LiveWallpaper.Engine.VideoRenders;
using NLog;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Giantapp.LiveWallpaper.Engine.Renders
{

    /// <summary>
    /// 直接内置视频播放功能，以便于快速启动
    /// </summary>
    public class VideoRender : BaseRender
    {
        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();

        static VideoRender()
        {
            //关闭当前所有运行的mpv.exe
            var processes = Process.GetProcessesByName("mpv");
            foreach (var process in processes)
            {
                try
                {
                    process.Kill();
                }
                catch (Exception ex)
                {
                    _logger.Error(ex, "关闭mpv进程失败");
                }
            }
        }

        private static readonly ConcurrentDictionary<string, MpvApi> _mpvApis = new();

        //每次升级就修改这个文件名
        public VideoRender() : base(WallpaperType.Video,
            new List<string>() {
                ".mp4", ".flv", ".blv", ".avi", ".mov", ".gif", ".webm", ".mkv" }
            , false)
        {

        }

        protected override async Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel wallpaper, CancellationToken ct, params string[] screens)
        {
            List<RenderInfo> infos = new();
            var notInitScreen = screens.Where(item => !_mpvApis.ContainsKey(item));

            foreach (var screenItem in notInitScreen)
            {
                var api = new MpvApi();
                //初始化控件
                _mpvApis.TryAdd(screenItem, api);
            }

            foreach (var screenItem in screens)
            {
                if (ct.IsCancellationRequested)
                    break;

                //var host = LiveWallpaperRenderForm.GetHost(screenItem);
                //if (host == null)
                //    continue;

                //显示控件
                _mpvApis.TryGetValue(screenItem, out MpvApi? api);

                //设置参数
                //var currentScreenOption = WallpaperApi.Options.ScreenOptions.FirstOrDefault(e => e.Screen == screenItem);
                //api?.Play(host.GetHandle(), wallpaper.RunningData.AbsolutePath, wallpaper.Option.HardwareDecoding, wallpaper.Option.IsPanScan);


                string? targetPath = wallpaper.RunningData.AbsolutePath;
                if (api != null && !api.ProcessLaunched && targetPath != null)
                {
                    await api.LaunchAsync(targetPath);
                    //todo 获取壁纸所在屏幕索引
                    var screenIndex = WallpaperApi.Screens.ToList().IndexOf(screenItem);
                    var bounds = GetScreen((uint)screenIndex)?.Bounds;
                    await Task.Run(() =>
                    {
                        DeskTopHelper.SendHandleToDesktopBottom(api.MainHandle, bounds);
                    });
                }
                else if (api != null && targetPath != null)
                {
                    api.LoadFile(targetPath);
                    Resume();
                }

                api?.SetPanAndScan(wallpaper.Option.IsPanScan);
                api?.SetHwdec(wallpaper.Option.HardwareDecoding);

                uint volume = 0;
                if (screenItem == WallpaperApi.Options.AudioScreen)
                    volume = 100;

                api?.SetVolume(volume);

                ////播放后再显示
                //host.ShowWallpaper();

                infos.Add(new RenderInfo()
                {
                    Wallpaper = wallpaper.Clone() as WallpaperModel,
                    Screen = screenItem
                });
            }

            return BaseApiResult<List<RenderInfo>>.SuccessState(infos);
        }

        protected override Task InnerCloseWallpaperAsync(List<RenderInfo> wallpaperRenders, WallpaperModel? nextWallpaper)
        {
            //还要继续播放视频壁纸，不用关闭
            if (nextWallpaper != null && nextWallpaper.RunningData.Type == WallpaperType.Video)
            {
                return Task.CompletedTask;
            }

            //关闭壁纸
            foreach (var item in wallpaperRenders)
            {
                if (item.Screen == null)
                    continue;
                _mpvApis.TryGetValue(item.Screen, out MpvApi? control);
                control?.Stop();
            }

            return Task.CompletedTask;
        }
        protected override void InnerPause(RenderInfo renderInfo)
        {
            if (renderInfo.Screen == null)
                return;
            _mpvApis.TryGetValue(renderInfo.Screen, out MpvApi? api);
            api?.Pause();
        }
        protected override void InnerResum(RenderInfo renderInfo)
        {
            if (renderInfo.Screen == null)
                return;
            _mpvApis.TryGetValue(renderInfo.Screen, out MpvApi? api);
            api?.Resume();
        }
        public override void SetVolume(int v, string screen)
        {
            _mpvApis.TryGetValue(screen, out MpvApi? api);
            api?.SetVolume((uint)v);
        }
        public static Screen? GetScreen(uint screenIndex, Screen[]? screens = null)
        {
            screens ??= GetScreens();

            if (screenIndex < screens.Length)
                return screens[screenIndex];
            return null;
        }

        //获取屏幕信息
        public static Screen[] GetScreens()
        {
            var res = Screen.AllScreens;
            //根据bounds x坐标排序,按逗号分隔，x坐标是第一个
            Array.Sort(res, (a, b) =>
            {
                var aBounds = a.Bounds;
                var bBounds = b.Bounds;
                return aBounds.X.CompareTo(bBounds.X);
            });
            return res;
        }
    }
}
