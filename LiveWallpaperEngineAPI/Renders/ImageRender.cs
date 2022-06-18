using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using WinAPI.Desktop.API;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    /// <summary>
    /// 图片壁纸实现
    /// </summary>
    public class ImageRender : BaseRender
    {
        readonly IDesktopWallpaper _desktopFactory;
        readonly Dictionary<string, string> _oldWallpapers = new();

        public ImageRender() : base(WallpaperType.Image, new List<string>() { ".jpg", ".jpeg", ".bmp",".png",".jfif" }, false)
        {
            _desktopFactory = DesktopWallpaperFactory.Create();
        }

        protected override Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel wallpaper, CancellationToken ct, params string[] screens)
        {
            return Task.Run(() =>
            {
                foreach (var screenName in screens)
                {
                    CacheOldWallpaper(screenName, () => _desktopFactory.GetWallpaper(screenName));

                    string monitoryId = GetMonitoryId(screenName);
                    _desktopFactory.SetWallpaper(monitoryId, wallpaper.RunningData.AbsolutePath);
                }

                List<RenderInfo> infos = screens.Select(m => new RenderInfo()
                {
                    Wallpaper = wallpaper,
                    Screen = m
                }).ToList();
                return BaseApiResult<List<RenderInfo>>.SuccessState(infos);
            });
        }

        private string GetMonitoryId(string screenName)
        {
            var screen = Screen.AllScreens.FirstOrDefault(m => m.DeviceName == screenName);
            if (screen == null)
                return null;

            for (int i = 0; i < Screen.AllScreens.Length; i++)
            {
                string monitorId = _desktopFactory.GetMonitorDevicePathAt((uint)i);
                var rect = _desktopFactory.GetMonitorRECT(monitorId);

                if (rect.Left == screen.Bounds.Left
                    && rect.Top == screen.Bounds.Top
                    && rect.Right == screen.Bounds.Right
                    && rect.Bottom == screen.Bounds.Bottom)
                {
                    return monitorId;
                }
            }
            return null;
        }

        private void CacheOldWallpaper(string screenName, Func<string> p)
        {
            if (!_oldWallpapers.ContainsKey(screenName))
            {
                _oldWallpapers[screenName] = p();
            }
        }

        protected override async Task InnerCloseWallpaperAsync(List<RenderInfo> playingWallpaper, WallpaperModel nextWallpaper)
        {
            //临时关闭不用处理
            if (nextWallpaper != null)
                return;

            foreach (var w in playingWallpaper)
            {
                string monitoryId = GetMonitoryId(w.Screen);
                try
                {
                    var oldWallpaper = GetOldWallpaper(w.Screen);
                    if (!System.IO.File.Exists(oldWallpaper))
                        continue;
                    _desktopFactory.SetWallpaper(monitoryId, oldWallpaper);
                    //还原旧壁纸后，这里多等一秒，否则切换视频壁纸会失败
                    //Thread.Sleep(1000);
                    await Task.Delay(1000);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine(ex);
                }
            }
        }

        private string GetOldWallpaper(string screen)
        {
            if (_oldWallpapers.ContainsKey(screen))
                return _oldWallpapers[screen];
            return null;
        }
    }
}
