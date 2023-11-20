
using WallpaperCore.Players;

namespace WallpaperCore;

//管理一个屏幕的壁纸播放
public class WallpaperManager
{
    readonly MpvPlayer _player = new("Assets\\Player\\mpv.exe");
    public Playlist? Playlist { get; set; }
    public uint ScreenIndex { get; set; }

    internal async void Play(uint screenIndex)
    {
        var file = Playlist?.Wallpapers[0];
        if (file == null || file.FilePath == null)
            return;
        if (_player.Process == null || _player.Process.HasExited)
        {
            await _player.LaunchAsync();
            var bounds = WallpaperApi.GetScreens()[screenIndex].Bounds;
            DesktopManager.SendHandleToDesktopBottom(_player.MainHandle, bounds);
        }
        //_player.LoadList(file.FilePath);
        _player.LoadFile(file.FilePath);
    }
}
