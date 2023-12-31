using Client.Libs;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using WallpaperCore;
using ConfigWallpaper = Client.Apps.Configs.Wallpaper;

namespace Client.Apps;

public class ConfigSetAfterEventArgs : EventArgs
{
    public string Key { get; set; } = string.Empty;
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
        //        InitProgressEvent?.Invoke(json);
        //    }
        //});
    }

    public void SetConfig(string key, string json)
    {
        key = $"Client.Apps.Configs.{key}";
        var obj = JsonConvert.DeserializeObject(json, WallpaperApi.JsonSettings);
        Configer.Set(key, obj, true);
        if (ConfigSetAfterEvent != null && obj != null)
        {
            ConfigSetAfterEvent(this, new ConfigSetAfterEventArgs
            {
                Key = key,
                Json = json
            });
        }
    }

    public string GetConfig(string key)
    {
        key = $"Client.Apps.Configs.{key}";
        var config = Configer.Get<object>(key) ?? "";
        var json = JsonConvert.SerializeObject(config, WallpaperApi.JsonSettings);
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
                json = JsonConvert.SerializeObject(e.Corrected, WallpaperApi.JsonSettings);
            }
        }

        return json;
    }

    public string GetWallpapers()
    {
        var config = Configer.Get<ConfigWallpaper>() ?? new();
        var res = WallpaperApi.GetWallpapers(config.Directories ?? ConfigWallpaper.DefaultWallpaperSaveFolder);
        foreach (var item in res)
        {
            //把本地路径转换为网址
            item.CoverUrl = AppService.ConvertPathToUrl(config, item.CoverPath);
            item.FileUrl = AppService.ConvertPathToUrl(config, item.FilePath);
        }
        return JsonConvert.SerializeObject(res, WallpaperApi.JsonSettings);
    }

    public string GetScreens()
    {
        var screens = WallpaperApi.GetScreens();
        return JsonConvert.SerializeObject(screens, WallpaperApi.JsonSettings);
    }

    public async Task<bool> ShowWallpaper(string playlistJson)
    {
        var playlist = JsonConvert.DeserializeObject<Playlist>(playlistJson, WallpaperApi.JsonSettings);
        if (playlist == null || playlist.Wallpapers.Count == 0)
            return false;

        var config = Configer.Get<ConfigWallpaper>() ?? new();
        //把playlist里面的url转换成本地路径
        foreach (var item in playlist.Wallpapers)
        {
            item.CoverUrl = AppService.ConvertUrlToPath(config, item.CoverPath);
            item.FileUrl = AppService.ConvertUrlToPath(config, item.FilePath);
        }

        var res = await WallpaperApi.ShowWallpaper(playlist);

        var status = WallpaperApi.GetSnapshot();
        //保存数据快照
        Configer.Set(status, true);

        return res;
    }

    public string GetPlayingPlaylist()
    {
        var res = WallpaperApi.RunningWallpapers.Values.Select(m => m.Playlist);

        var config = Configer.Get<ConfigWallpaper>() ?? new();
        //转换路径
        foreach (var item in res)
        {
            if (item == null)
                continue;
            foreach (var wallpaper in item.Wallpapers)
            {
                wallpaper.CoverUrl = AppService.ConvertPathToUrl(config, wallpaper.CoverPath);
                wallpaper.FileUrl = AppService.ConvertPathToUrl(config, wallpaper.FilePath);
            }
        }
        return JsonConvert.SerializeObject(res, WallpaperApi.JsonSettings);
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

    public void SetVolume(string volume, string screenIndexStr)
    {
        bool ok = int.TryParse(screenIndexStr, out int screenIndex);
        if (ok)
        {
            if (screenIndex < 1)
                WallpaperApi.SetVolume(int.Parse(volume));
            else
                WallpaperApi.SetVolume(int.Parse(volume), screenIndex);
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
        filename = Path.Combine(Path.GetTempPath(), filename);
        File.WriteAllBytes(filename, fileContent);
        return filename;
    }

    public bool CreateWallpaper(string title, string path)
    {
        var config = Configer.Get<ConfigWallpaper>() ?? new();
        if (config?.Directories == null || config.Directories.Length == 0)
            return false;

        return WallpaperApi.CreateWallpaper(title, path, config.Directories[0]);
    }

    //通过默认浏览器打开url
    public void OpenUrl(string url)
    {
        try
        {
            System.Diagnostics.Process.Start(url);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message);
        }
    }
}
