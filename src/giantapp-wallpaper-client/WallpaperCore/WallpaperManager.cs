
using WallpaperCore.Players;

namespace WallpaperCore;

//管理一个屏幕的壁纸播放
public class WallpaperManager
{
    readonly MpvPlayer _mpvPlayer = new();
    public Playlist? Playlist { get; set; }
    public uint ScreenIndex { get; set; }

    internal void Dispose()
    {
        _mpvPlayer.Process?.CloseMainWindow();
    }

    internal int GetPlayIndex()
    {
        return _mpvPlayer.GetPlayIndex();
    }

    internal async void Play(uint screenIndex)
    {
        if (Playlist == null || Playlist.Wallpapers.Count == 0)
            return;
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

    internal List<string> GetSnapshotData()
    {
        return new List<string>();
    }
}
