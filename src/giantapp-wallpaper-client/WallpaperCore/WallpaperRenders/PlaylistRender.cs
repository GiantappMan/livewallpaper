
namespace WallpaperCore.WallpaperRenders;

internal class PlaylistRender : BaseRender
{
    public override WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[] { WallpaperType.Playlist };

    internal override void Init(WallpaperManagerSnapshot? snapshotObj)
    {
        base.Init(snapshotObj);
    }

    internal override double GetDuration()
    {
        return base.GetDuration();
    }

    internal override object? GetSnapshot()
    {
        return base.GetSnapshot();
    }

    internal override double GetTimePos()
    {
        return base.GetTimePos();
    }

    internal override void Pause()
    {
        base.Pause();
    }

    internal override Task Play(Wallpaper? wallpaper)
    {
        return base.Play(wallpaper);
    }

    internal override void ReApplySetting(Wallpaper? wallpaper)
    {
        base.ReApplySetting(wallpaper);
    }

    internal override void Resume()
    {
        base.Resume();
    }

    internal override void SetProgress(double progress)
    {
        base.SetProgress(progress);
    }

    internal override void SetVolume(uint volume)
    {
        base.SetVolume(volume);
    }

    internal override void Stop()
    {
        base.Stop();
    }

    internal override Task Dispose()
    {
        return base.Dispose();
    }
}
