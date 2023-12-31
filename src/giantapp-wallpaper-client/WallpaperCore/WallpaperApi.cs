using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using NLog;
using System.Collections.Concurrent;
using Windows.Win32;

namespace WallpaperCore;

/// <summary>
/// 暴露壁纸API
/// </summary>
public static class WallpaperApi
{
    #region properties

    public static Logger Logger { get; } = LogManager.GetCurrentClassLogger();

    //运行中的屏幕和对应的播放列表，线程安全
    public static ConcurrentDictionary<uint, WallpaperManager> RunningWallpapers { get; } = new();
    public static JsonSerializerSettings JsonSettings { get; private set; } = new()
    {
        Formatting = Formatting.Indented,
        TypeNameHandling = TypeNameHandling.Auto,
        ContractResolver = new DefaultContractResolver
        {
            NamingStrategy = new CamelCaseNamingStrategy()
        }
    };

    #endregion

    static WallpaperApi()
    {
        WindowStateChecker.Instance.WindowStateChanged += Instance_WindowStateChanged;

        //禁用DPI
        SetPerMonitorV2DpiAwareness();
    }

    private static void Instance_WindowStateChanged(WindowStateChecker.WindowState state, Screen targetScreen)
    {
        System.Diagnostics.Debug.WriteLine($"{state},{targetScreen.DeviceName}");
        Logger.Info($"{state},{targetScreen.DeviceName}");
        var screenIndex = GetScreens().ToList().FindIndex(x => x.DeviceName == targetScreen.DeviceName);
        var manger = GetRunningManager((uint)screenIndex);
        if (state == WindowStateChecker.WindowState.Maximized)
        {
            //暂停壁纸
            manger.Pause(false);
        }
        else
        {
            //用户已手动暂停壁纸
            if (manger.Playlist == null || manger.Playlist.Setting == null || manger.Playlist.Setting.IsPaused)
                return;

            //恢复壁纸
            manger.Resume(false);
        }
    }

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

        //按meta.createTime创建日期倒序
        wallpapers.Sort((a, b) =>
        {
            if (b.Meta.CreateTime == null || a.Meta.CreateTime == null)
            {
                return -1;
            }
            return b.Meta.CreateTime.Value.CompareTo(a.Meta.CreateTime.Value);
        });


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
        var res = Screen.AllScreens;
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
    public static async Task<bool> ShowWallpaper(Playlist playlist, WallpaperManager? customManager = null)
    {
        if (playlist.Setting == null || playlist.Setting.ScreenIndexes.Length == 0)
            return false;

        foreach (var screenIndex in playlist.Setting.ScreenIndexes)
        {
            var manager = GetRunningManager(screenIndex, customManager);
            var tmplist = (Playlist)playlist.Clone();
            if (tmplist.Setting != null)
                tmplist.Setting.ScreenIndexes = new uint[] { screenIndex };
            manager.Playlist = tmplist;
            await manager.Play();
        }

        WindowStateChecker.Instance.Start();

        return true;
    }

    //关闭壁纸
    public static void CloseWallpaper(uint screenIndex = 0)
    {
        var manager = GetRunningManager(screenIndex);
        manager.Stop();
        RunningWallpapers.TryRemove(screenIndex, out _);
    }

