using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using NLog;
using WallpaperCore;

namespace Client.Libs;

// 配置读写
public static class Configer
{
    public static string? Folder { get; private set; }
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private static readonly ConcurrentDictionary<string, object> _cache = new();

    private static readonly object _fileLock = new(); // 文件锁

    internal static void Init(string productName)
    {
        Folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), productName);

        if (!Directory.Exists(Folder))
        {
            Directory.CreateDirectory(Folder);
        }
    }

    // 手动保存
    public static void Save()
    {
        lock (_fileLock) // 使用文件锁
        {
            foreach (var kvp in _cache)
            {
                string key = kvp.Key;
                object config = kvp.Value;
                string filePath = Path.Combine(Folder, key + ".json");
                string json = JsonConvert.SerializeObject(config, WallpaperApi.JsonSettings);
                File.WriteAllText(filePath, json);
            }
        }
    }

    // 保存任意配置，key用nameof生成，缓存到内存中，保存时全部写入文件
    public static void Set<T>(T config, out object? oldConfig, bool save = false)
    {
        oldConfig = null;
        if (config == null)
            return;
        string key = typeof(T).FullName;
        Set(key, config, out oldConfig, save);
    }

    public static void Set(string key, object? config, out object? oldConfig, bool save = false)
    {
        oldConfig = null;
        lock (_cache) // 使用锁保护对_cache的访问
        {
            if (config == null)
                _cache.TryRemove(key, out _);
            else
            {
                _cache.TryGetValue(key, out oldConfig);
                _cache[key] = config;
            }
        }
        if (save)
            Save();
    }

    // 获取配置，如果不存在则返回默认值
    public static T? Get<T>()
    {
        string key = typeof(T).FullName;
        var res = Get<T>(key);
        return res;
    }

    public static T? Get<T>(string key)
    {
        try
        {
            lock (_cache)
            {
                if (_cache.TryGetValue(key, out object config))
                {
                    if (config is JObject)
                        return JsonConvert.DeserializeObject<T>(config.ToString());
                    return (T)config;
                }
            }

            // 如果缓存中不存在配置，则尝试从文件中读取
            string filePath = Path.Combine(Folder, key + ".json");
            if (File.Exists(filePath))
            {

                string json = File.ReadAllText(filePath);
                var config = JsonConvert.DeserializeObject<T>(json, WallpaperApi.JsonSettings);
                if (config != null)
                {
                    // 将从文件中读取的配置存储到缓存中
                    _cache[key] = config;
                    return config;
                }
            }

            return default;
        }
        catch (Exception ex)
        {
            _logger.Error(ex);
            return default;
        }
    }

    public static Task<T?> GetAsync<T>()
    {
        return Task.Run(() => Get<T>());
    }

}
