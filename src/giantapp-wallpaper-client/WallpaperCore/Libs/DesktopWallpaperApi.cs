using System.Runtime.InteropServices;

namespace WallpaperCore.Libs;

//系统壁纸接口
public class DesktopWallpaperApi
{
    public static Task SetWallpaper(string filePath, string? screenDeviceName)
    {
        //todo
        return Task.CompletedTask;
    }

    public static Task<string> GetWallpaper(string? screenDeviceName)
    {
        //todo
        return Task.FromResult("");
    }
}