    //删除壁纸
    public static void DeleteWallpaper(params Wallpaper[] wallpapers)
    {
        foreach (var wallpaper in wallpapers)
        {
            foreach (var item in RunningWallpapers)
            {
                bool isPlaying = item.Value.Playlist?.Wallpapers.Exists(m => m.FileUrl == wallpaper.FileUrl) ?? false;
                if (isPlaying)
                {
                    CloseWallpaper(item.Key);//正在播放关闭壁纸
                }
            }

            try
            {
                File.Delete(wallpaper.FilePath);

                //存在meta删除meta
                string fileName = Path.GetFileNameWithoutExtension(wallpaper.FileName);
                string metaJsonFile = Path.Combine(wallpaper.Dir, $"{fileName}.meta.json");
                if (File.Exists(metaJsonFile))
                    File.Delete(metaJsonFile);

                //存在setting删除setting
                string settingJsonFile = Path.Combine(wallpaper.Dir, $"{fileName}.setting.json");
                if (File.Exists(settingJsonFile))
                    File.Delete(settingJsonFile);

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

    //暂停壁纸
    public static void PauseWallpaper(params int[] screenIndexs)
    {
        if (screenIndexs.Length == 0)
            screenIndexs = Enumerable.Range(0, GetScreens().Length).ToArray();

        foreach (var screenIndex in screenIndexs)
        {
            if (screenIndex < 0)
                continue;
            var manger = GetRunningManager((uint)screenIndex);
            manger.Pause();
        }
    }

    //恢复壁纸
    public static void ResumeWallpaper(params int[] screenIndexs)
    {
        if (screenIndexs.Length == 0)
            screenIndexs = Enumerable.Range(0, GetScreens().Length).ToArray();

        foreach (var screenIndex in screenIndexs)
        {
            if (screenIndex < 0)
                continue;
            var manger = GetRunningManager((uint)screenIndex);
            manger.Resume();
        }
    }

    //设置音量
    public static void SetVolume(int volume, int? screenIndex = null)
    {
        if (screenIndex == null)
            screenIndex = 0;

        var screenIndexs = Enumerable.Range(0, GetScreens().Length).ToArray();
        foreach (var item in screenIndexs)
        {
            var manger = GetRunningManager((uint)item);
            manger.SetVolume(item == screenIndex ? volume : 0);
        }
    }

    public static void Dispose()
    {
        foreach (var item in RunningWallpapers)
        {
            item.Value.Dispose();
        }

        RunningWallpapers.Clear();
        WindowStateChecker.Instance.WindowStateChanged -= Instance_WindowStateChanged;
        WindowStateChecker.Instance.Stop();
    }

    //获取快照
    public static WallpaperApiSnapshot GetSnapshot()
    {
        var res = new WallpaperApiSnapshot
        {
            Data = new List<(Playlist Playlist, WallpaperManagerSnapshot PlayerData)>()
        };

        foreach (var item in RunningWallpapers)
        {
            var snapshotData = item.Value.GetSnapshotData();
            if (item.Value.Playlist != null)
            {
                if (item.Value.Playlist.Setting != null)
                    item.Value.Playlist.Setting.ScreenIndexes = new uint[] { item.Key };
                res.Data.Add((item.Value.Playlist, snapshotData));
            }
        }

        return res;
    }

    //创建壁纸
    public static bool CreateWallpaper(string title, string path, string saveFolder)
    {
        var wallpaper = Wallpaper.From(path, false);
        if (wallpaper == null)
            return false;

        if (!Directory.Exists(saveFolder))
            Directory.CreateDirectory(saveFolder);
        //保存到目录
        string extension = Path.GetExtension(path);
        string saveFileName = Guid.NewGuid().ToString();
        string savePath = Path.Combine(saveFolder, saveFileName + extension);
        File.Copy(path, savePath);

        //保存meta
        wallpaper.Meta.Title = title;
        string metaJsonFile = Path.Combine(saveFolder, $"{saveFileName}.meta.json");
        File.WriteAllText(metaJsonFile, JsonConvert.SerializeObject(wallpaper.Meta, JsonSettings));

        ////保存setting
        //string settingJsonFile = Path.Combine(saveFolder, $"{saveName}.setting.json");
        //File.WriteAllText(settingJsonFile, JsonConvert.SerializeObject(new PlaylistSetting(), JsonSettings));
        return true;
    }

    //恢复快照
    public static async Task RestoreFromSnapshot(WallpaperApiSnapshot? snapshot)
    {
        if (snapshot == null || snapshot.Data == null)
            return;

        foreach (var item in snapshot.Data)
        {
            var manager = new WallpaperManager(item.SnapshotData);
            await ShowWallpaper(item.Playlist, manager);
        }
    }

    #endregion

    #region private methods

    private static WallpaperManager GetRunningManager(uint screenIndex, WallpaperManager? customManager = null)
    {
        RunningWallpapers.TryGetValue(screenIndex, out WallpaperManager manager);
        if (manager == null)
        {
            manager = customManager ?? new WallpaperManager();
            RunningWallpapers.TryAdd(screenIndex, manager);
        }

        return manager;
    }

    static void SetPerMonitorV2DpiAwareness()
    {
        try
        {
            // 首先，尝试将DPI感知设置为PerMonitorV2
            if (PInvoke.SetProcessDpiAwarenessContext(new Windows.Win32.UI.HiDpi.DPI_AWARENESS_CONTEXT(-4)))
            {
                Logger.Info("成功设置为PerMonitorV2 DPI感知。");
            }
            else
            {
                // 如果函数失败，可以尝试使用较旧的方法设置
                if (PInvoke.SetProcessDpiAwareness(Windows.Win32.UI.HiDpi.PROCESS_DPI_AWARENESS.PROCESS_PER_MONITOR_DPI_AWARE).Succeeded)
                {
                    Logger.Info("成功设置为PerMonitor DPI感知。");
                }
                else
                {
                    Logger.Info("无法设置DPI感知。");
                }
            }
        }
        catch (Exception ex)
        {
            Logger.Error($"设置DPI感知时出错：{ex.Message}");
        }
    }

    #endregion

    #region internal methods

    #endregion
}
