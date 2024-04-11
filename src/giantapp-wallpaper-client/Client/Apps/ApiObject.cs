using Client.Libs;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using WallpaperCore;
using Windows.ApplicationModel;
using ConfigWallpaper = Client.Apps.Configs.Wallpaper;
using ConfigAppearance = Client.Apps.Configs.Appearance;
using GiantappWallpaper;
using System.Text.Json;

namespace Client.Apps;

public class ConfigSetAfterEventArgs : EventArgs
{
    public string Key { get; set; } = string.Empty;
    public string OldJson { get; set; } = string.Empty;
    public string Json { get; set; } = string.Empty;
}

public class CorrectConfigEventArgs : ConfigSetAfterEventArgs
{
    public object? Corrected { get; set; }
}

public class ProgressEventArgs : EventArgs
{
    public int Progress { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public bool IsError { get; set; }
}

public class PlayingStatus
{
    public Screen[] Screens { get; set; } = new Screen[0];
    public int AudioScreenIndex { get; set; }
    public uint Volume { get; set; }
    public List<Wallpaper> Wallpapers { get; set; } = new();
}

/// <summary>
/// 前端api
/// </summary>
[ClassInterface(ClassInterfaceType.AutoDual)]
[ComVisible(true)]
public class ApiObject
{
    public static event EventHandler<ConfigSetAfterEventArgs>? ConfigSetAfterEvent;
    public static event EventHandler<CorrectConfigEventArgs>? CorrectConfigEvent;
    //public delegate void EventDelegate(string data);
    //public event EventDelegate? InitProgressEvent;

    //定义一个事件，表示前端需要刷新网页
    public event EventHandler? RefreshPageEvent;

    //下载状态发生变化
    public event EventHandler? DownloadStatusChangedEvent;

    public ApiObject()
    {
        //Task.Run(() =>
        //{
        //    //模拟10秒进度
        //    for (int i = 0; i < 1000; i++)
        //    {
        //        Task.Delay(1000).Wait();
        //        string json = JsonConvert.SerializeObject(new ProgressEventArgs
        //        {
        //            Progress = i * 10,
        //            Message = $"``初始化中{i * 10}%"
        //        });
        //        //InitProgressEvent?.Invoke(json);
        //        RefreshPageEvent?.Invoke(this, EventArgs.Empty);
        //    }
        //});
    }

    public void SetConfig(string key, string json)
    {
        key = $"Client.Apps.Configs.{key}";
        var obj = JsonSerializer.Deserialize<object>(json, WallpaperApi.JsonOptitons);
        Configer.Set(key, obj, out object? oldConfig, true);
        if (ConfigSetAfterEvent != null && obj != null)
        {
            ConfigSetAfterEvent(this, new ConfigSetAfterEventArgs
            {
                Key = key,
                Json = json,
                OldJson = oldConfig == null ? string.Empty : JsonSerializer.Serialize(oldConfig, WallpaperApi.JsonOptitons)
            });
        }
    }

    public string GetConfig(string key)
    {
        key = $"Client.Apps.Configs.{key}";
        var config = Configer.Get<object>(key);
        if (config == null)
        {
            //反射key对应的类型，创建一个新的实例
            var type = Type.GetType(key);
            if (type != null)
                config = Activator.CreateInstance(type);
        }
        var json = JsonSerializer.Serialize(config, WallpaperApi.JsonOptitons);
        if (CorrectConfigEvent != null)
        {
            var e = new CorrectConfigEventArgs
            {
                Key = key,
                Json = json
            };
            CorrectConfigEvent(this, e);
            if (e.Corrected != null)
            {
                json = JsonSerializer.Serialize(e.Corrected, WallpaperApi.JsonOptitons);
            }
        }

        return json;
    }

    public string GetWallpapers()
    {
        var config = Configer.Get<ConfigWallpaper>() ?? new();
        var res = WallpaperApi.GetWallpapers(config.EnsureDirectories());
        foreach (var item in res)
        {
            //把本地路径转换为网址
            item.CoverUrl = AppService.ConvertPathToUrl(config, item.CoverPath);
            item.FileUrl = AppService.ConvertPathToUrl(config, item.FilePath);
        }
        return JsonSerializer.Serialize(res, WallpaperApi.JsonOptitons);
    }

    //[Obsolete]
    //public string GetScreens()
    //{
    //    var screens = WallpaperApi.GetScreens();
    //    return JsonConvert.SerializeObject(screens, WallpaperApi.JsonSettings);
    //}

