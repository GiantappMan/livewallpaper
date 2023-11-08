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
}

public class PlaylistMeta : WallpaperMeta
{

}

/// <summary>
/// playlist的设置
/// </summary>
public class PlaylistSetting
{

}

//一个壁纸的设置
public class WallpaperSetting
{
    /// <summary>
    /// 是否支持鼠标事件，exe和web才行。其他类型设置无效
    /// </summary>
    public bool EnableMouseEvent { get; set; } = true;

    #region video

    /// <summary>
    /// 是否启用硬件解码，video才行。其他类型无效
    /// </summary>
    public bool HardwareDecoding { get; set; } = true;

    /// <summary>
    /// 是否铺满
    /// </summary>
    public bool IsPanScan { get; set; } = true;

    /// <summary>
    /// 音量0-100
    /// </summary>
    public int Volume { get; set; }

    #endregion
}

/// <summary>
/// 表示一个壁纸
/// </summary>
public class Wallpaper
{
    public Wallpaper(string filePath)
    {
        LocalAbsolutePath = filePath;
        Dir = Path.GetDirectoryName(filePath) ?? string.Empty;
        FileName = Path.GetFileName(filePath);
    }

    //描述数据
    public WallpaperMeta? Meta { get; set; }

    //设置
    public WallpaperSetting? Setting { get; set; }

    //壁纸所在目录
    public string? Dir { get; private set; }

    //文件名
    public string? FileName { get; private set; }

    //本地绝对路径
    public string? LocalAbsolutePath { get; set; }

    public void LoadMeta()
    {
        try
        {
            // 同目录包含[文件名].meta.json 的
            string fileName = Path.GetFileNameWithoutExtension(FileName);
            string metaJsonFile = Path.Combine(Dir, $"{fileName}.meta.json");
            if (File.Exists(metaJsonFile))
            {
                var metaJson = JsonConvert.DeserializeObject<WallpaperMeta>(File.ReadAllText(metaJsonFile));
                Meta = metaJson;
            }
            else
            {
                Meta = new()
                {
                    Title = FileName
                };
            }
        }
        catch (Exception ex)
        {
            WallpaperApi.Logger?.Warn($"加载壁纸描述数据失败：{LocalAbsolutePath} ${ex}");
        }
    }

    public void LoadSetting()
    {
        try
        {
            // 同目录包含[文件名].setting.json 的
            string fileName = Path.GetFileNameWithoutExtension(FileName);
            string settingJsonFile = Path.Combine(Dir, $"{fileName}.setting.json");
            if (File.Exists(settingJsonFile))
            {
                var settingJson = JsonConvert.DeserializeObject<WallpaperSetting>(File.ReadAllText(settingJsonFile));
                Setting = settingJson;
            }
        }
        catch (Exception ex)
        {
            WallpaperApi.Logger?.Warn($"加载壁纸设置失败：{LocalAbsolutePath} ${ex}");
        }
    }

    public static Wallpaper? From(string filePath, bool loadMeta = true, bool loadSetting = true)
    {
        var data = new Wallpaper(filePath);

        string projectJsonFile = Path.Combine(data.Dir, "project.json");
        if (File.Exists(projectJsonFile))
        {
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
                    Cover = projectJson.Preview
                };
                data.Meta = meta;
                //不修改内容，同时支持旧版
                return data;
            }
        }

        if (loadMeta)
            data.LoadMeta();

        if (loadSetting)
            data.LoadSetting();
        return data;
    }
}

/// <summary>
/// 播放列表
/// </summary>
public class Playlist
{
    //描述数据
    public PlaylistMeta? Meta { get; set; }

    //设置
    public PlaylistSetting? Setting { get; set; }

    //播放列表内的壁纸
    public Wallpaper[] Wallpapers { get; set; } = new Wallpaper[0];
}

