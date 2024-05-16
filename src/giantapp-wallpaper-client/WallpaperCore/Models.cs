using System.Reflection;
using System.Text.Json;
using WallpaperCore.Libs;

namespace WallpaperCore;

public class ModelUtils
{
    public static object? CloneObject(object obj)
    {
        if (obj == null)
            return null;

        //用json序列化clone，反射有时候要崩
        return JsonSerializer.Deserialize(JsonSerializer.Serialize(obj), obj.GetType());

        //Type type = obj.GetType();
        //object clone = Activator.CreateInstance(type);

        //foreach (PropertyInfo prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        //{
        //    if (prop.CanWrite)
        //    {
        //        object propValue = prop.GetValue(obj, null);
        //        if (propValue != null && propValue.GetType().IsClass && !typeof(Delegate).IsAssignableFrom(propValue.GetType()))
        //        {
        //            prop.SetValue(clone, CloneObject(propValue), null);
        //        }
        //        else
        //        {
        //            prop.SetValue(clone, propValue, null);
        //        }
        //    }
        //}

        //return clone;
    }
}

/// <summary>
/// 2.x用的
/// </summary>
public class V2GroupProjectInfo
{
    public V2GroupProjectInfo()
    {

    }
    public V2GroupProjectInfo(V2ProjectInfo? info)
    {
        ID = info?.ID;
        LocalID = info?.LocalID;
    }

    public string? ID { get; set; }
    public string? LocalID { get; set; }
}

/// <summary>
/// 2.x用的
/// </summary>
public class V2ProjectInfo
{
    public List<V2GroupProjectInfo>? GroupItems { get; set; }
    public string? ID { get; set; }
    public string? LocalID { get; set; }
    public string? Description { get; set; }
    public string? Title { get; set; }
    public string? File { get; set; }
    public string? Preview { get; set; }
    /// <summary>
    /// group，分组
    /// null，壁纸
    /// </summary>
    public string? Type { get; set; }
    public string? Visibility { get; set; }
    public List<string>? Tags { get; set; }
}

/// <summary>
/// 壁纸的描述数据
/// </summary>
public class WallpaperMeta : ICloneable
{
    public string? Id { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Cover { get; set; }
    public string? Author { get; set; }
    public string? AuthorID { get; set; }
    public DateTime? CreateTime { get; set; }
    public DateTime? UpdateTime { get; set; }
    public WallpaperType Type { get; set; }

    //当前播放索引
    public uint PlayIndex { get; set; } = 0;
    //播放列表内的壁纸
    public List<Wallpaper> Wallpapers { get; set; } = new();
    //真正的播放列表，如果是随机播放，会和默认不一样
    public List<Wallpaper> RealPlaylist { get; set; } = new();

    //确保有Id
    public void EnsureId(string? filePath = null)
    {
        if (filePath != null)
        {
            string dir = Path.GetDirectoryName(filePath) ?? string.Empty;
            string fileName = Path.GetFileNameWithoutExtension(filePath);
            string id = dir.Split(Path.DirectorySeparatorChar).Last();
            //dir is not guid
            if (!Guid.TryParse(id, out _))
            {
                //fileName is guid
                if (Guid.TryParse(fileName, out _))
                {
                    id = fileName;
                }
            }
            Id = id;
        }

        if (string.IsNullOrEmpty(Id))
        {
            Id = Guid.NewGuid().ToString();
        }
    }

    public object Clone()
    {
        var res = MemberwiseClone() as WallpaperMeta;
        //res!.Wallpapers = new();
        //foreach (var item in new List<Wallpaper>(Wallpapers))
        //{
        //    res!.Wallpapers.Add((Wallpaper)item.Clone());
        //}
        return res!;
    }

    public bool IsPlaylist()
    {
        return Type == WallpaperType.Playlist;
    }
}

public enum PlaylistType
{
    //普通播放列表
    Playlist,
    //分组
    Group
}

public enum PlayMode
{
    //顺序播放
    Order,
    //随机播放
    Random,
    //定时切换
    Timer
}

public class WallpaperRunningInfo : ICloneable
{
    public uint[] ScreenIndexes { get; set; } = new uint[0];//播放的屏幕
    public bool IsPaused { get; set; }

