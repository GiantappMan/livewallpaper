
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
    Wallpaper? _playingWallpaper;
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
        var tmp = _currentRender?.GetDuration() ?? 0;
        if (tmp == 0)
        {
            if (_playingWallpaper == null)
                return 0;

            var tmpDuration = _playingWallpaper.Setting.Duration;
            if (string.IsNullOrEmpty(tmpDuration))
            {
                //没设置的默认一小时
                tmpDuration = "01:00";
            }

            bool parseOk = TimeSpan.TryParse(tmpDuration, out TimeSpan duration);
            if (!parseOk)
                return 0;

            return duration.TotalSeconds;
        }
        return tmp;
    }

    internal override object? GetSnapshot()
    {
        return _snapshot;
    }

    internal override double GetTimePos()
    {
        var res = _currentRender?.GetTimePos();
        return res ?? 0;
    }

    internal override void Pause()
    {
        _currentRender?.Pause();
    }

    internal override async Task Play(Wallpaper? playlist)
    {
        if (playlist == null)
            return;

        var meta = playlist.Meta;

        _playingWallpaper = meta.Wallpapers.ElementAtOrDefault((int)meta.PlayIndex);
        if (_playingWallpaper == null)
            return;

        //更新运行时数据
        _playingWallpaper.RunningInfo = playlist.RunningInfo;
        //读取最新setting，用户可能该过了
        _playingWallpaper.LoadSetting();

        //查找wallpaper 所需的render
        bool found = false;
        foreach (var item in _renders)
        {
            if (item.SupportTypes.ToList().Contains(_playingWallpaper.Meta.Type))
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
            await _currentRender.Play(_playingWallpaper);
    }

    internal override void ReApplySetting(Wallpaper? wallpaper)
    {
        _ = Play(wallpaper);
    }

    internal override void Resume()
    {
        _currentRender?.Resume();
    }

    internal override void SetProgress(double progress)
    {
        _currentRender?.SetProgress(progress);
    }

    internal override void SetVolume(uint volume)
    {
        _currentRender?.SetVolume(volume);
    }

    internal override void Stop()
    {
        _currentRender?.Stop();
    }

    internal override Task Dispose()
    {
        Stop();
        return Task.CompletedTask;
    }
}
