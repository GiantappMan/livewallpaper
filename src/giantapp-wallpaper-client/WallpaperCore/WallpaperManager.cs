
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
    public bool IsPaused { get; private set; }

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
        if (Playlist == null || Playlist.Wallpapers.Count == 0 || Playlist.Setting == null)
            return;

        //前端可以传入多个屏幕，但是到WallpaperManger只处理一个屏幕
        uint screenIndex = Playlist.Setting.ScreenIndexes[0];

        if (_mpvPlayer.Process == null || _mpvPlayer.Process.HasExited)
        {
            await _mpvPlayer.LaunchAsync();
            var bounds = WallpaperApi.GetScreens()[screenIndex].Bounds;
            DesktopManager.SendHandleToDesktopBottom(_mpvPlayer.MainHandle, bounds);
        }

        //生成playlist.txt
        var playlist = Playlist.Wallpapers.Select(w => w.FilePath).ToArray();
        var playlistPath = Path.Combine(Path.GetTempPath(), $"playlist{screenIndex}.txt");
        File.WriteAllLines(playlistPath, playlist);
        _mpvPlayer.LoadList(playlistPath);
    }

    internal WallpaperManagerSnapshot GetSnapshotData()
    {
        return new WallpaperManagerSnapshot()
        {
            MpvPlayerSnapshot = _mpvPlayer.GetSnapshot()
        };
    }

    internal void Pause(bool updateStatus = true)
    {
        _mpvPlayer.Pause();

        if (updateStatus)
            IsPaused = true;
    }

    internal void Resume(bool updateStatus = true)
    {
        _mpvPlayer.Resume();

        if (updateStatus)
            IsPaused = false;

    }
}
