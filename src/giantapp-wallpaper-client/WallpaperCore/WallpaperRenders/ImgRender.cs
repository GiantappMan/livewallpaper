using WallpaperCore.Libs;

namespace WallpaperCore.WallpaperRenders;

public class ImgSnapshot
{
    public string? OldWallpaper { get; set; }
    public DesktopWallpaperPosition? OldPosition { get; set; }
}

internal class ImgRender : BaseRender
{
    ImgSnapshot? _snapshot;
    string? _currentMonitorId;
    Wallpaper? _currentWallpaper;
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Img };

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        if (snapshotObj?.Snapshots.FirstOrDefault(m => m is ImgSnapshot) is ImgSnapshot snapshot)
        {
            _snapshot = snapshot;
        }
    }

    internal override object? GetSnapshot()
    {
        return _snapshot;
    }

    internal override async Task Play(Wallpaper? wallpaper)
    {
        await Task.Run(() =>
        {
            if (wallpaper == null)
                return;

            _currentWallpaper = wallpaper;
            uint screenIndex = wallpaper.RunningInfo.ScreenIndexes[0];
            var currentScreen = WallpaperApi.GetScreen(screenIndex);
            if (currentScreen == null)
                return;

            _currentMonitorId = DesktopWallpaperApi.GetMonitoryId(currentScreen);
            var oldWallpaper = DesktopWallpaperApi.GetWallpaper(_currentMonitorId);
            var oldPosition = DesktopWallpaperApi.GetPosition(_currentMonitorId);
            DesktopWallpaperApi.SetWallpaper(wallpaper.FilePath, _currentMonitorId, wallpaper.Setting.Fit);
            _snapshot ??= new();

            //更新旧壁纸，用于退出时还原
            _snapshot.OldWallpaper ??= oldWallpaper;
            if (wallpaper.Setting.KeepWallpaper)
                _snapshot.OldWallpaper = wallpaper.FilePath;
            _snapshot.OldPosition ??= oldPosition;
        });
    }

    internal override void Stop()
    {
        if (_currentMonitorId == null || _snapshot?.OldWallpaper == null)
            return;

        DesktopWallpaperApi.SetWallpaper(_snapshot.OldWallpaper, _currentMonitorId, _snapshot.OldPosition);
        _snapshot = null;
        _currentWallpaper = null;
    }

    internal override async Task Dispose()
    {
        if (_currentWallpaper == null)
            return;

        if (!_currentWallpaper.Setting.KeepWallpaper)
        {
            Stop();
            //等待壁纸还原
            await Task.Delay(300);
        }
    }
}