    public object Clone()
    {
        return MemberwiseClone();
    }
}

public enum VideoPlayer
{
    Default_Player,//全局配置
    MPV_Player,
    System_Player
}

//一个壁纸的设置
public class WallpaperSetting : ICloneable
{
    /// <summary>
    /// 播放时长，没设就用默认值，图片默认一小时
    /// 除了playlist，都显示这个值
    /// </summary>
    public string? Duration { get; set; }

    #region exe
    /// <summary>
    /// 是否支持鼠标事件，exe和web才行。其他类型设置无效
    /// </summary>
    public bool EnableMouseEvent { get; set; } = false;
    #endregion

    #region video

    /// <summary>
    /// 是否启用硬件解码，video才行。其他类型无效
    /// </summary>
    public bool HardwareDecoding { get; set; } = true;

    /// <summary>
    /// 是否铺满
    /// </summary>
    public bool IsPanScan { get; set; } = true;

    ///// <summary>
    ///// 音量0-100
    ///// </summary>
    //public int Volume { get; set; } = 0;

    //播放器类型，覆盖默认配置
    public VideoPlayer VideoPlayer { get; set; } = VideoPlayer.Default_Player;

    ////界面不做展示，仅当VideoPlayer为默认时，读取数据并保存
    //public VideoPlayer DefaultVideoPlayer { get; set; } = VideoPlayer.MPV_Player;

    #endregion

    #region web

    #endregion

    #region img

    public DesktopWallpaperPosition Fit { get; set; } = DesktopWallpaperPosition.DWPOS_FILL;

    //退出程序后，保留壁纸
    public bool KeepWallpaper { get; set; } = true;

    #endregion

    #region playlist
    public PlayMode PlayMode { get; set; } = PlayMode.Order;
    #endregion

    public static WallpaperSetting From(Dictionary<string, object> dic)
    {
        //根据反射，自动把字典转换为对象
        var setting = new WallpaperSetting();
        var type = setting.GetType();
        foreach (var item in dic)
        {
            var property = type.GetProperty(item.Key);
            if (property != null)
            {
                var value = item.Value;
                property.SetValue(setting, value);
            }
        }
        return setting;
    }

    public object Clone()
    {
        return ModelUtils.CloneObject(this)!;
    }
}

public enum WallpaperType
{
    NotSupported,
    Img,
    AnimatedImg,
    Video,
    Web,
    Exe,
    Playlist,
}

/// <summary>
/// 表示一个壁纸
/// </summary>
public class Wallpaper : ICloneable
{
    public static readonly string[] ImgExtension = new[] { ".jpg", ".jpeg", ".bmp", ".png", ".jfif", ".avif" };
    public static readonly string[] VideoExtension = new[] { ".mp4", ".flv", ".blv", ".avi", ".mov", ".webm", ".mkv" };
    public static readonly string[] WebExtension = new[] { ".html", ".htm" };
    public static readonly string[] ExeExtension = new[] { ".exe" };
    public static readonly string[] AnimatedImgExtension = new[] { ".gif", ".webp" };
    public static readonly string[] PlaylistExtension = new[] { ".playlist" };
    //当前随机播放数据，播放完后重新生成
    public Queue<uint> RandomPlaylist { get; private set; } = new();

    public Wallpaper(string? filePath)
    {
        FilePath = filePath;
        Dir = Path.GetDirectoryName(filePath) ?? string.Empty;
        FileName = Path.GetFileName(filePath);
    }
    //描述壁纸是干嘛的
    public WallpaperMeta Meta { get; set; } = new();

    //设置
    public WallpaperSetting Setting { get; set; } = new();

    //运行数据
    public WallpaperRunningInfo RunningInfo { get; set; } = new();

    //壁纸所在目录
    public string? Dir { get; private set; }

    //文件名
    public string? FileName { get; private set; }

    //壁纸路径
    private string? filePath;
    public string? FilePath
    {
        get => filePath;
        set
        {
            filePath = value;
        }
    }

    //封面路径
    public string? CoverPath { get; set; }

    //前端用
    public string? FileUrl { get; set; }

    //前端用
    public string? CoverUrl { get; set; }

