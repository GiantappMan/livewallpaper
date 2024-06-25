using System.IO;
using System;
using WallpaperCore;
using NLog;

namespace Client.Apps.Configs;

//壁纸设置
public class Wallpaper
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    public const string FullName = "Client.Apps.Configs.Wallpaper";
    public static string[] DefaultWallpaperSaveFolder { get; private set; } = new string[0];

    static Wallpaper()
    {
        UpdateDefaultWallpaperSaveFolder();
    }

    //壁纸目录，支持多个
    public string[] Directories { get; set; } = new string[0];
    public bool KeepWallpaper { get; set; } = false;
    public WallpaperCoveredBehavior CoveredBehavior { get; set; } = WallpaperCoveredBehavior.Pause;
    public VideoPlayer DefaultVideoPlayer { get; set; } = VideoPlayer.MPV_Player;

    public string[] EnsureDirectories()
    {
        if (Directories.Length == 0)
            return DefaultWallpaperSaveFolder;
        return Directories;
    }

    internal static void UpdateDefaultWallpaperSaveFolder()
    {
        try
        {
            if (Directory.Exists(@"D:\"))
            {
                DefaultWallpaperSaveFolder = new string[] { @"D:\LiveWallpaper" };

                //尝试创建文件夹，有些虚拟机D盘是驱动              
                Directory.CreateDirectory(DefaultWallpaperSaveFolder[0]);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "UpdateDefaultWallpaperSaveFolder");
        }

        string folder = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
        folder = Path.Combine(folder, "LiveWallpaper");
        DefaultWallpaperSaveFolder = new string[] { folder };
    }
}
