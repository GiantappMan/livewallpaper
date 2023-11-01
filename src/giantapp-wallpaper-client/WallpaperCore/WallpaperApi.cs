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
    #region events

    #endregion

    #region public method

    //一次性获取目录内的壁纸
    public static Wallpaper[] GetWallpapers(string directory)
    {
        return new Wallpaper[] { };
    }

    //枚举目录内的壁纸
    public static IEnumerable<Wallpaper> EnumerateWallpapersAsync(string directory)
    {
        yield break;
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