    public void LoadMeta()
    {
        try
        {
            // 同目录包含[文件名].meta.json 的
            string fileName = Path.GetFileNameWithoutExtension(FileName);
            string metaJsonFile = Path.Combine(Dir, $"{fileName}.meta.json");
            if (File.Exists(metaJsonFile))
            {
                var meta = JsonSerializer.Deserialize<WallpaperMeta>(File.ReadAllText(metaJsonFile), WallpaperApi.JsonOptitons);
                Meta = meta ?? new();
                if (meta?.Cover != null)
                    CoverPath = Path.Combine(Dir, meta.Cover);
            }
            else
            {
                Meta.Title = FileName;
            }

            //设置type
            string extension = Path.GetExtension(FileName);
            if (Meta.Type != WallpaperType.NotSupported)
                //手动设置过的
                return;
            Meta.Type = ResolveType(extension);
        }
        catch (Exception ex)
        {
            WallpaperApi.Logger?.Warn($"加载壁纸描述数据失败：{FilePath} ${ex}");
        }
    }

    public void LoadSetting()
    {
        Setting = LoadSetting(FileName, Dir);
    }

    public static WallpaperSetting LoadSetting(string? FileName, string? Dir)
    {
        try
        {
            // 同目录包含[文件名].setting.json 的
            string fileName = Path.GetFileNameWithoutExtension(FileName);
            string settingJsonFile = Path.Combine(Dir, $"{fileName}.setting.json");
            if (File.Exists(settingJsonFile))
            {
                var setting = JsonSerializer.Deserialize<WallpaperSetting>(File.ReadAllText(settingJsonFile), WallpaperApi.JsonOptitons);
                var Setting = setting ?? new();
                return Setting;
            }
        }
        catch (Exception ex)
        {
            WallpaperApi.Logger?.Warn($"加载壁纸设置失败：{Dir} {FileName} ${ex}");
        }
        return new();
    }

    public static Wallpaper? From(string filePath, bool loadSetting = true)
    {
        if (filePath.Contains(".cover"))
            return null;

        var data = new Wallpaper(filePath);

        var oldData = LoadOldData(data, loadSetting, out bool existProjectFile);
        if (existProjectFile)
            data = oldData;
        else
        {
            data.LoadMeta();
            if (loadSetting)
                data.Setting = LoadSetting(data.FileName, data.Dir);
        }

        if (data != null && data.Meta.CreateTime == null)
        {
            var fileInfo = new FileInfo(filePath);
            data.Meta.CreateTime = fileInfo.CreationTime;
        }

        data?.Meta.EnsureId(data?.FilePath);

        if (data?.Meta.Type == WallpaperType.NotSupported)
            return null;

        return data;
    }

    public static Wallpaper? LoadOldData(Wallpaper data, bool loadSetting, out bool existProjectFile)
    {
        string projectJsonFile = Path.Combine(data.Dir, "project.json");
        if (File.Exists(projectJsonFile))
        {
            existProjectFile = true;
            //包含 project.json
            //迁移数据到meta.json
            //这里不用加option
            var projectJson = JsonSerializer.Deserialize<V2ProjectInfo>(File.ReadAllText(projectJsonFile));
            if (projectJson != null)
            {
                if (projectJson.File != data.FileName)
                {
                    //不是壁纸文件，可能是封面之类的
                    return null;
                }

                string extension = Path.GetExtension(projectJson.File);
                var meta = new WallpaperMeta
                {
                    Title = projectJson.Title,
                    Description = projectJson.Description,
                    Cover = projectJson.Preview,
                    Type = ResolveType(extension),
                };

                if (extension == ".group"/*v2的旧格式*/)
                {
                    meta.Type = WallpaperType.Playlist;
                    if (projectJson.GroupItems != null)
                        foreach (var item in projectJson.GroupItems)
                        {
                            if (item.LocalID == null)
                                continue;
                            var tmp = WallpaperApi.GetWallpapers(item.LocalID);
                            if (tmp == null || tmp.Length < 1)
                                continue;
                            var wallpaper = tmp[0];
                            meta.Wallpapers.Add(wallpaper);
                        }
                }
                data.Meta = meta;

                if (meta?.Cover != null)
                {
                    data.CoverPath = Path.Combine(data.Dir, meta.Cover);
                }

                if (loadSetting)
                {
                    data.Setting = LoadSetting(data.FileName, data.Dir);
                }
                //不修改内容，同时支持旧版
                return data;
            }
        }
        existProjectFile = false;
        return null;
    }

