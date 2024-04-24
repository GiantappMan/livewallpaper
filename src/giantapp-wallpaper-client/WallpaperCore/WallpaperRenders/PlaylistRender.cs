
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
    //壁纸开始时间
    DateTime? _startTime;
    //下次壁纸切换时间
    DateTime? _nextSwitchTime;
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

    internal override object? GetSnapshot()
    {
        return _snapshot;
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
        {
            await _currentRender.Play(_playingWallpaper);
            _startTime = DateTime.Now;
            _nextSwitchTime = _startTime.Value.AddSeconds(GetDuration());
        }
    }

    internal override void ReApplySetting(Wallpaper? wallpaper)
    {
        _ = Play(wallpaper);
    }

    internal override void Resume()
    {
        _currentRender?.Resume();
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

    internal override double GetTimePos()
    {
        if (_currentRender == null)
            return 0;

        if (_currentRender.IsSupportProgress)
            return _currentRender.GetTimePos();

        //根据下次切换时间和开始时间计算
        if (_startTime == null)
            return 0;

        var res = (DateTime.Now - _startTime.Value).TotalSeconds;
        var duration = GetDuration();
        if (res > duration)
        {
            return duration;
        }
        return res;
    }

    internal override void SetProgress(double progress)
    {
        if (_currentRender == null)
            return;

        if (_currentRender.IsSupportProgress)
        {
            _currentRender.SetProgress(progress);
            return;
        }

        //根据进度计算时间

        progress /= 100;
        var duration = GetDuration();

        _startTime = DateTime.Now.AddSeconds(-progress * duration);
        _nextSwitchTime = DateTime.Now.AddSeconds((1 - progress) * duration);
    }

    internal override void SetVolume(uint volume)
    {
        _currentRender?.SetVolume(volume);
    }

    internal override void Stop()
    {
        _currentRender?.Stop();
        _startTime = null;
        _nextSwitchTime = null;
    }

    internal override Task Dispose()
    {
        Stop();
        return Task.CompletedTask;
    }
}
