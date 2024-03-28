using WallpaperCore.Libs;

namespace WallpaperCore.WallpaperRenders;

public class ImgSnapshot
{
    public string? OldWallpaper { get; set; }
}

internal class ImgRender : BaseRender
{
    ImgSnapshot? _snapshot;
    Screen? _currentScreen;
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
        if (_currentScreen == null)
            return null;

        return _snapshot;
    }

    internal override async Task Play(Wallpaper? wallpaper)
    {
        if (wallpaper == null)
            return;

        uint screenIndex = wallpaper.RunningInfo.ScreenIndexes[0];
        _currentScreen = WallpaperApi.GetScreen(screenIndex);
        if (_currentScreen == null)
            return;

        var oldWallpaper = await DesktopWallpaperApi.SetWallpaper(wallpaper.FilePath, _currentScreen);
        _snapshot ??= new();
        _snapshot.OldWallpaper ??= oldWallpaper;
    }

    internal override void Stop()
    {
        if (_currentScreen == null || _snapshot?.OldWallpaper == null)
            return;

        _ = DesktopWallpaperApi.SetWallpaper(_snapshot.OldWallpaper, _currentScreen);
        _currentScreen = null;
    }

    internal override async Task Dispose()
    {
        Stop();
        //等待壁纸还原
        await Task.Delay(300);
    }
}
