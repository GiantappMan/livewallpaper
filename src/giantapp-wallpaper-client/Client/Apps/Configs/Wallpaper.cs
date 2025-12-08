using NLog;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Serialization;
using WallpaperCore;

namespace Client.Apps.Configs;

//壁纸设置
public class Wallpaper
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    public const string FullName = "Client.Apps.Configs.Wallpaper";
    [JsonIgnore]
    public bool EnsureExists { get; set; } = false;

    //壁纸目录，支持多个
    public string[] Directories { get; set; } = new string[0];
    public bool KeepWallpaper { get; set; } = false;
    public WallpaperCoveredBehavior CoveredBehavior { get; set; } = WallpaperCoveredBehavior.Pause;
    public WallpaperCoveringProcessFilter[] CoveringProcessFilters { get; set; } = new WallpaperCoveringProcessFilter[0];
    public WallpaperCoveringProcessFilterPriority CoveringProcessFilterPriority { get; set; } = WallpaperCoveringProcessFilterPriority.Class;
    public VideoPlayer DefaultVideoPlayer { get; set; } = VideoPlayer.MPV_Player;

    public string[] EnsureDirectories()
    {
        //只尝试创建一次目录
        if (EnsureExists)
            return Directories;

        List<string> folders = new();
        foreach (var item in (Directories.Length != 0 ? Directories : new string[] { @"D:\LiveWallpaper" }))
        {
            if (!Directory.Exists(item))
            {
                try
                {
                    Directory.CreateDirectory(item);
                    folders.Add(item);
                }
                catch (Exception ex)
                {
                    _logger.Error(ex, "EnsureDirectories");
                }
            }
            else
                folders.Add(item);
        }

        //如果至少有一个目录已存在或创建成功就直接返回
        if (folders.Count > 0)
            Directories = folders.ToArray();
        //否则切换至Videos目录下
        else
        {
            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "LiveWallpaper");
            Directory.CreateDirectory(path);
            Directories = new string[] { path };
        }

        EnsureExists = true;
        return Directories;
    }
}
