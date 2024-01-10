
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

    public Playlist? Playlist { get; set; }
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
        if (Playlist == null || Playlist.Wallpapers.Count == 0)
            return;

        //前端可以传入多个屏幕，但是到WallpaperManger只处理一个屏幕
        uint screenIndex = Playlist.Setting.ScreenIndexes[0];

        var currentWallpaper = Playlist.Wallpapers[(int)Playlist.Setting.PlayIndex];
        _mpvPlayer.ApplySetting(currentWallpaper.Setting);


        //生成playlist.txt
        var playlist = Playlist.Wallpapers.Select(w => w.FilePath).ToArray();
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

        if (Playlist != null)
            Playlist.Setting.IsPaused = true;
    }

    internal void Resume()
    {
        _mpvPlayer.Resume();

        if (Playlist != null)
            Playlist.Setting.IsPaused = false;
    }

    internal void SetVolume(int volume)
    {
        _mpvPlayer.SetVolume(volume);

        //if (Playlist != null)
        //    Playlist.Setting.Volume = volume;
    }

    internal void Stop()
    {
        _mpvPlayer.Stop();
        Playlist = null;
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
            if (Playlist == null || Playlist.Setting == null || Playlist.Setting.IsPaused)
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
}
