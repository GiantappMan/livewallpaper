
namespace WallpaperCore.WallpaperRenders;

internal abstract class BaseRender
{
    //支持的类型
    public virtual WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[0];

    internal virtual void Dispose()
    {
    }

    internal virtual double GetDuration()
    {
        return 0;
    }

    internal virtual object? GetSnapshot()
    {
        return null;
    }

    internal virtual double GetTimePos()
    {
        return 0;
    }

    internal virtual void Init(WallpaperManagerSnapshot? snapshotObj)
    {
    }

    internal virtual void Pause()
    {
    }

    internal virtual Task Play(Wallpaper? wallpaper)
    {
        return Task.CompletedTask;
    }

    internal virtual void Resume()
    {
    }

    internal virtual void SetProgress(double progress)
    {
    }

    internal virtual void SetVolume(uint volume)
    {
    }

    internal virtual void Stop()
    {
    }
}
