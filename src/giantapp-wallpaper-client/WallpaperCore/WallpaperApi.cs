using NLog;

namespace WallpaperCore;

public static class WallpaperApi
{
    #region properties

    //支持的视频格式
    public static string[] SupportedVideoFormats { get; } = new string[] { ".gif", ".mp4", ".webm", ".mkv", ".avi", ".wmv", ".mov", ".flv" };

    //支持的图片格式
    public static string[] SupportedImageFormats { get; } = new string[] { ".jpg", ".png", ".jpeg", ".bmp" };

    //支持的应用程序格式
    public static string[] SupportedApplicationFormats { get; } = new string[] { ".exe" };

    //支持的网页格式
    public static string[] SupportedWebFormats { get; } = new string[] { ".html", ".htm" };

    public static Logger Logger { get; } = LogManager.GetCurrentClassLogger();

    #endregion

    #region events

    #endregion

    #region public method

    //一次性获取目录内的壁纸
    public static Wallpaper[] GetWallpapers(string directory)
    {
        var res = EnumerateWallpapersAsync(directory).ToArray();
        return res;
    }

    //枚举目录内的壁纸
    public static IEnumerable<Wallpaper> EnumerateWallpapersAsync(string directory)
    {
        // 遍历目录文件，筛选壁纸
        foreach (var file in Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories))
        {
            var fileInfo = new FileInfo(file);

            // 符合支持格式的
            if (IsSupportedFile(fileInfo.Extension))
            {
                Wallpaper wallpaper = Wallpaper.From(file);
                yield return wallpaper;
            }
        }
    }

    //获取屏幕信息
    public static Screen[] GetScreens()
    {
        return new Screen[] { };
    }

    //显示壁纸
    public static void ShowWallpaper(Playlist playList, Screen? screen = null)
    {
    }

    //关闭壁纸
    public static void CloseWallpaper(Screen? screen = null)
    {
    }

    //删除壁纸
    public static void DeleteWallpaper(params Wallpaper[] wallpapers)
    {
    }

    //下载壁纸
    public static void DownloadWallpaper(Wallpaper wallpapers, Playlist? toPlaylist)
    {
    }

    //预览壁纸
    public static void PreviewWallpaper(Wallpaper wallpaper, Screen? screen = null)
    {
    }

    #endregion

    #region private methods
    private static bool IsSupportedFile(string fileExtension)
    {
        var lowerCaseExtension = fileExtension.ToLower();
        return SupportedImageFormats.Contains(lowerCaseExtension) ||
               SupportedVideoFormats.Contains(lowerCaseExtension) ||
               SupportedApplicationFormats.Contains(lowerCaseExtension) ||
               SupportedWebFormats.Contains(lowerCaseExtension);
    }

    #endregion

    #region internal methods

    //暂停壁纸
    static void PauseWallpaper(Screen? screen = null)
    {
    }

    //恢复壁纸
    static void ResumeWallpaper(Screen? screen = null)
    {
    }
    #endregion

}
