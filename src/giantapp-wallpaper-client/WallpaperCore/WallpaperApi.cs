namespace WallpaperCore;

public class MetaData
{
    public string? Name { get; set; }

}

//一个壁纸的设置
public class WallpaperSetting
{

}

//playlist的设置
public class PlaylistSetting
{

}

//表示一个壁纸
public class Wallpaper
{
    //描述数据
    public MetaData? Meta { get; set; }

    //设置
    public WallpaperSetting? Setting { get; set; }

    //本地绝对路径
    public string? LocalAbsolutePath { get; set; }
}

//播放列表
public class Playlist
{
    //描述数据
    public MetaData? Meta { get; set; }

    //设置
    public PlaylistSetting? Setting { get; set; }

    //播放列表内的壁纸
    public Wallpaper[] Wallpapers { get; set; } = new Wallpaper[0];
}


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

            // 1. 符合支持格式的
            if (IsSupportedFile(fileInfo.Extension))
            {
                yield return CreateWallpaper(file);
                continue;
            }

            var fileName = fileInfo.Name;

            // 2. 包含 project.json 的
            var projectJsonFile = Path.Combine(directory, "project.json");
            if (File.Exists(projectJsonFile))
            {
                yield return CreateWallpaper(file);
                continue;
            }

            // 3. 包含 [文件名].meta.json 的
            var metaJsonFile = Path.Combine(directory, $"{Path.GetFileNameWithoutExtension(fileName)}.meta.json");
            if (File.Exists(metaJsonFile))
            {
                yield return CreateWallpaper(file);
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

    private static Wallpaper CreateWallpaper(string filePath)
    {
        return new Wallpaper
        {
            LocalAbsolutePath = filePath
        };
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
