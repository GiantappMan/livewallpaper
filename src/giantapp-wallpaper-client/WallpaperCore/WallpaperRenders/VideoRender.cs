using NLog;
using System.Diagnostics;
using System.Text.Json;
using WallpaperCore.Libs;

namespace WallpaperCore.WallpaperRenders;

public class VideoSnapshot : BaseSnapshot
{
    public override string Key { get; set; } = nameof(VideoSnapshot);
    public string? IPCServerName { get; set; }
    public int? PId { get; set; }
    public string? ProcessName { get; set; }
}

internal class VideoRender : BaseRender
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private VideoSnapshot? _snapshot;
    private bool _isRestore;
    private Wallpaper? _latestWallpaper;
    private IVideoApi? _playerApi;
    private double _duration = -1;
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Video, WallpaperType.AnimatedImg };
    public override bool IsSupportProgress { get; protected set; } = true;

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        _snapshot = GetSnapshot<VideoSnapshot>(snapshotObj);
        if (_snapshot != null)
            _isRestore = true;
        //if (snapshotObj?.Snapshots == null)
        //    return;

        //foreach (var item in snapshotObj.Snapshots)
        //{
        //    if (item is JsonElement jsonElement)
        //    {
        //        jsonElement.TryGetProperty("key", out JsonElement keyProperty);
        //        if (keyProperty.ValueKind == JsonValueKind.Undefined || keyProperty.GetString() != nameof(VideoSnapshot))
        //            continue;
        //        try
        //        {
        //            _snapshot = JsonSerializer.Deserialize<VideoSnapshot>(jsonElement, WallpaperApi.JsonOptitons);
        //            _isRestore = true;
        //        }
        //        catch (JsonException ex)
        //        {
        //            Debug.WriteLine(ex);
        //        }
        //        break;
        //    }
        //    else if (item is VideoSnapshot snapshot)
        //    {
        //        _snapshot = snapshot;
        //        _isRestore = true;
        //        break;
        //    }
        //}
    }

    internal override void ReApplySetting(Wallpaper? wallpaper)
    {
        _ = Play(wallpaper);
    }

    internal override async Task Play(Wallpaper? wallpaper)
    {
        //当前播放设置
        var playSetting = wallpaper?.Setting;
        var playMeta = wallpaper?.Meta;
        var playWallpaper = wallpaper;

        if (playWallpaper == null || playSetting == null || playMeta == null)
            return;

        _latestWallpaper = wallpaper;

        var videoPlayerType = playSetting.VideoPlayer;
        if (videoPlayerType == VideoPlayer.Default_Player)
            videoPlayerType = WallpaperApi.DefaultVideoPlayer;

        if (playMeta.Type == WallpaperType.AnimatedImg || playMeta.Type == WallpaperType.Playlist)
        {
            //动图和播放列表（暂时）用mpv支持
            if (_playerApi?.GetType() != typeof(MpvApi))
            {
                //切换播放器类型了
                _playerApi?.Stop();
                _playerApi = new MpvApi(_snapshot?.IPCServerName, _snapshot?.PId, _snapshot?.ProcessName);
            }
        }
        else
            switch (videoPlayerType)
            {
                case VideoPlayer.MPV_Player:
                    if (_playerApi?.GetType() != typeof(MpvApi))
                    {
                        //切换播放器类型了
                        _playerApi?.Stop();
                        _playerApi = null;
                    }

                    _playerApi ??= new MpvApi(_snapshot?.IPCServerName, _snapshot?.PId, _snapshot?.ProcessName);
                    break;
                case VideoPlayer.System_Player:
                    if (_playerApi?.GetType() != typeof(VideoPlayerApi))
                    {
                        //切换播放器类型了
                        _playerApi?.Stop();
                        _playerApi = null;
                    }

                    _playerApi ??= new VideoPlayerApi(_snapshot?.IPCServerName, _snapshot?.PId, _snapshot?.ProcessName);
                    break;
            }

        if (_playerApi == null)
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
            DeskTopHelper.SendHandleToDesktopBottom(_playerApi.MainHandle, bounds);
        }
        else
        {
            _playerApi.LoadList(playlistPath);
            Resume();
        }
        _duration = -1;
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
        if (_latestWallpaper == null)
            return;

        if (_playerApi?.Process == null || _playerApi.Process.HasExited)
        {
            //检查进程是不是崩了
            //有些情况下电脑锁屏自动杀进程
            _ = Play(_latestWallpaper);
        }
        else
            _playerApi?.Resume();
    }

    internal override double GetDuration()
    {
        if (_playerApi == null)
            return 0;

        if (_duration > 0)
            return _duration;

        _duration = _playerApi.GetDuration();
        return _duration;
    }

    internal override double GetTimePos()
    {
        if (_playerApi == null)
            return 0;
        return _playerApi.GetTimePos();
    }

    internal override void Stop()
    {
        _latestWallpaper = null;
        _playerApi?.Stop();
        _duration = -1;
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
