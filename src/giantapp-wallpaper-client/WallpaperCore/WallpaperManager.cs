
using WallpaperCore.Players;

namespace WallpaperCore;

public class WallpaperManagerSnapshot
{
    public MpvPlayerSnapshot? MpvPlayerSnapshot { get; set; }
}

//管理一个屏幕的壁纸播放
public class WallpaperManager
{
    readonly MpvPlayer _mpvPlayer = new();
    readonly bool _isRestore;

    public WallpaperManager(WallpaperManagerSnapshot? snapshot = null)
    {
        if (snapshot != null)
        {
            if (snapshot.MpvPlayerSnapshot != null)
            {
                _mpvPlayer = new MpvPlayer(snapshot.MpvPlayerSnapshot);
                _isRestore = true;
            }
        }
    }

    public Wallpaper? Wallpaper { get; set; }
    public bool IsScreenMaximized { get; private set; }

    internal void Dispose()
    {
        _mpvPlayer.Process?.CloseMainWindow();
        if (_isRestore && _mpvPlayer.Process?.HasExited == false)
            _mpvPlayer.Process?.Kill();//快照恢复的进程关不掉
    }

    internal int GetPlayIndex()
    {
        return _mpvPlayer.GetPlayIndex();
    }

    internal async Task Play()
    {
        //当前播放设置
        var playSetting = Wallpaper?.Setting;
        var playWallpaper = Wallpaper;

        if (playWallpaper == null || playSetting == null)
            return;

        if (playSetting.IsPlaylist && playSetting.Wallpapers.Count == 0)
            return;

        if (!playSetting.IsPlaylist && playWallpaper.FilePath == null)
            return;

        //前端可以传入多个屏幕，但是到WallpaperManger只处理一个屏幕
        uint screenIndex = playSetting.ScreenIndexes[0];

        //是播放列表就更新当前播放的设置
        if (playSetting.IsPlaylist && playSetting.PlayIndex < playSetting.Wallpapers.Count())
        {
            playSetting = playSetting.Wallpapers[(int)playSetting.PlayIndex].Setting;
        }
        _mpvPlayer.ApplySetting(playSetting);

        //生成playlist.txt
        var playlist = new string[] { playWallpaper.FilePath! };
        if (playSetting.IsPlaylist)
        {
            playlist = playSetting.Wallpapers.Where(m => m.FilePath != null).Select(w => w.FilePath!).ToArray();
        }

        var playlistPath = Path.Combine(Path.GetTempPath(), $"playlist{screenIndex}.txt");
        File.WriteAllLines(playlistPath, playlist);

        if (!_mpvPlayer.ProcessLaunched)
        {
            await _mpvPlayer.LaunchAsync(playlistPath);
            var bounds = WallpaperApi.GetScreens()[screenIndex].Bounds;
            DesktopManager.SendHandleToDesktopBottom(_mpvPlayer.MainHandle, bounds);
        }
        else
        {
            _mpvPlayer.LoadList(playlistPath);
            _mpvPlayer.Resume();
        }

        if (IsScreenMaximized)
        {
            SetScreenMaximized(true);
        }
    }

    internal WallpaperManagerSnapshot GetSnapshotData()
    {
        return new WallpaperManagerSnapshot()
        {
            MpvPlayerSnapshot = _mpvPlayer.GetSnapshot()
        };
    }

    internal void Pause()
    {
        _mpvPlayer.Pause();

        if (Wallpaper != null)
            Wallpaper.Setting.IsPaused = true;
    }

    internal void Resume()
    {
        _mpvPlayer.Resume();

        if (Wallpaper != null)
            Wallpaper.Setting.IsPaused = false;
    }

    //internal void SetVolume(int volume)
    //{
    //    _mpvPlayer.SetVolume(volume);

    //    //if (Playlist != null)
    //    //    Playlist.Setting.Volume = volume;
    //}

    internal void Stop()
    {
        _mpvPlayer.Stop();
        Wallpaper = null;
    }

    internal void SetScreenMaximized(bool screenMaximized)
    {
        IsScreenMaximized = screenMaximized;
        if (IsScreenMaximized)
        {
            _mpvPlayer.Pause();
        }
        else
        {
            //用户已手动暂停壁纸
            if (Wallpaper == null || Wallpaper.Setting.IsPaused)
                return;

            //恢复壁纸
            _mpvPlayer.Resume();
        }
    }

    internal void ReApplySetting()
    {
        //mpv 重新play就行了
        _ = Play();
    }

    internal double GetTimePos()
    {
        return _mpvPlayer.GetTimePos();
    }

    internal double GetDuration()
    {
        return _mpvPlayer.GetDuration();
    }

    internal void SetProgress(double progress)
    {
        _mpvPlayer.SetProgress(progress);
    }

    internal bool CheckIsPlaying(Wallpaper wallpaper)
    {
        if (Wallpaper == null)
            return false;

        if (Wallpaper.Setting.IsPlaylist)
            return Wallpaper.Setting.Wallpapers.Exists(m => m.FileUrl == wallpaper.FileUrl);
        else
            return Wallpaper.FilePath == wallpaper.FilePath;
    }

    internal Wallpaper? GetRunningWallpaper()
    {
        if (Wallpaper == null)
            return null;

        if (Wallpaper.Setting.IsPlaylist && Wallpaper.Setting.PlayIndex < Wallpaper.Setting.Wallpapers.Count())
            return Wallpaper.Setting.Wallpapers[(int)Wallpaper.Setting.PlayIndex];

        return Wallpaper;
    }

    internal void SetVolume(uint volume)
    {
        _mpvPlayer.SetVolume(volume);
    }
}
