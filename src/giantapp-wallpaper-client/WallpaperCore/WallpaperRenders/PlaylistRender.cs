
using System.Text.Json;

namespace WallpaperCore.WallpaperRenders;

public class PlaylistSnapshot
{
}


internal class PlaylistRender : BaseRender
{
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Playlist };

    PlaylistSnapshot? _snapshot;
    BaseRender? _currentRender;
    readonly BaseRender[] _renders = new BaseRender[] { new VideoRender(), new ImgRender(), new WebRender() };

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        if (snapshotObj?.Snapshots == null)
            return;

        foreach (var item in snapshotObj.Snapshots)
        {
            if (item is JsonElement jsonElement)
            {
                _snapshot = JsonSerializer.Deserialize<PlaylistSnapshot>(jsonElement, WallpaperApi.JsonOptitons);
                break;
            }
            else if (item is PlaylistSnapshot snapshot)
            {
                _snapshot = snapshot;
                break;
            }
        }
    }

    internal override double GetDuration()
    {
        return base.GetDuration();
    }

    internal override object? GetSnapshot()
    {
        return _snapshot;
    }

    internal override double GetTimePos()
    {
        return base.GetTimePos();
    }

    internal override void Pause()
    {
        base.Pause();
    }

    internal override async Task Play(Wallpaper? playlist)
    {
        if (playlist == null)
            return;

        var meta = playlist.Meta;
        var playingWallpaper = meta.Wallpapers.ElementAtOrDefault((int)meta.PlayIndex);
        if (playingWallpaper == null)
            return;

        //更新运行时数据
        playingWallpaper.RunningInfo = playlist.RunningInfo;
        ////读取最新setting
        //playingWallpaper.LoadSetting();

        //查找wallpaper 所需的render
        bool found = false;
        foreach (var item in _renders)
        {
            if (item.SupportTypes.ToList().Contains(playingWallpaper.Meta.Type))
            {
                if (item != _currentRender)
                {
                    //类型换了，关闭旧壁纸
                    _currentRender?.Stop();
                }
                _currentRender = item;
                found = true;
                break;
            }
        }
        if (!found)
            return;

        if (_currentRender != null)
            await _currentRender.Play(playingWallpaper);
    }

    internal override void ReApplySetting(Wallpaper? wallpaper)
    {
        base.ReApplySetting(wallpaper);
    }

    internal override void Resume()
    {
        base.Resume();
    }

    internal override void SetProgress(double progress)
    {
        base.SetProgress(progress);
    }

    internal override void SetVolume(uint volume)
    {
        base.SetVolume(volume);
    }

    internal override void Stop()
    {
        base.Stop();
    }

    internal override Task Dispose()
    {
        return base.Dispose();
    }
}
