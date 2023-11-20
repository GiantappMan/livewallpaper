using NLog;
using System.Collections.Concurrent;

namespace WallpaperCore;

/// <summary>
/// 暴露壁纸API
/// </summary>
public static class WallpaperApi
{
    #region properties

    public static Logger Logger { get; } = LogManager.GetCurrentClassLogger();

    //运行中的屏幕和对应的播放列表，线程安全
    public static ConcurrentDictionary<uint, WallpaperManager> RunningWallpapers { get; } = new ConcurrentDictionary<uint, WallpaperManager>();

    #endregion

    #region events

    #endregion

    #region public method

    //一次性获取目录内的壁纸
    public static Wallpaper[] GetWallpapers(params string[] directories)
    {
        var wallpapers = new List<Wallpaper>();
        foreach (var directory in directories)
        {
            wallpapers.AddRange(EnumerateWallpapersAsync(directory));
        }

        return wallpapers.ToArray();
    }

    //枚举目录内的壁纸
    public static IEnumerable<Wallpaper> EnumerateWallpapersAsync(string directory)
    {
        //目录不存在
        if (!Directory.Exists(directory))
            yield break;

        // 遍历目录文件，筛选壁纸
        foreach (var file in Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories))
        {
            var fileInfo = new FileInfo(file);

            // 符合支持格式的
            if (Wallpaper.IsSupportedFile(fileInfo.Extension))
            {
                Wallpaper? wallpaper = Wallpaper.From(file);
                if (wallpaper == null)
                    continue;

                yield return wallpaper;
            }
        }
    }

    //获取屏幕信息
    public static Screen[] GetScreens()
    {
        var res= Screen.AllScreens;
        //根据bounds x坐标排序,按逗号分隔，x坐标是第一个
        Array.Sort(res, (a, b) =>
        {
            var aBounds = a.Bounds;
            var bBounds = b.Bounds;
            return aBounds.X.CompareTo(bBounds.X);
        });
        return res;
    }

    //显示壁纸
    public static void ShowWallpaper(Playlist playlist, uint screenIndex = 0)
    {
        RunningWallpapers.TryGetValue(screenIndex, out WallpaperManager manager);
        if (manager == null)
        {
            manager = new WallpaperManager()
            {
                Playlist = playlist,
                ScreenIndex = screenIndex
            };
            RunningWallpapers.TryAdd(screenIndex, manager);
        }
        else
        {
            manager.Playlist = playlist;
        }

        manager.Play(screenIndex);
    }

    //关闭壁纸
    public static void CloseWallpaper(uint screenIndex = 0)
    {
        RunningWallpapers.TryRemove(screenIndex, out _);
    }

    //删除壁纸
    public static void DeleteWallpaper(params Wallpaper[] wallpapers)
    {
        foreach (var wallpaper in wallpapers)
        {
            try
            {
                File.Delete(wallpaper.FilePath);

                //存在meta删除meta
                string fileName = Path.GetFileNameWithoutExtension(wallpaper.FileName);
                string metaJsonFile = Path.Combine(wallpaper.Dir, $"{fileName}.meta.json");
                if (File.Exists(metaJsonFile))
                    File.Delete(metaJsonFile);

                //如果文件夹空了，删除文件夹
                if (Directory.GetFiles(wallpaper.Dir).Length == 0)
                    Directory.Delete(wallpaper.Dir);
            }
            catch (Exception ex)
            {
                Logger?.Warn($"删除壁纸失败：{wallpaper.FilePath} ${ex}");
            }
        }
    }

    //下载壁纸
    public static void DownloadWallpaper(string saveDirectory, Wallpaper wallpapers, Playlist? toPlaylist)
    {
    }

    #endregion

    #region private methods

    #endregion

    #region internal methods

    //暂停壁纸
    static void PauseWallpaper(uint screenIndex = 0)
    {
    }

    //恢复壁纸
    static void ResumeWallpaper(uint screenIndex = 0)
    {
    }
    #endregion
}
