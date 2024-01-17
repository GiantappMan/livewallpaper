using Newtonsoft.Json;

namespace WallpaperCore;

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
public class WallpaperMeta
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Cover { get; set; }
    public string? Author { get; set; }
    public string? AuthorID { get; set; }
    public DateTime? CreateTime { get; set; }
    public DateTime? UpdateTime { get; set; }
    public WallpaperType Type { get; set; }
}

public enum PlaylistType
{
    //普通播放列表
    Playlist,
    //分组
    Group
}

public class PlaylistMeta : WallpaperMeta
{
    public new PlaylistType Type { get; set; }
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
/// <summary>
/// playlist的设置
/// </summary>
public class PlaylistSetting : ICloneable
{
    public PlayMode Mode { get; set; } = PlayMode.Order;
    public uint PlayIndex { get; set; } = 0;
    public uint[] ScreenIndexes { get; set; } = new uint[0];//播放的屏幕
    public bool IsPaused { get; set; }
    //public int Volume { get; set; }

    public object Clone()
    {
        return MemberwiseClone();
    }
}

//一个壁纸的设置
public class WallpaperSetting : ICloneable
{
    /// <summary>
    /// 是否支持鼠标事件，exe和web才行。其他类型设置无效
    /// </summary>
    public bool EnableMouseEvent { get; set; } = false;

    #region video

    /// <summary>
    /// 是否启用硬件解码，video才行。其他类型无效
    /// </summary>
    public bool HardwareDecoding { get; set; } = true;

    /// <summary>
    /// 是否铺满
    /// </summary>
    public bool IsPanScan { get; set; } = false;

    /// <summary>
    /// 音量0-100
    /// </summary>
    public int Volume { get; set; } = 0;

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
        return MemberwiseClone();
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
}

/// <summary>
/// 表示一个壁纸
/// </summary>
public class Wallpaper
{
    public static readonly string[] ImgExtension = new[] { ".jpg", ".jpeg", ".bmp", ".png", ".jfif" };
    public static readonly string[] VideoExtension = new[] { ".mp4", ".flv", ".blv", ".avi", ".mov", ".webm", ".mkv" };
    public static readonly string[] WebExtension = new[] { ".html", ".htm" };
    public static readonly string[] ExeExtension = new[] { ".exe" };
    public static readonly string[] AnimatedImgExtension = new[] { ".gif", ".webp" };

    public Wallpaper(string filePath)
    {
        FilePath = filePath;
        Dir = Path.GetDirectoryName(filePath) ?? string.Empty;
        FileName = Path.GetFileName(filePath);
    }

    //描述数据
    public WallpaperMeta Meta { get; set; } = new();

    //设置
    public WallpaperSetting Setting { get; set; } = new();

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
                var meta = JsonConvert.DeserializeObject<WallpaperMeta>(File.ReadAllText(metaJsonFile));
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
            Meta.Type = ResolveType(extension);
        }
        catch (Exception ex)
        {
            WallpaperApi.Logger?.Warn($"加载壁纸描述数据失败：{FilePath} ${ex}");
        }
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
                var setting = JsonConvert.DeserializeObject<WallpaperSetting>(File.ReadAllText(settingJsonFile));
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
            var projectJson = JsonConvert.DeserializeObject<V2ProjectInfo>(File.ReadAllText(projectJsonFile));
            if (projectJson != null)
            {
                if (projectJson.File != data.FileName)
                {
                    //不是壁纸文件，可能是封面之类的
                    return null;
                }
                var meta = new WallpaperMeta
                {
                    Title = projectJson.Title,
                    Description = projectJson.Description,
                    Cover = projectJson.Preview,
                    Type = ResolveType(Path.GetExtension(projectJson.File))
                };

                data.Meta = meta;
                if (meta?.Cover != null)
                    data.CoverPath = Path.Combine(data.Dir, meta.Cover);

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
        return WallpaperType.NotSupported;
    }

    public static bool IsSupportedFile(string fileExtension)
    {
        var lowerCaseExtension = fileExtension.ToLower();
        return ImgExtension.Contains(lowerCaseExtension) ||
               VideoExtension.Contains(lowerCaseExtension) ||
               ExeExtension.Contains(lowerCaseExtension) ||
               WebExtension.Contains(lowerCaseExtension) ||
               AnimatedImgExtension.Contains(lowerCaseExtension);
    }
}

/// <summary>
/// 播放列表
/// </summary>
public class Playlist : ICloneable
{
    public Playlist()
    {

    }
    public string? Id { get; set; }
    //描述数据
    public PlaylistMeta Meta { get; set; } = new();

    //设置
    public PlaylistSetting Setting { get; set; } = new();

    //播放列表内的壁纸
    public List<Wallpaper> Wallpapers { get; set; } = new();

    public object Clone()
    {
        var res = new Playlist
        {
            Id = Id,
            Meta = Meta,
            Setting = (PlaylistSetting)Setting.Clone(),
            Wallpapers = new List<Wallpaper>()
        };
        foreach (var item in Wallpapers)
        {
            res.Wallpapers.Add(item);
        }
        return res;
    }

    public void EnsureId()
    {
        if (string.IsNullOrEmpty(Id))
            Id = Guid.NewGuid().ToString();
    }
}

/// <summary>
/// 壁纸API快照信息
/// </summary>
public class WallpaperApiSnapshot
{
    public List<(Playlist Playlist, WallpaperManagerSnapshot SnapshotData)>? Data { get; set; }
}