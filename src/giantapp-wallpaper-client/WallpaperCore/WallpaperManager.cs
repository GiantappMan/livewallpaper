
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
    public uint ScreenIndex { get; set; }

    internal void Dispose()
    {
        _mpvPlayer.Process?.CloseMainWindow();
        if (_isRestore)
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

        if (_mpvPlayer.Process == null || _mpvPlayer.Process.HasExited)
        {
            await _mpvPlayer.LaunchAsync();
            var bounds = WallpaperApi.GetScreens()[ScreenIndex].Bounds;
            DesktopManager.SendHandleToDesktopBottom(_mpvPlayer.MainHandle, bounds);
        }

        //生成playlist.txt
        var playlist = Playlist.Wallpapers.Select(w => w.FilePath).ToArray();
        var playlistPath = Path.Combine(Path.GetTempPath(), $"playlist{ScreenIndex}.txt");
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
}
