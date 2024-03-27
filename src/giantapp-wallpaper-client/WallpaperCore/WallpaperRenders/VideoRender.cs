using WallpaperCore.Libs;

namespace WallpaperCore.WallpaperRenders;

internal class VideoRender : BaseRender
{
    bool _isRestore;
    MpvPlayer _mpvPlayer = new();
    public override string[] SupportTypes { get; protected set; } = Wallpaper.VideoExtension.Concat(Wallpaper.AnimatedImgExtension).ToArray();


    internal override void Init(WallpaperManagerSnapshot? snapshot)
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

    internal override async Task Play(Wallpaper? wallpaper)
    {
        //当前播放设置
        var playSetting = wallpaper?.Setting;
        var playMeta = wallpaper?.Meta;
        var playWallpaper = wallpaper;

        if (playWallpaper == null || playSetting == null || playMeta == null)
            return;


        bool isPlaylist = playMeta.Type == WallpaperType.Playlist;

        if (isPlaylist && playMeta.Wallpapers.Count == 0)
            return;

        if (!isPlaylist && playWallpaper.FilePath == null)
            return;

        //前端可以传入多个屏幕，但是到WallpaperManger只处理一个屏幕
        uint screenIndex = playWallpaper.RunningInfo.ScreenIndexes[0];


        //是播放列表就更新当前播放的设置
        if (isPlaylist && playMeta.PlayIndex < playMeta.Wallpapers.Count())
        {
            playSetting = playMeta.Wallpapers[(int)playMeta.PlayIndex].Setting;
        }
        _mpvPlayer.ApplySetting(playSetting);

        //生成playlist.txt
        var playlist = new string[] { playWallpaper.FilePath! };
        if (isPlaylist)
        {
            playlist = playMeta.Wallpapers.Where(m => m.FilePath != null).Select(w => w.FilePath!).ToArray();
        }

        var playlistPath = Path.Combine(Path.GetTempPath(), $"playlist{screenIndex}.txt");
        File.WriteAllLines(playlistPath, playlist);

        if (!_mpvPlayer.ProcessLaunched)
        {
            await _mpvPlayer.LaunchAsync(playlistPath);
            var bounds = WallpaperApi.GetScreen(screenIndex)?.Bounds;
            DesktopManager.SendHandleToDesktopBottom(_mpvPlayer.MainHandle, bounds);
        }
        else
        {
            _mpvPlayer.LoadList(playlistPath);
            Resume();
        }

    }

    internal override void Dispose()
    {
        _mpvPlayer.Process?.CloseMainWindow();
        if (_isRestore && _mpvPlayer.Process?.HasExited == false)
            _mpvPlayer.Process?.Kill();//快照恢复的进程关不掉
    }
}
