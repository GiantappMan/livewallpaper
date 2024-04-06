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
    IVideoApi? _playerApi;
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Video, WallpaperType.AnimatedImg, WallpaperType.Playlist };

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        //测试
        _playerApi ??= new VideoPlayerApi();
        return;
        if (snapshotObj?.Snapshots.FirstOrDefault(m => m is VideoSnapshot) is VideoSnapshot snapshot)
        {
            _playerApi = new MpvApi(snapshot.IPCServerName, snapshot.PId, snapshot.ProcessName);
            _isRestore = true;
        }
        _playerApi ??= new MpvApi();
    }

    internal override async Task Play(Wallpaper? wallpaper)
    {
        //当前播放设置
        var playSetting = wallpaper?.Setting;
        var playMeta = wallpaper?.Meta;
        var playWallpaper = wallpaper;

        if (_playerApi == null || playWallpaper == null || playSetting == null || playMeta == null)
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
        _playerApi.ApplySetting(playSetting);

        //生成playlist.txt
        var playlist = new string[] { playWallpaper.FilePath! };
        if (isPlaylist)
        {
            playlist = playMeta.Wallpapers.Where(m => m.FilePath != null).Select(w => w.FilePath!).ToArray();
        }

        var playlistPath = Path.Combine(Path.GetTempPath(), $"playlist{screenIndex}.txt");
        File.WriteAllLines(playlistPath, playlist);

        if (!_playerApi.ProcessLaunched)
        {
            await _playerApi.LaunchAsync(playlistPath);
            var bounds = WallpaperApi.GetScreen(screenIndex)?.Bounds;
            DesktopManager.SendHandleToDesktopBottom(_playerApi.MainHandle, bounds);
        }
        else
        {
            _playerApi.LoadList(playlistPath);
            Resume();
        }
    }

    internal override object? GetSnapshot()
    {
        if (_playerApi == null || !_playerApi.ProcessLaunched)
            return null;
        try
        {
            //缓存当前实力需要的数据
            return new VideoSnapshot()
            {
                IPCServerName = _playerApi.IPCServerName,
                PId = !_playerApi.ProcessLaunched ? null : _playerApi.Process?.Id,
                ProcessName = _playerApi.Process?.ProcessName
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
        _playerApi?.Resume();
    }

    internal override double GetDuration()
    {
        if (_playerApi == null)
            return 0;
        return _playerApi.GetDuration();
    }

    internal override double GetTimePos()
    {
        if (_playerApi == null)
            return 0;
        return _playerApi.GetTimePos();
    }

    internal override void Stop()
    {
        _playerApi?.Stop();
    }

    internal override void SetProgress(double progress)
    {
        _playerApi?.SetProgress(progress);
    }

    internal override void Pause()
    {
        _playerApi?.Pause();
    }

    internal override void SetVolume(uint volume)
    {
        _playerApi?.SetVolume(volume);
    }

    internal override Task Dispose()
    {
        return Task.Run(() =>
        {
            if (_playerApi == null)
                return;

            _playerApi.Process?.CloseMainWindow();
            if (_isRestore && _playerApi.Process?.HasExited == false)
                _playerApi.Process?.Kill();//快照恢复的进程关不掉
        });
    }
}