    public async Task<bool> ShowWallpaper(string wallpaperJson)
    {
        var wallpaper = JsonSerializer.Deserialize<Wallpaper>(wallpaperJson, WallpaperApi.JsonOptitons);
        if (wallpaper == null)
            return false;

        wallpaper.RunningInfo.IsPaused = false;

        var config = Configer.Get<ConfigWallpaper>() ?? new();

        //把playlist里面的url转换成本地路径
        wallpaper.CoverUrl = AppService.ConvertUrlToPath(config, wallpaper.CoverPath);
        wallpaper.FileUrl = AppService.ConvertUrlToPath(config, wallpaper.FilePath);

        if (wallpaper.Meta.IsPlaylist())
            foreach (var item in wallpaper.Meta.Wallpapers)
            {
                item.CoverUrl = AppService.ConvertUrlToPath(config, item.CoverPath);
                item.FileUrl = AppService.ConvertUrlToPath(config, item.FilePath);
            }

        var res = await WallpaperApi.ShowWallpaper(wallpaper);
        AppService.SaveSnapshot();

        return res;
    }

    //获取播放状态
    public string GetPlayingStatus()
    {
        var res = new PlayingStatus();

        //检查数据
        var tmpWallpapers = WallpaperApi.RunningWallpapers.Values.Where(m => m.Wallpaper != null).Select(m =>
         {
             m.Wallpaper!.Meta.EnsureId();
             return m.Wallpaper!;
         }).ToList();

        var config = Configer.Get<ConfigWallpaper>() ?? new();
        //转换路径
        foreach (var item in tmpWallpapers)
        {
            if (item == null)
                continue;

            item.CoverUrl = AppService.ConvertPathToUrl(config, item.CoverPath);
            item.FileUrl = AppService.ConvertPathToUrl(config, item.FilePath);

            if (item.Meta.IsPlaylist())
                foreach (var wallpaper in item.Meta.Wallpapers)
                {
                    wallpaper.CoverUrl = AppService.ConvertPathToUrl(config, wallpaper.CoverPath);
                    wallpaper.FileUrl = AppService.ConvertPathToUrl(config, wallpaper.FilePath);
                }
        }

        res.Screens = WallpaperApi.GetScreens();
        res.Wallpapers = tmpWallpapers;
        res.Volume = WallpaperApi.Settings.Volume;
        res.AudioScreenIndex = WallpaperApi.Settings.AudioSourceIndex;

        return JsonSerializer.Serialize(res, WallpaperApi.JsonOptitons);
    }

    public void PauseWallpaper(string? screenIndexStr)
    {
        bool ok = int.TryParse(screenIndexStr, out int screenIndex);
        if (ok && screenIndex > 0)
            WallpaperApi.PauseWallpaper(screenIndex);
        else
            WallpaperApi.PauseWallpaper();
    }

    public void ResumeWallpaper(string? screenIndexStr)
    {
        bool ok = int.TryParse(screenIndexStr, out int screenIndex);
        if (ok && screenIndex > 0)
            WallpaperApi.ResumeWallpaper(screenIndex);
        else
            WallpaperApi.ResumeWallpaper();
    }

    public void StopWallpaper(string? screenIndexStr)
    {
        bool ok = int.TryParse(screenIndexStr, out int screenIndex);
        if (ok && screenIndex >= 0)
            WallpaperApi.StopWallpaper(screenIndex);
        else
            WallpaperApi.StopWallpaper();
        AppService.SaveSnapshot();
    }

    public void SetVolume(string volume, string screenIndexStr)
    {
        bool ok = int.TryParse(screenIndexStr, out int screenIndex);
        if (ok)
        {
            WallpaperApi.SetVolume(uint.Parse(volume), screenIndex);
            AppService.SaveSnapshot();
        }
    }

    public string GetVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        //获取 AssemblyInformationalVersionAttribute
        var attribute = assembly.GetCustomAttributes(typeof(AssemblyInformationalVersionAttribute), false).FirstOrDefault();
        if (attribute != null)
        {
            var version = ((AssemblyInformationalVersionAttribute)attribute).InformationalVersion;
            //忽略+号后的内容
            var index = version.IndexOf('+');
            if (index > 0)
                version = version[..index];
            return version;
        }
        var version1 = Assembly.GetExecutingAssembly().GetName().Version;
        return version1.ToString();
    }