    public static WallpaperType ResolveType(string extension)
    {
        extension = extension.ToLower();
        if (ImgExtension.Contains(extension))
        {
            return WallpaperType.Img;
        }
        else if (VideoExtension.Contains(extension))
        {
            return WallpaperType.Video;
        }
        else if (WebExtension.Contains(extension))
        {
            return WallpaperType.Web;
        }
        else if (ExeExtension.Contains(extension))
        {
            return WallpaperType.Exe;
        }
        else if (AnimatedImgExtension.Contains(extension))
        {
            return WallpaperType.AnimatedImg;
        }
        else if (PlaylistExtension.Contains(extension))
        {
            return WallpaperType.Playlist;
        }
        return WallpaperType.NotSupported;
    }

    public static bool IsSupportedFile(string fileExtension)
    {
        var lowerCaseExtension = fileExtension.ToLower();
        return ImgExtension.Contains(lowerCaseExtension) ||
               VideoExtension.Contains(lowerCaseExtension) ||
               ExeExtension.Contains(lowerCaseExtension) ||
               WebExtension.Contains(lowerCaseExtension) ||
               AnimatedImgExtension.Contains(lowerCaseExtension) ||
               PlaylistExtension.Contains(lowerCaseExtension);
    }

    public object Clone()
    {
        //deep clone
        var res = new Wallpaper(FilePath)
        {
            Meta = (WallpaperMeta)Meta.Clone(),
            Setting = (WallpaperSetting)Setting.Clone(),
            RunningInfo = (WallpaperRunningInfo)RunningInfo.Clone(),
            CoverPath = CoverPath,
            FileUrl = FileUrl,
            CoverUrl = CoverUrl
        };
        return res;
    }

    internal void GenerateRealPlaylist()
    {
        if (Meta.Type != WallpaperType.Playlist)
            return;

        switch (Setting.PlayMode)
        {
            case PlayMode.Order:
                Meta.RealPlaylist = new(Meta.Wallpapers);
                break;
            case PlayMode.Random:
                var shuffled = ShuffleList(Meta.Wallpapers);
                while (Enumerable.SequenceEqual(Meta.Wallpapers, shuffled))
                {
                    shuffled = ShuffleList(Meta.Wallpapers);
                }
                Meta.RealPlaylist = shuffled;
                break;
        }
    }

    static List<T> ShuffleList<T>(List<T> inputList)
    {
        Random rng = new();
        List<T> list = new(inputList);
        int n = list.Count;
        while (n > 1)
        {
            n--;
            int k = rng.Next(n + 1);
            (list[n], list[k]) = (list[k], list[n]);
        }
        return list;
    }

    internal void IncrementPlayIndex()
    {
        if (Meta.Type != WallpaperType.Playlist)
            return;

        Meta.PlayIndex += 1;
        if (Meta.PlayIndex >= Meta.RealPlaylist.Count)
        {
            Meta.PlayIndex = 0;
        }
    }

    internal void DecrementPlayIndex()
    {
        if (Meta.Type != WallpaperType.Playlist)
            return;

        if (Meta.PlayIndex == 0)
            Meta.PlayIndex = (uint)(Meta.RealPlaylist.Count - 1);
        else
            Meta.PlayIndex -= 1;
    }
}

/// <summary>
/// 壁纸API快照信息
/// </summary>
public class WallpaperApiSnapshot
{
    public List<(Wallpaper Wallpaper, WallpaperManagerSnapshot SnapshotData)>? Data { get; set; }
    public ApiSettings ApiSettings { get; set; } = new();
}

//壁纸被遮挡时的行为
public enum WallpaperCoveredBehavior
{
    //不做任何处理
    None,
    //暂停播放
    Pause,
    //停止播放
    Stop
}

//WallpaperApi全局设置
public class ApiSettings : ICloneable
{
    //小于0就是禁用
    public int AudioSourceIndex { get; set; }
    public uint Volume { get; set; }
    public WallpaperCoveredBehavior CoveredBehavior { get; set; } = WallpaperCoveredBehavior.Pause;

    public object Clone()
    {
        return MemberwiseClone();
    }
}


