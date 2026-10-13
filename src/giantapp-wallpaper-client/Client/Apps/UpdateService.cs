using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Client.Apps.Configs;
using Client.Libs;
using NLog;
using WallpaperCore;

namespace Client.Apps;

/// <summary>
/// 应用更新：传统安装模式从更新服务器拉清单（stable/preview 通道），启动自动
/// 检查并下载，下载完成后由用户确认安装；微软商店版不走清单，检查即打开
/// 商店详情页。状态机经 GetUpdateState 暴露给前端轮询。
/// </summary>
internal static class UpdateService
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    //idle | checking | downloading | downloaded | upToDate | error
    private static string _state = "idle";
    private static string _error = string.Empty;
    private static string _version = string.Empty;
    private static string _notes = string.Empty;
    private static int _percent;
    private static string _installerPath = string.Empty;
    private static bool _busy;

    private class Manifest
    {
        public string Version { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public bool Prerelease { get; set; }
    }

    /// <summary>当前状态 JSON（前端轮询用）</summary>
    public static string State => JsonSerializer.Serialize(new
    {
        state = _state,
        error = _error,
        version = _version,
        notes = _notes,
        percent = _percent
    });

    public static bool IsStoreVersion() => UWPHelper.IsRunningAsUwp();

    /// <summary>手动检查；商店版打开商店详情页</summary>
    public static void CheckUpdate()
    {
        if (IsStoreVersion())
        {
            OpenStorePage();
            return;
        }
        Task.Run(RunCheckAsync);
    }

    /// <summary>启动延迟检查，错开启动高峰</summary>
    public static void StartupCheck()
    {
        Task.Run(async () =>
        {
            await Task.Delay(10_000);
            if (_state == "idle")
                await RunCheckAsync();
        });
    }

    /// <summary>
    /// 安装已下载的更新：固定程序 explorer.exe 启动安装向导（安装器路径仅作
    /// 参数），向导完成后经安装脚本 [Run] 自动启动新版，随后关闭当前应用
    /// </summary>
    public static void InstallUpdate()
    {
        try
        {
            if (_state != "downloaded" || !File.Exists(_installerPath))
                return;

            Process.Start("explorer.exe", $"\"{_installerPath}\"");
            System.Windows.Application.Current.Shutdown();
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "InstallUpdate");
            SetError("安装失败：" + ex.Message);
        }
    }

    private static async Task RunCheckAsync()
    {
        if (_busy || _state == "downloading" || _state == "downloaded")
            return;
        _busy = true;
        try
        {
            _state = "checking";
            _error = string.Empty;

            var config = Configer.Get<Update>() ?? new();
            config.Check();
            string channel = config.Channel == "preview" ? "preview" : "stable";
            string manifestUrl = $"{config.Url.TrimEnd('/')}/{channel}.json";

            if (!UrlGuard.IsSafeHttpUrl(manifestUrl))
            {
                SetError("更新地址不合法");
                return;
            }

            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            var json = await http.GetStringAsync(manifestUrl);
            var manifest = JsonSerializer.Deserialize<Manifest>(json, _jsonOptions);
            if (manifest == null || string.IsNullOrWhiteSpace(manifest.Version) || string.IsNullOrWhiteSpace(manifest.Url))
            {
                SetError("更新清单格式错误");
                return;
            }

            //正式版通道忽略预发布版本
            if (channel == "stable" && manifest.Prerelease)
            {
                _state = "upToDate";
                return;
            }

            if (CompareVersion(manifest.Version, CurrentVersion()) <= 0)
            {
                _state = "upToDate";
                return;
            }

            _version = manifest.Version;
            _notes = manifest.Notes;
            await DownloadAsync(http, manifest, manifestUrl);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "RunCheck");
            SetError("检查更新失败：" + ex.Message);
        }
        finally
        {
            _busy = false;
        }
    }

    private static async Task DownloadAsync(HttpClient http, Manifest manifest, string manifestUrl)
    {
        try
        {
            _state = "downloading";
            _percent = 0;

            //清单里的地址可为相对路径，以清单地址为 base
            var downloadUri = new Uri(new Uri(manifestUrl), manifest.Url);
            if (!UrlGuard.IsSafeHttpUrl(downloadUri.ToString()))
            {
                SetError("下载地址不合法");
                return;
            }

            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                AppService.ProductName, "update");
            Directory.CreateDirectory(dir);
            string fileName = string.Join("_", downloadUri.AbsolutePath.Split('/').Where(s => s.Length > 0).Reverse().Take(2).Reverse());
            string finalPath = Path.Combine(dir, fileName);
            string tmpPath = finalPath + ".downloading";

            using var resp = await http.GetAsync(downloadUri, System.Net.Http.HttpCompletionOption.ResponseHeadersRead);
            resp.EnsureSuccessStatusCode();
            long total = resp.Content.Headers.ContentLength ?? -1;
            using var src = await resp.Content.ReadAsStreamAsync();
            using var dst = File.Create(tmpPath);
            var buffer = new byte[81920];
            long received = 0;
            int read;
            while ((read = await src.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                await dst.WriteAsync(buffer, 0, read);
                received += read;
                if (total > 0)
                    _percent = (int)(received * 100 / total);
            }

            if (File.Exists(finalPath))
                File.Delete(finalPath);
            File.Move(tmpPath, finalPath);
            _installerPath = finalPath;
            _state = "downloaded";
            _logger.Info("update downloaded: {0}", finalPath);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Download");
            SetError("下载失败：" + ex.Message);
        }
    }

    private static void SetError(string message)
    {
        _state = "error";
        _error = message;
    }

    private static string CurrentVersion()
    {
        return Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0";
    }

    /// <summary>宽松版本比较：>0 表示 a 比 b 新；数字段相同时，无预发布号 > 有预发布号</summary>
    internal static int CompareVersion(string a, string b)
    {
        var (numA, preA) = ParseVersion(a);
        var (numB, preB) = ParseVersion(b);
        for (int i = 0; i < numA.Length; i++)
        {
            int c = numA[i].CompareTo(numB[i]);
            if (c != 0)
                return c;
        }
        if (preA == null && preB != null) return 1;
        if (preA != null && preB == null) return -1;
        return string.CompareOrdinal(preA, preB);
    }

    private static (long[] Num, string? Pre) ParseVersion(string version)
    {
        var parts = version.Trim().TrimStart('v', 'V').Split('-');
        var nums = parts[0].Split('.').Select(s => long.TryParse(s, out var n) ? n : 0).ToList();
        while (nums.Count < 3)
            nums.Add(0);
        return (nums.Take(3).ToArray(), parts.Length > 1 ? parts[1] : null);
    }

    private static void OpenStorePage()
    {
        try
        {
            if (UWPHelper.IsRunningAsUwp())
            {
                var pfn = Windows.ApplicationModel.Package.Current.Id.FamilyName;
                _ = Windows.System.Launcher.LaunchUriAsync(new Uri($"ms-windows-store://pdp/?PFN={pfn}"));
            }
            else
            {
                var url = "https://apps.microsoft.com/detail/9MWTG433JV6B";
                if (UrlGuard.IsSafeHttpUrl(url))
                    Process.Start("explorer.exe", $"\"{url}\"");
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "OpenStorePage");
        }
    }
}
