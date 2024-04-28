


using System.Diagnostics;
using System.Text.Json;

namespace WallpaperCore.WallpaperRenders;
public abstract class BaseSnapshot
{
    public virtual string Key { get; set; } = "";
}
public abstract class BaseRender
{
    //支持的类型
    public virtual WallpaperType[] SupportTypes { get; protected set; } = new WallpaperType[0];
    //是否支持进度设置
    public virtual bool IsSupportProgress { get; protected set; } = false;

    internal T? GetSnapshot<T>(WallpaperManagerSnapshot? snapshotObj)
    {
        if (snapshotObj?.Snapshots == null)
            return default;

        foreach (var item in snapshotObj.Snapshots)
        {
            if (item is JsonElement jsonElement)
            {
                jsonElement.TryGetProperty("key", out JsonElement keyProperty);
                var typeName = typeof(T).Name;
                if (keyProperty.ValueKind == JsonValueKind.Undefined || keyProperty.GetString() != typeName)
                {
                    continue;
                }
                try
                {
                    var _snapshot = JsonSerializer.Deserialize<T>(jsonElement, WallpaperApi.JsonOptitons);
                    return _snapshot;
                }
                catch (JsonException ex)
                {
                    Debug.WriteLine(ex);
                }
                break;
            }
            else if (item is T snapshot)
            {
                return snapshot;
            }
        }

        return default;
    }

    internal virtual Task Dispose()
    {
        return Task.CompletedTask;
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

    internal virtual void ReApplySetting(Wallpaper? wallpaper)
    {
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
