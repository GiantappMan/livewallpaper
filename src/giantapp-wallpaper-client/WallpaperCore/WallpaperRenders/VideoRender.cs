using NLog;
using WallpaperCore.Libs;

namespace WallpaperCore.WallpaperRenders;

public class VideoSnapshot
{
    public string? IPCServerName { get; set; }
    public int? PId { get; set; }
    public string? ProcessName { get; set; }
}

internal class VideoRender : BaseRender
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    bool _isRestore;
    MpvApi? _mpvPlayer;
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Video, WallpaperType.AnimatedImg, WallpaperType.Playlist };

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        if (snapshotObj?.Snapshots.FirstOrDefault(m => m is VideoSnapshot) is VideoSnapshot snapshot)
        {
            _mpvPlayer = new MpvApi(snapshot.IPCServerName, snapshot.PId, snapshot.ProcessName);
            _isRestore = true;
        }
        _mpvPlayer ??= new MpvApi();
    }

    internal override async Task Play(Wallpaper? wallpaper)
    {
        //当前播放设置
        var playSetting = wallpaper?.Setting;
        var playMeta = wallpaper?.Meta;
        var playWallpaper = wallpaper;

        if (_mpvPlayer == null || playWallpaper == null || playSetting == null || playMeta == null)
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

    internal override object? GetSnapshot()
    {
        if (_mpvPlayer == null || !_mpvPlayer.ProcessLaunched)
            return null;
        try
        {
            //缓存当前实力需要的数据
            return new VideoSnapshot()
            {
                IPCServerName = _mpvPlayer.IPCServerName,
                PId = !_mpvPlayer.ProcessLaunched ? null : _mpvPlayer.Process?.Id,
                ProcessName = _mpvPlayer.Process?.ProcessName
            };
        }
        catch (Exception ex)
        {
            _logger.Warn(ex, "Failed to get mpv snapshot.");
            return new();
        }
    }

    internal override void Resume()
    {
        _mpvPlayer?.Resume();
    }

    internal override double GetDuration()
    {
        if (_mpvPlayer == null)
            return 0;
        return _mpvPlayer.GetDuration();
    }

    internal override double GetTimePos()
    {
        if (_mpvPlayer == null)
            return 0;
        return _mpvPlayer.GetTimePos();
    }

    internal override void Stop()
    {
        _mpvPlayer?.Stop();
    }

    internal override void SetProgress(double progress)
    {
        _mpvPlayer?.SetProgress(progress);
    }

    internal override void Pause()
    {
        _mpvPlayer?.Pause();
    }

    internal override void SetVolume(uint volume)
    {
        _mpvPlayer?.SetVolume(volume);
    }

    internal override Task Dispose()
    {
        return Task.Run(() =>
        {
            if (_mpvPlayer == null)
                return;

            _mpvPlayer.Process?.CloseMainWindow();
            if (_isRestore && _mpvPlayer.Process?.HasExited == false)
                _mpvPlayer.Process?.Kill();//快照恢复的进程关不掉
        });
    }
}
