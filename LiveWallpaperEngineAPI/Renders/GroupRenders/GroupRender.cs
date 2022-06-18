using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Giantapp.LiveWallpaper.Engine.Renders.GroupRenders
{
    public class GroupRender : BaseRender
    {
        private IRender _currentRender;

        public GroupRender() : base(
            WallpaperType.Group,
            new List<string>() { ".group" },
            false)
        {

        }
        protected override async Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel groupWallpaper, CancellationToken ct, params string[] screens)
        {
            WallpaperModel wallpaper = null;

            int tryCount = 0;
            //分组中壁纸已删除，使用下一个
            while (wallpaper == null)
            {
                wallpaper = await GetNextWallpaperFromGroup(groupWallpaper);
                tryCount++;
                if (tryCount >= groupWallpaper.Info.GroupItems.Count - 1)
                    break;
            }

            if (wallpaper == null)
                return null;

            var oldRender = _currentRender;
            if (wallpaper.RunningData.Type == null)
            {
                _currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                if (_currentRender == null)
                    return BaseApiResult<List<RenderInfo>>.SuccessState(null);

                wallpaper.RunningData.Type = _currentRender.SupportType;
            }
            else
                _currentRender = RenderManager.GetRender(wallpaper.RunningData.Type.Value);

            List<RenderInfo> infos = screens.Select(m => new RenderInfo()
            {
                Wallpaper = groupWallpaper,
                Screen = m
            }).ToList();

            //render改变，关闭旧壁纸
            if (oldRender != null && _currentRender != oldRender)
            {
                await oldRender.CloseWallpaperAsync(wallpaper, screens);
                oldRender = null;
            }

            var result = await _currentRender.ShowWallpaper(wallpaper, screens);
            if (result.Ok)
            {
                //保存播放数据，下次播放下一张
                await WallpaperApi.UpdateWallpaperOption(groupWallpaper.RunningData.Dir, groupWallpaper.Option);
                return BaseApiResult<List<RenderInfo>>.SuccessState(infos);
            }
            else
                return result;
        }
        protected override void InnerResum(RenderInfo renderInfo)
        {
            _currentRender?.Resume(renderInfo.Screen);
        }
        protected override void InnerPause(RenderInfo renderInfo)
        {
            _currentRender?.Pause(renderInfo.Screen);
        }
        protected override async Task InnerCloseWallpaperAsync(List<RenderInfo> playingWallpaper, WallpaperModel nextWallpaper = null)
        {
            WallpaperModel tmpNext = nextWallpaper;
            if (nextWallpaper != null && nextWallpaper.RunningData.Type == WallpaperType.Group)
            {
                var nextInfo = nextWallpaper.Info.GroupItems[nextWallpaper.Option.LastWallpaperIndex ?? 0];
                tmpNext = WallpaperApi.CacheWallpapers.Find(m => m.Info.LocalID == nextInfo.LocalID);
            }
            await _currentRender?.CloseWallpaperAsync(tmpNext, playingWallpaper.Select(m => m.Screen).ToArray());
        }
        public override int GetVolume(string screen)
        {
            var r = _currentRender?.GetVolume(screen);
            return r.Value;
        }
        public override void SetVolume(int v, string screen)
        {
            _currentRender?.SetVolume(v, screen);
        }
        private static async Task<WallpaperModel> GetNextWallpaperFromGroup(WallpaperModel groupWallpaper)
        {
            if (groupWallpaper.Option.LastWallpaperIndex == null)
                groupWallpaper.Option.LastWallpaperIndex = 0;
            else if (groupWallpaper.Option.LastWallpaperIndex >= groupWallpaper.Info.GroupItems.Count - 1)
                groupWallpaper.Option.LastWallpaperIndex = 0;
            else
                groupWallpaper.Option.LastWallpaperIndex += 1;

            var info = groupWallpaper.Info.GroupItems[groupWallpaper.Option.LastWallpaperIndex.Value];

            groupWallpaper.Option.WallpaperChangeTime = DateTime.Now + groupWallpaper.Option.SwitchingInterval.Value;

            WallpaperModel result = await WallpaperApi.GetModelFromCache(info.LocalID);
            return result;
        }
    }
}
