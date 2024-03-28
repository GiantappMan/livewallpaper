
namespace WallpaperCore.WallpaperRenders;

internal abstract class BaseRender
{
    //支持的类型
    public virtual WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[0];

    internal virtual void Dispose()
    {
        throw new NotImplementedException();
    }

    internal virtual double GetDuration()
    {
        throw new NotImplementedException();
    }

    internal virtual object? GetSnapshot()
    {
        throw new NotImplementedException();
    }

    internal virtual double GetTimePos()
    {
        throw new NotImplementedException();
    }

    internal virtual void Init(WallpaperManagerSnapshot? snapshot)
    {
        throw new NotImplementedException();
    }

    internal virtual void Pause()
    {
        throw new NotImplementedException();
    }

    internal virtual Task Play(Wallpaper? wallpaper)
    {
        throw new NotImplementedException();
    }

    internal virtual void Resume()
    {
        throw new NotImplementedException();
    }

    internal virtual void SetProgress(double progress)
    {
        throw new NotImplementedException();
    }

    internal virtual void SetVolume(uint volume)
    {
        throw new NotImplementedException();
    }

    internal virtual void Stop()
    {
        throw new NotImplementedException();
    }
}
