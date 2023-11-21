using System.IO;
using System;

namespace Client.Apps.Configs;

//壁纸设置
public class Wallpaper
{
    public const string FullName = "Client.Apps.Configs.Wallpaper";
    public static string[] DefaultWallpaperSaveFolder { get; private set; } = new string[0];

    static Wallpaper()
    {
        UpdateDefaultWallpaperSaveFolder();
    }

    //壁纸目录，支持多个
    public string[]? Directories { get; set; }
    public bool? KeepWallpaper { get; set; } = false;

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
