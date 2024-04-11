using System.IO;
using System;
using WallpaperCore;

namespace Client.Apps.Configs;

//壁纸设置
public class Wallpaper
{
    public const string FullName = "Client.Apps.Configs.Wallpaper";
    public static string[] DefaultWallpaperSaveFolder { get; private set; } = new string[0];
    public static VideoPlayer DefaultVideoPlayer { get; set; } = VideoPlayer.MPV_Player;

    static Wallpaper()
    {
        UpdateDefaultWallpaperSaveFolder();
    }

    //壁纸目录，支持多个
    public string[] Directories { get; set; } = new string[0];
    public bool KeepWallpaper { get; set; } = false;
    public WallpaperCoveredBehavior CoveredBehavior { get; set; } = WallpaperCoveredBehavior.Pause;

    public string[] EnsureDirectories()
    {
        if (Directories.Length == 0)
            return DefaultWallpaperSaveFolder;
        return Directories;
    }

    internal static void UpdateDefaultWallpaperSaveFolder()
    {
        if (Directory.Exists(@"D:\"))
        {
            DefaultWallpaperSaveFolder = new string[] { @"D:\LiveWallpaper" };
            return;
        }

        string folder = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
        folder = Path.Combine(folder, "LiveWallpaper");
        DefaultWallpaperSaveFolder = new string[] { folder };
    }
}
