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

            uint screenIndex = wallpaper.RunningInfo.ScreenIndexes[0];
            var currentScreen = WallpaperApi.GetScreen(screenIndex);
            if (currentScreen == null)
                return;

            _currentMonitorId = DesktopWallpaperApi.GetMonitoryId(currentScreen);
            var oldWallpaper = DesktopWallpaperApi.GetWallpaper(_currentMonitorId);
            var oldPosition = DesktopWallpaperApi.GetPosition(_currentMonitorId);
            DesktopWallpaperApi.SetWallpaper(wallpaper.FilePath, _currentMonitorId, wallpaper.Setting.Fit);
            _snapshot ??= new();
            _snapshot.OldWallpaper ??= oldWallpaper;
            _snapshot.OldPosition ??= oldPosition;
        });
    }

    internal override void Stop()
    {
        if (_currentMonitorId == null || _snapshot?.OldWallpaper == null)
            return;

        DesktopWallpaperApi.SetWallpaper(_snapshot.OldWallpaper, _currentMonitorId, _snapshot.OldPosition);
        _snapshot = null;
    }

    internal override async Task Dispose()
    {
        Stop();
        //等待壁纸还原
        await Task.Delay(300);
    }
}
