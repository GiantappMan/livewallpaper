
using WallpaperCore.Players;

namespace WallpaperCore;

//管理一个屏幕的壁纸播放
public class WallpaperManager
{
    readonly MpvPlayer _player = new("Assets\\Player\\mpv.exe");
    public Playlist? Playlist { get; set; }
    public uint ScreenIndex { get; set; }

    internal void Dispose()
    {
        _player.Process?.CloseMainWindow();
    }

    internal uint GetPlayIndex()
    {
        return _player.GetPlayIndex();
    }

    internal async void Play(uint screenIndex)
    {
        if (Playlist == null || Playlist.Wallpapers.Count == 0)
            return;
        if (_player.Process == null || _player.Process.HasExited)
        {
            await _player.LaunchAsync();
            var bounds = WallpaperApi.GetScreens()[screenIndex].Bounds;
            DesktopManager.SendHandleToDesktopBottom(_player.MainHandle, bounds);
        }

        //生成playlist.txt
        var playlist = Playlist.Wallpapers.Select(w => w.FilePath).ToArray();
        var playlistPath = Path.Combine(Path.GetTempPath(), $"playlist{screenIndex}.txt");
        File.WriteAllLines(playlistPath, playlist);
        _player.LoadList(playlistPath);
        //_player.LoadFile(Playlist.Wallpapers[0].FilePath);
    }
}
