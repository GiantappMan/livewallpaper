
using NLog;
using WallpaperCore.Libs;
using WallpaperCore.WallpaperRenders;

namespace WallpaperCore;

public class WallpaperManagerSnapshot
{
    public MpvPlayerSnapshot? MpvPlayerSnapshot { get; set; }
    public List<object> Snapshots { get; set; } = new();
}

//管理一个屏幕的壁纸播放
public class WallpaperManager
{
    readonly BaseRender[] _renders = new BaseRender[] { new VideoRender(), new ImgRender() };
    readonly BaseRender _currentRender = new();

    readonly Logger _logger = LogManager.GetCurrentClassLogger();
    WallpaperCoveredBehavior _currentCoveredBehavior = WallpaperCoveredBehavior.Pause;

    public WallpaperManager(WallpaperManagerSnapshot? snapshot = null)
    {
        foreach (var item in _renders)
        {
            item.Init(snapshot);
        }
    }

    public Wallpaper? Wallpaper { get; set; }
    public bool IsScreenMaximized { get; private set; }

    internal void Dispose()
    {
        try
        {
            foreach (var item in _renders)
            {
                item.Dispose();
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Dispose WallpaperManager");
            Console.WriteLine(ex.Message);
        }
    }

    //internal int GetPlayIndex()
    //{
    //    return _mpvPlayer.GetPlayIndex();
    //}

    internal async Task Play()
    {
        await _currentRender.Play(Wallpaper);

        if (IsScreenMaximized)
        {
            SetScreenMaximized(true);
        }
    }

    internal WallpaperManagerSnapshot GetSnapshotData()
    {
        var tmp = new WallpaperManagerSnapshot();
        foreach (var item in _renders)
        {
            tmp.Snapshots.Add(item.GetSnapshotData());
        }
        return tmp;
    }

    internal void Pause()
    {
        _currentRender.Pause();

        if (Wallpaper != null)
            Wallpaper.RunningInfo.IsPaused = true;
    }

    internal void Resume()
    {
        _currentRender.Resume();

        if (Wallpaper != null)
            Wallpaper.RunningInfo.IsPaused = false;
    }

    //internal void SetVolume(int volume)
    //{
    //    _mpvPlayer.SetVolume(volume);

    //    //if (Playlist != null)
    //    //    Playlist.Setting.Volume = volume;
    //}

    internal void Stop()
    {
        _currentRender.Stop();
        Wallpaper = null;
    }

    internal void SetScreenMaximized(bool screenMaximized)
    {
        IsScreenMaximized = screenMaximized;
        if (IsScreenMaximized)
        {
            _currentCoveredBehavior = WallpaperApi.Settings.CoveredBehavior;
            switch (_currentCoveredBehavior)
            {
                case WallpaperCoveredBehavior.None:
                    break;
                case WallpaperCoveredBehavior.Pause:
                    _currentRender.Pause();
                    break;
                case WallpaperCoveredBehavior.Stop:
                    _currentRender.Stop();
                    break;
            }
        }
        else
        {
            //用户已手动暂停壁纸
            if (Wallpaper == null || Wallpaper.RunningInfo.IsPaused)
                return;
            //恢复壁纸
            switch (_currentCoveredBehavior)
            {
                case WallpaperCoveredBehavior.None:
                    break;
                case WallpaperCoveredBehavior.Pause:
                    _currentRender.Resume();
                    break;
                case WallpaperCoveredBehavior.Stop:
                    _ = Play();
                    break;
            }
        }
    }

    internal void ReApplySetting()
    {
        //mpv 重新play就行了
        _ = Play();
    }

    internal double GetTimePos()
    {
        return _currentRender.GetTimePos();
    }

    internal double GetDuration()
    {
        return _currentRender.GetDuration();
    }

    internal void SetProgress(double progress)
    {
        _currentRender.SetProgress(progress);
    }

    internal bool CheckIsPlaying(Wallpaper wallpaper)
    {
        if (Wallpaper == null)
            return false;

        if (Wallpaper.Meta.IsPlaylist())
            return Wallpaper.Meta.Wallpapers.Exists(m => m.FileUrl == wallpaper.FileUrl);
        else
            return Wallpaper.FilePath == wallpaper.FilePath;
    }

    internal Wallpaper? GetRunningWallpaper()
    {
        if (Wallpaper == null)
            return null;

        if (Wallpaper.Meta.IsPlaylist() && Wallpaper.Meta.PlayIndex < Wallpaper.Meta.Wallpapers.Count())
            return Wallpaper.Meta.Wallpapers[(int)Wallpaper.Meta.PlayIndex];

        return Wallpaper;
    }

    internal void SetVolume(uint volume)
    {
        _currentRender.SetVolume(volume);
    }
}
