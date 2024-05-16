
using NLog;

namespace WallpaperCore.WallpaperRenders;

public class PlaylistSnapshot : BaseSnapshot
{
    public override string Key { get; set; } = nameof(PlaylistSnapshot);
    public WallpaperManagerSnapshot? RenderSnapshos { get; set; }
}


public class PlaylistRender : BaseRender
{
    #region fields
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private PlaylistSnapshot? _snapshot;
    private BaseRender? _currentRender;
    //壁纸开始时间
    private DateTime? _startTime;
    //下次壁纸切换时间
    private DateTime? _nextSwitchTime;
    private readonly System.Timers.Timer _timer;
    //正在检查timer
    private bool _isChecking = false;
    private readonly BaseRender[] _renders = new BaseRender[] { new VideoRender(), new ImgRender(), new WebRender() };
    private Wallpaper? _playingWallpaper;
    private Wallpaper? _playlist;

    private bool _isPaused;
    #endregion

    //静态时间，通知播放列表发生变化
    public static event EventHandler? PlaylistChanged;

    #region properties
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Playlist };
    #endregion

    public PlaylistRender(System.Timers.Timer timer)
    {
        _timer = timer;
        _timer.Elapsed += Timer_Elapsed;
    }

    private async void Timer_Elapsed(object sender, System.Timers.ElapsedEventArgs e)
    {
        //检查是否切换壁纸
        if (_nextSwitchTime == null || _isPaused)
            return;

        if (_isChecking)
            return;
        _isChecking = true;

        try
        {
            if (DateTime.Now >= _nextSwitchTime)
            {
                _playlist?.IncrementPlayIndex();
                await Play(_playlist);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Timer_Elapsed");
        }
        finally
        {
            _isChecking = false;
        }
    }

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        //if (snapshotObj?.Snapshots == null)
        //    return;

        //foreach (var item in snapshotObj.Snapshots)
        //{
        //    if (item is JsonElement jsonElement)
        //    {
        //        try
        //        {
        //            _snapshot = JsonSerializer.Deserialize<PlaylistSnapshot>(jsonElement, WallpaperApi.JsonOptitons);
        //        }
        //        catch (JsonException ex)
        //        {
        //            Debug.WriteLine(ex);
        //        }
        //        break;
        //    }
        //    else if (item is PlaylistSnapshot snapshot)
        //    {
        //        _snapshot = snapshot;
        //        break;
        //    }
        //}
        _snapshot = GetSnapshot<PlaylistSnapshot>(snapshotObj);
        if (_snapshot != null)
        {
            foreach (var item in _renders)
            {
                item.Init(_snapshot.RenderSnapshos);
            }
        }
    }

    internal override object? GetSnapshot()
    {
        List<object> res = new();
        foreach (var item in _renders)
        {
            var tmpSnapshot = item.GetSnapshot();
            if (tmpSnapshot == null)
                continue;

            res.Add(tmpSnapshot);
        }
        return new PlaylistSnapshot()
        {
            RenderSnapshos = new WallpaperManagerSnapshot()
            {
                Snapshots = res
            }
        };
    }

    internal override void Pause()
    {
        _isPaused = true;
        _currentRender?.Pause();
    }

    internal override async Task Play(Wallpaper? playlist)
    {
        _playlist = playlist;

        if (playlist == null)
            return;

        if (playlist.Meta.RealPlaylist.Count == 0)
            playlist.GenerateRealPlaylist();

        var meta = playlist.Meta;

        _playingWallpaper = meta.RealPlaylist.ElementAtOrDefault((int)meta.PlayIndex);
        if (_playingWallpaper == null)
            return;

        //更新运行时数据
        _playingWallpaper.RunningInfo = playlist.RunningInfo;
        //读取最新setting，用户可能该过了
        _playingWallpaper.LoadSetting();

        //查找wallpaper 所需的render
        bool found = false;
        //等待关闭的render
        List<BaseRender> toStop = new();
        foreach (var item in _renders)
        {
            if (item.SupportTypes.ToList().Contains(_playingWallpaper.Meta.Type))
            {
                if (item != _currentRender && _currentRender != null)
                {
                    //类型换了，关闭旧壁纸
                    toStop.Add(_currentRender);
                    //if (_currentRender is not ImgRender)
                    //_currentRender?.Stop();
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
            var duration = -1d;
            for (int i = 0; i < 10; i++)
            {
                //多试几次，可能刚切视频获取不出来
                duration = GetDuration();
                await Task.Delay(100);
                if (duration > 0)
                    break;
            }
            _startTime = DateTime.Now;
            if (duration > 0)
                UpdateNextSwitchTime(_startTime, duration);

            _timer.Elapsed -= Timer_Elapsed;
            _timer.Elapsed += Timer_Elapsed;
        }

        //关闭旧壁纸
        foreach (var item in toStop)
        {
            item.Stop();
        }

        PlaylistChanged?.Invoke(null, new EventArgs());
    }

    private void UpdateNextSwitchTime(DateTime? startTime, double duration)
    {
        if (startTime == null)
            return;

        var oldTime = _nextSwitchTime;
        _nextSwitchTime = startTime.Value.AddSeconds(duration);
        _logger.Info($"UpdateNextSwitchTime {oldTime} to {_nextSwitchTime},{duration}");
    }

    internal override void ReApplySetting(Wallpaper? wallpaper)
    {
        if (wallpaper == null)
            return;

        //重新生成播放列表
        wallpaper.GenerateRealPlaylist();
        _ = Play(wallpaper);
    }

    internal override void Resume()
    {
        _isPaused = false;
        _currentRender?.Resume();
    }

    internal override double GetDuration()
    {
        if (_currentRender == null)
            return 0;

        if (_playingWallpaper == null)
            return 0;

        var tmpDuration = _playingWallpaper.Setting.Duration;
        if (string.IsNullOrEmpty(tmpDuration) && !_currentRender.IsSupportProgress)
        {
            //没设置时间，并且本身没有进度的，默认一小时
            tmpDuration = "01:00";
        }

        //添加0day 符合timespan 格式
        if (tmpDuration?.Split(':').Length == 2)
            tmpDuration = $"{tmpDuration}:00";

        bool parseOk = TimeSpan.TryParse(tmpDuration, out TimeSpan duration);

        var res = duration.TotalSeconds;
        //有配置的，按配置时间
        if (parseOk && res > 0 || !_currentRender.IsSupportProgress)
            return res;

        //获取真实长度
        res = _currentRender.GetDuration();
        return res;
    }

    internal override double GetTimePos()
    {
        if (_currentRender == null)
            return 0;

        //if (_currentRender.IsSupportProgress)
        //    return _currentRender.GetTimePos();

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

        var duration = GetDuration();
        if (_currentRender.IsSupportProgress)
        {
            _currentRender.SetProgress(progress);
        }
        //else
        //{
        //根据进度计算时间
        progress /= 100;

        _startTime = DateTime.Now.AddSeconds(-progress * duration);
        //_nextSwitchTime = DateTime.Now.AddSeconds((1 - progress) * duration);
        //}
        UpdateNextSwitchTime(_startTime, duration);
    }

    internal override void SetVolume(uint volume)
    {
        _currentRender?.SetVolume(volume);
    }

    internal override void Stop()
    {
        _timer.Elapsed -= Timer_Elapsed;
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
