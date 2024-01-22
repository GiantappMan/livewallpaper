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
    public static ConcurrentDictionary<uint, WallpaperManager> RunningWallpapers { get; private set; } = new();
    //小于0就是禁用
    public static int AudioSourceIndex { get; set; }
    public static uint Volume { get; set; }

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
        manger.SetScreenMaximized(state == WindowStateChecker.WindowState.Maximized);
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
    public static async Task<bool> ShowWallpaper(Wallpaper wallpaper, WallpaperManager? customManager = null)
    {
        if (wallpaper.Setting.ScreenIndexes.Length == 0)
            return false;

        foreach (var screenIndex in wallpaper.Setting.ScreenIndexes)
        {
            var manager = GetRunningManager(screenIndex, customManager);
            var tmp = (Wallpaper)wallpaper.Clone();
            if (tmp.Setting != null)
                tmp.Setting.ScreenIndexes = new uint[] { screenIndex };
            manager.Wallpaper = tmp;
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
        //RunningWallpapers.TryRemove(screenIndex, out _);
    }

    //删除壁纸
    public static bool DeleteWallpaper(params Wallpaper[] wallpapers)
    {
        bool res = true;
        foreach (var wallpaper in wallpapers)
        {
            foreach (var item in RunningWallpapers)
            {
                bool isPlaying = item.Value.CheckIsPlaying(wallpaper);
                if (isPlaying)
                {
                    CloseWallpaper(item.Key);//正在播放关闭壁纸
                    Thread.Sleep(100);
                }
            }

            try
            {
                string projectJsonFile = Path.Combine(wallpaper.Dir, "project.json");
                if (File.Exists(projectJsonFile))
                {
                    //旧壁纸
                    //读取json
                    var oldData = JsonConvert.DeserializeObject<V2ProjectInfo>(File.ReadAllText(projectJsonFile));

                    //删除封面
                    if (oldData?.Preview != null)
                    {
                        string oldCoverFile = Path.Combine(wallpaper.Dir, oldData.Preview);
                        if (File.Exists(oldCoverFile))
                            File.Delete(oldCoverFile);
                    }

                    //删除project.json
                    File.Delete(projectJsonFile);

                    //删除壁纸
                    File.Delete(wallpaper.FilePath);

                    //删除option.json
                    string optionJsonFile = Path.Combine(wallpaper.Dir, "option.json");
                    if (File.Exists(optionJsonFile))
                        File.Delete(optionJsonFile);

                    //如果当前目录空了，删除当前文件夹
                    if (Directory.GetFiles(wallpaper.Dir).Length == 0 && Directory.GetDirectories(wallpaper.Dir).Length == 0)
                        Directory.Delete(wallpaper.Dir);
                    continue;
                }

                File.Delete(wallpaper.FilePath);

                //存在meta删除meta
                string fileName = Path.GetFileNameWithoutExtension(wallpaper.FileName);
                string metaJsonFile = Path.Combine(wallpaper.Dir, $"{fileName}.meta.json");
                if (File.Exists(metaJsonFile))
                    File.Delete(metaJsonFile);

                //存在cover删除cover
                string coverFile = Path.Combine(wallpaper.Dir, $"{fileName}.cover{Path.GetExtension(wallpaper.Meta.Cover)}");
                if (File.Exists(coverFile))
                    File.Delete(coverFile);

                //存在setting删除setting
                string settingJsonFile = Path.Combine(wallpaper.Dir, $"{fileName}.setting.json");
                if (File.Exists(settingJsonFile))
                    File.Delete(settingJsonFile);

                //如果文件夹空了，删除文件夹
                if (Directory.GetFiles(wallpaper.Dir).Length == 0 && Directory.GetDirectories(wallpaper.Dir).Length == 0)
                    Directory.Delete(wallpaper.Dir);
            }
            catch (Exception ex)
            {
                res = false;
                Logger?.Warn($"删除壁纸失败：{wallpaper.FilePath} ${ex}");
            }

            res = res && true;
        }
        return res;
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

    //停止壁纸
    public static void StopWallpaper(params int[] screenIndexs)
    {
        if (screenIndexs.Length == 0)
            screenIndexs = Enumerable.Range(0, GetScreens().Length).ToArray();

        foreach (var screenIndex in screenIndexs)
        {
            if (screenIndex < 0)
                continue;
            var manger = GetRunningManager((uint)screenIndex);
            manger.Stop();
        }
    }

    //设置音量
    public static void SetVolume(uint volume, int? audioSourceScreenIndex = null)
    {
        AudioSourceIndex = audioSourceScreenIndex ?? 0;
        Volume = volume;

        var screenIndexs = Enumerable.Range(0, GetScreens().Length).ToArray();
        foreach (var item in screenIndexs)
        {
            var manger = GetRunningManager((uint)item);
            manger.SetVolume(item == audioSourceScreenIndex ? volume : 0);
            //var currentWallpaper = manger.GetRunningWallpaper();
            ////播放列表的当前壁纸
            //if (currentWallpaper != null)
            //{
            //    //一次只设置一个音量，其他的设为0
            //    var setting = (WallpaperSetting)currentWallpaper.Setting.Clone();
            //    setting.Volume = item == screenIndex ? volume : 0;
            //    SetWallpaperSetting(setting, currentWallpaper);
            //}
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
            Data = new List<(Wallpaper Wallpaper, WallpaperManagerSnapshot SnapshotData)>(),
            AudioScreenIndex = AudioSourceIndex,
            Volume = Volume
        };

        foreach (var item in RunningWallpapers)
        {
            var snapshotData = item.Value.GetSnapshotData();
            if (item.Value.Wallpaper != null)
            {
                item.Value.Wallpaper.Setting.ScreenIndexes = new uint[] { item.Key };
                res.Data.Add((item.Value.Wallpaper, snapshotData));
            }
        }

        return res;
    }

    //创建壁纸
    public static bool CreateWallpaper(string title, string cover, string path, string saveFolder)
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

        //移动cover位置
        string coverExtension = Path.GetExtension(cover);
        string coverSavePath = Path.Combine(saveFolder, $"{saveFileName}.cover{coverExtension}");
        File.Copy(cover, coverSavePath);

        //保存meta
        wallpaper.Meta.Title = title;
        wallpaper.Meta.CreateTime = DateTime.Now;
        wallpaper.Meta.Cover = $"{saveFileName}.cover{coverExtension}";
        string metaJsonFile = Path.Combine(saveFolder, $"{saveFileName}.meta.json");
        File.WriteAllText(metaJsonFile, JsonConvert.SerializeObject(wallpaper.Meta, JsonSettings));

        ////保存setting
        //string settingJsonFile = Path.Combine(saveFolder, $"{saveName}.setting.json");
        //File.WriteAllText(settingJsonFile, JsonConvert.SerializeObject(new PlaylistSetting(), JsonSettings));

        return true;
    }

    //编辑壁纸
    public static bool UpdateWallpaper(string title, string? cover, string? path, Wallpaper oldWallpaper)
    {
        if (oldWallpaper.Dir == null || oldWallpaper.FileName == null)
            return false;

        string saveFolder = oldWallpaper.Dir;
        string saveFileName = Path.GetFileNameWithoutExtension(oldWallpaper.FileName);

        //保存到目录,文件变了
        if (path != oldWallpaper.FilePath)
        {
            //删除旧壁纸
            if (File.Exists(oldWallpaper.FilePath))
                File.Delete(oldWallpaper.FilePath);

            string extension = Path.GetExtension(path);
            string savePath = Path.Combine(saveFolder, saveFileName + extension);
            File.Copy(path, savePath, true);
        }

        //移动cover位置
        string coverExtension = Path.GetExtension(cover);
        string coverSavePath = Path.Combine(saveFolder, $"{saveFileName}.cover{coverExtension}");
        File.Copy(cover, coverSavePath, true);

        //保存meta
        oldWallpaper.Meta.Title = title;
        oldWallpaper.Meta.UpdateTime = DateTime.Now;
        oldWallpaper.Meta.Cover = $"{saveFileName}.cover{coverExtension}";
        string metaJsonFile = Path.Combine(saveFolder, $"{saveFileName}.meta.json");
        File.WriteAllText(metaJsonFile, JsonConvert.SerializeObject(oldWallpaper.Meta, JsonSettings));
        return true;
    }

    //设置壁纸配置
    public static bool SetWallpaperSetting(WallpaperSetting setting, Wallpaper wallpaper)
    {
        if (wallpaper.Dir == null || wallpaper.FileName == null)
            return false;

        string saveFolder = wallpaper.Dir;
        string saveFileName = Path.GetFileNameWithoutExtension(wallpaper.FileName);

        //保存setting
        string settingJsonFile = Path.Combine(saveFolder, $"{saveFileName}.setting.json");
        File.WriteAllText(settingJsonFile, JsonConvert.SerializeObject(setting, JsonSettings));

        //如果壁纸正在播放，重新调用ShowWallpaper以生效
        foreach (var item in RunningWallpapers)
        {
            if (item.Value.Wallpaper == null)
                continue;

            bool isPlaying = item.Value.CheckIsPlaying(item.Value.Wallpaper);
            if (isPlaying)
            {
                var playingWallpaper = item.Value.GetRunningWallpaper();
                if (playingWallpaper != null)
                    playingWallpaper.Setting = setting;
                item.Value.ReApplySetting();
            }
        }
        return true;
    }

    ////设置播放列表配置
    //public static bool SetPlaylistSetting(PlaylistSetting setting, Playlist playlist)
    //{
    //    return true;
    //}

    //恢复快照
    public static async Task RestoreFromSnapshot(WallpaperApiSnapshot? snapshot)
    {
        if (snapshot == null || snapshot.Data == null)
            return;

        AudioSourceIndex = snapshot.AudioScreenIndex;
        Volume = snapshot.Volume;
        foreach (var item in snapshot.Data)
        {            
            var manager = new WallpaperManager(item.SnapshotData);
            var screenIndex = item.Wallpaper.Setting.ScreenIndexes[0];
            if (screenIndex == AudioSourceIndex)
            {
                manager.SetVolume(Volume);
            }

            item.Wallpaper.Meta.EnsureId();
            await ShowWallpaper(item.Wallpaper, manager);
        }
    }

    //获取指定屏幕当前壁纸播放时长
    public static double GetTimePos(uint screenIndex)
    {
        var manager = GetRunningManager(screenIndex);
        return manager.GetTimePos();
    }

    //获取播放总时长
    public static double GetDuration(uint screenIndex)
    {
        var manager = GetRunningManager(screenIndex);
        return manager.GetDuration();
    }

    //设置播放进度
    public static void SetProgress(int progress, uint screenIndex)
    {
        var manager = GetRunningManager(screenIndex);
        manager.SetProgress(progress);
    }

    ////添加到播放列表
    //public static void AddToPlaylist(Playlist playlist, Wallpaper wallpaper)
    //{
    //    playlist.Wallpapers.Add(wallpaper);
    //    //如果是当前播放的playlist，更新数据
    //    foreach (var item in RunningWallpapers)
    //    {
    //        if (item.Value.Playlist != null && item.Value.Playlist.Id == playlist.Id)
    //        {
    //            item.Value.Playlist = playlist;
    //            item.Value.ReApplySetting();
    //        }
    //    }
    //}

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