    //前端上传文件
    public string UploadToTmp(string filename, string fileContentBase64)
    {
        byte[] fileContent = Convert.FromBase64String(fileContentBase64);
        //临时目录不存在则创建
        if (!Directory.Exists(AppService.TempFolder))
            Directory.CreateDirectory(AppService.TempFolder);

        filename = Path.Combine(AppService.TempFolder, filename);
        File.WriteAllBytes(filename, fileContent);
        var url = AppService.ConvertTmpPathToUrl(filename);
        return url;
    }

    public bool CreateWallpaperNew(string wallpaperJson)
    {
        var wallpaper = JsonSerializer.Deserialize<Wallpaper>(wallpaperJson, WallpaperApi.JsonOptitons);
        if (wallpaper == null)
            return false;

        var config = Configer.Get<ConfigWallpaper>() ?? new();

        //把playlist里面的url转换成本地路径
        if (wallpaper.CoverUrl != null)
            wallpaper.CoverPath = AppService.ConvertUrlToTmpPath(wallpaper.CoverUrl);
        if (wallpaper.FileUrl != null)
            wallpaper.FilePath = AppService.ConvertUrlToTmpPath(wallpaper.FileUrl);

        if (wallpaper.Meta.IsPlaylist())
            foreach (var item in wallpaper.Meta.Wallpapers)
            {
                item.CoverPath = AppService.ConvertUrlToPath(config, item.CoverUrl);
                item.FilePath = AppService.ConvertUrlToPath(config, item.FileUrl);
            }

        var res = WallpaperApi.CreateWallpaper(wallpaper, config.EnsureDirectories()[0]);
        AppService.SaveSnapshot();

        return res;
    }

    //[Obsolete]
    //public bool CreateWallpaper(string title, string coverUrl, string pathUrl)
    //{
    //    var path = AppService.ConvertUrlToTmpPath(pathUrl);
    //    var cover = AppService.ConvertUrlToTmpPath(coverUrl);
    //    var config = Configer.Get<ConfigWallpaper>() ?? new();
    //    if (config.Directories.Length == 0 || string.IsNullOrEmpty(path))
    //        return false;

    //    return WallpaperApi.CreateWallpaper(title, cover, path, config.Directories[0]);
    //}

    //[Obsolete]
    //public bool UpdateWallpaper(string title, string coverUrl, string pathUrl, string oldWallpaperJson)
    //{
    //    var config = Configer.Get<ConfigWallpaper>() ?? new();
    //    var path = AppService.ConvertUrlToTmpPath(pathUrl);
    //    path = AppService.ConvertUrlToPath(config, path);//有可能没改，就是壁纸目录
    //    var cover = AppService.ConvertUrlToTmpPath(coverUrl);

    //    var oldWallpaper = JsonConvert.DeserializeObject<Wallpaper>(oldWallpaperJson, WallpaperApi.JsonSettings);
    //    if (oldWallpaper == null)
    //        return false;
    //    return WallpaperApi.UpdateWallpaper(title, cover, path, oldWallpaper);
    //}

    public bool UpdateWallpaperNew(string newWallpaperJson, string oldWallpaperPath)
    {
        var newWallpaper = JsonSerializer.Deserialize<Wallpaper>(newWallpaperJson, WallpaperApi.JsonOptitons);
        ConfigWallpaper config = Configer.Get<ConfigWallpaper>() ?? new();

        if (newWallpaper == null || string.IsNullOrEmpty(oldWallpaperPath))
            return false;

        oldWallpaperPath = AppService.ConvertUrlToPath(config, oldWallpaperPath) ?? "";
        var oldWallpaper = Wallpaper.From(oldWallpaperPath);

        if (oldWallpaper == null)
            return false;

        //把playlist里面的url转换成本地路径
        if (newWallpaper.CoverUrl != null)
            newWallpaper.CoverPath = AppService.ConvertUrlToTmpPath(newWallpaper.CoverUrl);
        if (newWallpaper.FileUrl != null)
        {
            newWallpaper.FilePath = AppService.ConvertUrlToTmpPath(newWallpaper.FileUrl);
            newWallpaper.FilePath = AppService.ConvertUrlToPath(config, newWallpaper.FilePath);//有可能没改，就是壁纸目录
        }

        if (newWallpaper.Meta.IsPlaylist())
            foreach (var item in newWallpaper.Meta.Wallpapers)
            {
                item.CoverPath = AppService.ConvertUrlToPath(config, item.CoverUrl);
                item.FilePath = AppService.ConvertUrlToPath(config, item.FileUrl);
            }

        return WallpaperApi.UpdateWallpaper(newWallpaper, oldWallpaper);
    }

