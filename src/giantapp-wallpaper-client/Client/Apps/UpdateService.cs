using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Client.Apps.Configs;
using Client.Libs;
using NLog;
using WallpaperCore;

namespace Client.Apps;

/// <summary>
/// 应用更新：传统安装模式从更新服务器拉清单（stable/preview 通道），启动自动
/// 检查并下载，下载完成后由用户确认安装，下载中可取消；切渠道视为重装目标
/// 渠道当前版本，跳过版本比较。微软商店版不走清单，检查即打开商店详情页。
/// 状态机经 GetUpdateState 暴露给前端轮询。
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
    private static string _downloadedChannel = string.Empty;
    private static CancellationTokenSource? _downloadCts;
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

    /// <summary>手动检查更新（安装版拉清单）；reinstall 为 true 时跳过版本比较强制重装；商店版走 CheckStoreUpdateAsync</summary>
    public static void CheckUpdate(bool reinstall = false) => Task.Run(() => RunCheckAsync(reinstall));

    /// <summary>商店版手动检查：打开商店详情页，返回是否成功发起打开</summary>
    public static async Task<bool> CheckStoreUpdateAsync()
    {
        try
        {
            if (UWPHelper.IsRunningAsUwp())
            {
                var pfn = Windows.ApplicationModel.Package.Current.Id.FamilyName;
                return await Windows.System.Launcher.LaunchUriAsync(new Uri($"ms-windows-store://pdp/?PFN={pfn}"));
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "CheckStoreUpdate");
        }
        //商店协议打开失败或开发调试环境：退回网页版商店详情页
        return OpenWebStorePage();
    }

    private static bool OpenWebStorePage()
    {
        try
        {
            var url = "https://apps.microsoft.com/detail/9MWTG433JV6B";
            if (!UrlGuard.IsSafeHttpUrl(url))
                return false;
            Process.Start("explorer.exe", $"\"{url}\"");
            return true;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "OpenWebStorePage");
            return false;
        }
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
    /// 安装已下载的更新：记录安装包来源渠道（切渠道重装后不再重复提示），
    /// 固定程序 explorer.exe 启动安装向导（安装器路径仅作参数），向导完成后
    /// 经安装脚本 [Run] 自动启动新版，随后关闭当前应用
    /// </summary>
    public static void InstallUpdate()
    {
        try
        {
            if (_state != "downloaded" || !File.Exists(_installerPath))
                return;

            if (!string.IsNullOrEmpty(_downloadedChannel))
            {
                var config = Configer.Get<Update>() ?? new();
                if (config.InstalledChannel != _downloadedChannel)
                {
                    config.InstalledChannel = _downloadedChannel;
                    Configer.Set(config, out _, true);
                }
            }

            Process.Start("explorer.exe", $"\"{_installerPath}\"");
            System.Windows.Application.Current.Shutdown();
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "InstallUpdate");
            SetError("安装失败：" + ex.Message);
        }
    }

    private static async Task RunCheckAsync(bool reinstall = false)
    {
        //商店版永不走安装包清单（含启动自动检查）
        if (IsStoreVersion())
            return;
        if (_busy || _state == "downloading")
            return;
        _busy = true;
        try
        {
            var config = Configer.Get<Update>() ?? new();
            config.Check();
            string channel = GetChannel(config);

            //已有待安装的安装包：同渠道不重复下载；渠道不同（切了渠道）则作废重拉
            if (_state == "downloaded")
            {
                if (_downloadedChannel == channel)
                    return;
                _installerPath = string.Empty;
                _state = "idle";
            }

            _state = "checking";
            _error = string.Empty;
            string manifestUrl = BuildManifestUrl(config, channel);

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

            //正式版通道忽略预发布版本（切渠道重装也不例外）
            if (channel == "stable" && manifest.Prerelease)
            {
                _state = "upToDate";
                return;
            }

            //切渠道 = 重装目标渠道当前版本，跳过版本比较；仅由前端检查按钮显式
            //触发（reinstall=true），启动自动检查不重装
            if (!reinstall && CompareVersion(manifest.Version, CurrentVersion()) <= 0)
            {
                _state = "upToDate";
                return;
            }

            _version = manifest.Version;
            _notes = manifest.Notes;
            _downloadedChannel = channel;
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

    /// <summary>只读查询指定通道清单的最新版本号（不触发下载），供切通道后展示；
    /// 商店版、正式通道的预发布版本或查询失败返回空串。通道由前端显式传入，
    /// 避免切通道后配置尚未落盘读到旧值</summary>
    public static async Task<string> GetChannelLatestVersionAsync(string? channelName)
    {
        try
        {
            if (IsStoreVersion())
                return string.Empty;
            string channel = channelName == "preview" ? "preview" : "stable";
            var config = Configer.Get<Update>() ?? new();
            config.Check();
            string manifestUrl = BuildManifestUrl(config, channel);
            if (!UrlGuard.IsSafeHttpUrl(manifestUrl))
                return string.Empty;
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            var json = await http.GetStringAsync(manifestUrl);
            var manifest = JsonSerializer.Deserialize<Manifest>(json, _jsonOptions);
            if (manifest == null || string.IsNullOrWhiteSpace(manifest.Version))
                return string.Empty;
            //正式通道忽略预发布版本，与 RunCheckAsync 的判定一致
            if (channel == "stable" && manifest.Prerelease)
                return string.Empty;
            return manifest.Version;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "GetChannelLatestVersion");
            return string.Empty;
        }
    }

    private static string GetChannel(Update config) => config.Channel == "preview" ? "preview" : "stable";

    private static string BuildManifestUrl(Update config, string channel)
    {
        return $"{config.Url.TrimEnd('/')}/{channel}.json";
    }

    /// <summary>取消进行中的更新下载：中止请求并清理临时文件，状态经轮询回到空闲</summary>
    public static void CancelDownload()
    {
        if (_state != "downloading")
            return;
        _downloadCts?.Cancel();
    }

    private static async Task DownloadAsync(HttpClient http, Manifest manifest, string manifestUrl)
    {
        string tmpPath = string.Empty;
        try
        {
            _state = "downloading";
            _percent = 0;
            _downloadCts = new CancellationTokenSource();
            CancellationToken token = _downloadCts.Token;

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
            tmpPath = finalPath + ".downloading";

            using var resp = await http.GetAsync(downloadUri, System.Net.Http.HttpCompletionOption.ResponseHeadersRead, token);
            resp.EnsureSuccessStatusCode();
            long total = resp.Content.Headers.ContentLength ?? -1;
            using var src = await resp.Content.ReadAsStreamAsync();
            using var dst = File.Create(tmpPath);
            var buffer = new byte[81920];
            long received = 0;
            int read;
            while ((read = await src.ReadAsync(buffer, 0, buffer.Length, token)) > 0)
            {
                await dst.WriteAsync(buffer, 0, read, token);
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
        catch (OperationCanceledException)
        {
            //用户取消：清理临时文件回到空闲态，不算错误
            TryDelete(tmpPath);
            _installerPath = string.Empty;
            _percent = 0;
            _state = "idle";
            _logger.Info("update download canceled");
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Download");
            SetError("下载失败：" + ex.Message);
        }
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (!string.IsNullOrEmpty(path) && File.Exists(path))
                File.Delete(path);
        }
        catch (Exception ex)
        {
            _logger.Warn(ex, "TryDelete {0}", path);
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
}
