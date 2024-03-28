using WallpaperCore.Libs;

namespace WallpaperCore.WallpaperRenders;

public class ImgSnapshot
{
    public string? OldWallpaper { get; set; }
}

internal class ImgRender : BaseRender
{
    ImgSnapshot? _snapshot;
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

    internal override Task Play(Wallpaper? wallpaper)
    {
        return base.Play(wallpaper);
    }

    internal override void Resume()
    {

    }
}