    public bool DeleteWallpaper(string wallpaperJson)
    {
        var wallpaper = JsonSerializer.Deserialize<Wallpaper>(wallpaperJson, WallpaperApi.JsonOptitons);
        if (wallpaper != null)
            return WallpaperApi.DeleteWallpaper(wallpaper);
        return false;
    }

    //通过默认浏览器打开url
    public void OpenUrl(string url)
    {
        try
        {
            Process.Start(url);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message);
        }
    }

    //打开对应文件夹，并选中文件
    public void Explore(string path)
    {
        try
        {
            Process.Start("explorer.exe", $"/select,\"{path}\"");
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message);
        }
    }

    public bool SetWallpaperSetting(string settingJson, string wallpaperJson)
    {
        var setting = JsonSerializer.Deserialize<WallpaperSetting>(settingJson, WallpaperApi.JsonOptitons);
        var wallpaper = JsonSerializer.Deserialize<Wallpaper>(wallpaperJson, WallpaperApi.JsonOptitons);

        if (setting != null && wallpaper != null)
        {
            //if (setting.Volume > 0)
            //{
            //    //修改了声音，先全部静音
            //    WallpaperApi.SetVolume(0);
            //}

            if (setting.VideoPlayer == VideoPlayer.Default_Player)
            {
                ConfigWallpaper config = Configer.Get<ConfigWallpaper>() ?? new();
                //修改默认值
                setting.DefaultVideoPlayer = config.DefaultVideoPlayer;
            }

            return WallpaperApi.SetWallpaperSetting(setting, wallpaper);
        }
        return false;
    }

    //public bool SetPlaylistSetting(string playlistSettingJson, string playlistJson)
    //{
    //    var playlistSetting = JsonConvert.DeserializeObject<PlaylistSetting>(playlistSettingJson, WallpaperApi.JsonSettings);
    //    var playlist = JsonConvert.DeserializeObject<Playlist>(playlistJson, WallpaperApi.JsonSettings);
    //    if (playlistSetting != null && playlist != null)
    //        return WallpaperApi.SetPlaylistSetting(playlistSetting, playlist);
    //    return false;
    //}

    //获取指定屏幕的壁纸的当前播放时间和总时间
    public string? GetWallpaperTime(string screenIndexStr)
    {
        int screenIndex = -1;
        if (screenIndexStr == null)
        {
            //如果播放的壁纸都是相同路径
            var isSamePath = WallpaperApi.RunningWallpapers.Values.Where(m => m.Wallpaper != null).All(m => m.Wallpaper?.Meta.Wallpapers.All(m => m.FilePath == m.FilePath) == true);
            if (!isSamePath) return null;
            //找到第一个没被遮挡的播放器
            var playingManager = WallpaperApi.RunningWallpapers.Values.FirstOrDefault(m => m.IsScreenMaximized == false);
            if (playingManager == null) return null;
            if (playingManager.Wallpaper?.RunningInfo.ScreenIndexes[0] != null)
            {
                screenIndex = (int)playingManager.Wallpaper.RunningInfo.ScreenIndexes[0];
            }
        }
        else
        {
            bool ok = int.TryParse(screenIndexStr, out screenIndex);
            if (!ok)
                return null;
        }

        if (screenIndex < 0)
            return null;

        var duration = WallpaperApi.GetDuration((uint)screenIndex);
        var position = WallpaperApi.GetTimePos((uint)screenIndex);
        var res = new
        {
            Duration = duration,
            Position = position
        };
        return JsonSerializer.Serialize(res, WallpaperApi.JsonOptitons);
    }

    //设置播放进度
    public void SetProgress(string progressStr, string screenIndexStr)
    {
        if (screenIndexStr == null)
        {
            //如果播放的壁纸都是相同路径
            var isSamePath = WallpaperApi.RunningWallpapers.Values.All(m => m.Wallpaper?.Meta.Wallpapers.All(m => m.FilePath == m.FilePath) == true);
            if (!isSamePath) return;

            //设置所有屏幕
            foreach (var item in WallpaperApi.RunningWallpapers.Values)
            {
                if (item.Wallpaper?.RunningInfo.ScreenIndexes[0] == null)
                    continue;
                WallpaperApi.SetProgress(int.Parse(progressStr), item.Wallpaper.RunningInfo.ScreenIndexes[0]);
            }
            return;
        }
        bool ok = uint.TryParse(screenIndexStr, out uint screenIndex);
        if (ok)
        {
            WallpaperApi.SetProgress(int.Parse(progressStr), screenIndex);
        }
    }

    ////添加到播放列表
    //public void AddToPlaylist(string playlistJson, string wallpaperJson)
    //{
    //    var playlist = JsonConvert.DeserializeObject<Playlist>(playlistJson, WallpaperApi.JsonSettings);
    //    var wallpaper = JsonConvert.DeserializeObject<Wallpaper>(wallpaperJson, WallpaperApi.JsonSettings);
    //    if (playlist != null && wallpaper != null)
    //    {
    //        WallpaperApi.AddToPlaylist(playlist, wallpaper);
    //    }
    //}

    //下载壁纸
    public async Task<bool> DownloadWallpaper(string coverUrl, string wallpaperUrl, string wallpaperMetaJson)
    {
        try
        {
            var config = Configer.Get<ConfigWallpaper>() ?? new();
            var saveDir = config.EnsureDirectories()[0];

            var meta = JsonSerializer.Deserialize<WallpaperMeta>(wallpaperMetaJson, WallpaperApi.JsonOptitons);
            if (meta == null || meta.Id == null)
                return false;

            string coverFileName = $"{meta.Id}.cover{Path.GetExtension(coverUrl)}";
            string wpFileName = $"{meta.Id}{Path.GetExtension(wallpaperUrl)}";
            string metaFileName = $"{meta.Id}.meta.json";

            string destCoverPath = Path.Combine(saveDir, coverFileName);
            string destFilePath = Path.Combine(saveDir, wpFileName);
            string metaFilePath = Path.Combine(saveDir, metaFileName);

            //下载壁纸
            bool ok = await DownloadService.DownloadAsync(wallpaperUrl, destFilePath, meta.Id, meta.Title);
            if (!ok)
                return false;

            //下载封面，封面允许失败
            ok = await DownloadService.DownloadAsync(coverUrl, destCoverPath, meta.Id + ".cover", meta.Title + ".Cover", false);
            if (ok)
                meta.Cover = coverFileName;
            meta.CreateTime = DateTime.Now;

            //下载完成后，保存meta
            File.WriteAllText(metaFilePath, JsonSerializer.Serialize(meta, WallpaperApi.JsonOptitons));
            return true;
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message);
            return false;
        }
    }

    //取消下载
    public void CancelDownloadWallpaper(string id)
    {
        if (id == null)
            return;

        DownloadService.Cancel(id);
    }

    //获取下载状态
    public string GetDonwloadStatus()
    {
        var json = JsonSerializer.Serialize(DownloadService.Status, WallpaperApi.JsonOptitons);
        return json;
    }

    public string GetDownloadItemStatus(string id)
    {
        var item = DownloadService.Status.Items.FirstOrDefault(m => m.Id == id);
        var json = JsonSerializer.Serialize(item, WallpaperApi.JsonOptitons);
        return json;
    }

    public void ShowShell(string path)
    {
        AppService.ShowShell(path);
    }

    public async Task<bool> OpenStoreReview(string? defaultUrl)
    {
        try
        {
            if (UWPHelper.IsRunningAsUwp())
            {
                //旧方法，不推荐的方式.但是推荐的方式获取不到ID
                var pfn = Package.Current.Id.FamilyName;
                var uri = new Uri($"ms-windows-store://review/?PFN={pfn}");
                bool success = await Windows.System.Launcher.LaunchUriAsync(uri);
                return success;
            }
            else
            {
                if (defaultUrl != null)
                    OpenUrl(defaultUrl);
                return true;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine(ex);
            return false;
        }
    }

    public string GetRealThemeMode()
    {
        //读取配置，如果是system就根据系统判断
        var config = Configer.Get<ConfigAppearance>() ?? new();
        if (config.Mode == "system")
        {
            return ShellWindow.ShouldAppsUseDarkMode() ? "dark" : "light";
        }
        return config.Mode;
    }

    internal void TriggerRefreshPageEvent()
    {
        RefreshPageEvent?.Invoke(this, EventArgs.Empty);
    }

    internal void TriggerDownloadStatusChangedEvent()
    {
        DownloadStatusChangedEvent?.Invoke(this, EventArgs.Empty);
    }
}
