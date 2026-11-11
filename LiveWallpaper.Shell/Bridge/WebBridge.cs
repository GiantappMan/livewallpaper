using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Api;
using LiveWallpaper.LocalServer.Models;
using Microsoft.Web.WebView2.Core;
using NLog;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Windows;

namespace LiveWallpaper.Shell.Bridge
{
    /// <summary>
    /// WebView2 WebMessage 桥（发布形态无本地端口）：
    /// 页面 → 宿主：chrome.webview.postMessage(JSON 字符串) {"__lw":1,"id":N,"method":"X","args":[...]}
    /// 宿主 → 页面：RPC 回包 {"__lw":1,"id":N,"ok":true,"result":...} / {"__lw":1,"id":N,"ok":false,"error":"..."}
    /// 事件推送：{"__lw":1,"event":"DownloadWallpaperProgressChanged","payload":{...}}
    /// </summary>
    public class WebBridge
    {
        public const string Magic = "__lw";
        public const int Version = 1;
        /// <summary>注入到页面的桥接能力标记（前端据此选择桥接或端口模式）</summary>
        public const string BridgeFlagJs = "__LW_BRIDGE__";

        /// <summary>与 SignalR JSON 协议一致的序列化选项（camelCase，属性名大小写不敏感反序列化）</summary>
        public static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        readonly LiveWallpaperApiService _api;
        readonly TransferFileService _fileService;
        CoreWebView2? _coreWebView2;
        string? _wwwrootDir;
        Logger _logger = LogManager.GetCurrentClassLogger();

        public WebBridge(LiveWallpaperApiService api, TransferFileService fileService)
        {
            _api = api;
            _fileService = fileService;
        }

        /// <summary>
        /// 把 CoreWebView2 接入桥：注册 RPC 分发、事件广播与 UI 静态资源、api/upload、assets/image 原生拦截。
        /// 在 EnsureCoreWebView2Async 之后调用。
        /// </summary>
        public void Attach(CoreWebView2 coreWebView2, string wwwrootDir)
        {
            _coreWebView2 = coreWebView2;
            _wwwrootDir = wwwrootDir;
            _logger = LogManager.GetCurrentClassLogger();

            //能力握手标记：注入到所有页面（含社区站页面）且先于页面脚本执行。
            //前端只有见到该标记才走桥接；老客户端没有注入逻辑，页面自动回落端口模式（SignalR + localhost:5001）
            coreWebView2.AddScriptToExecuteOnDocumentCreatedAsync($"window.{BridgeFlagJs} = true;");

            //UI 静态资源改用 WebResourceRequested 原生应答（与资源主机同一机制）。
            //不再用 SetVirtualHostNameToFolderMapping：系统代理开启的机器上该映射不拦截请求，
            //假域名请求走代理/DNS 后必然失败 → 主界面 ERR_ACCESS_DENIED 白屏（升级用户必现）。
            //WebResourceRequested 在网络层之前拦截，不受代理/DNS 影响（已实验验证）。
            coreWebView2.AddWebResourceRequestedFilter($"{App.GetUiBase()}*", CoreWebView2WebResourceContext.All);

            //大文件上传不走 postMessage（体积限制），fetch 到资源主机由原生拦截处理；
            //封面缩略图沿用 assets/image?localpath= 契约；default-fallback-image.webp 占位图也从这里应答
            coreWebView2.AddWebResourceRequestedFilter($"{App.GetResourceBase()}*", CoreWebView2WebResourceContext.All);
            coreWebView2.WebResourceRequested += OnWebResourceRequested;

            coreWebView2.WebMessageReceived += OnWebMessageReceived;

            WebMessageEventPublisher.Instance.Attach(coreWebView2);

            //崩溃恢复等场景下页面可能先于注入注册就加载了（此时页面拿不到标记），重载一次让标记生效
            if (!string.IsNullOrEmpty(coreWebView2.Source) && coreWebView2.Source != "about:blank")
                coreWebView2.Reload();

            _logger.Info($"WebBridge attached, filters: {App.GetUiBase()}*, {App.GetResourceBase()}*");
        }

        public void Detach(CoreWebView2 coreWebView2)
        {
            coreWebView2.WebResourceRequested -= OnWebResourceRequested;
            coreWebView2.WebMessageReceived -= OnWebMessageReceived;
            WebMessageEventPublisher.Instance.Detach(coreWebView2);
        }

        #region rpc

        async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            //页面统一 postMessage 字符串，方便约定契约
            string json;
            try
            {
                json = e.TryGetWebMessageAsString();
            }
            catch
            {
                //消息不是字符串（如直接 postMessage 对象）则忽略
                return;
            }
            if (string.IsNullOrEmpty(json))
                return;

            BridgeRequest? request = null;
            try
            {
                request = JsonSerializer.Deserialize<BridgeRequest>(json, JsonOptions);
            }
            catch (JsonException)
            {
                return;
            }

            if (request == null || request.Id == null || string.IsNullOrEmpty(request.Method))
                return;

            string reply;
            try
            {
                object? result = await DispatchAsync(request);
                reply = JsonSerializer.Serialize(new BridgeReply { Id = request.Id.Value, Ok = true, Result = result }, JsonOptions);
            }
            catch (Exception ex)
            {
                //与 SignalR 语义一致：方法抛异常表现为调用方 promise reject
                reply = JsonSerializer.Serialize(new BridgeReply { Id = request.Id.Value, Ok = false, Error = ex.Message }, JsonOptions);
            }

            if (sender is CoreWebView2 coreWebView2)
                coreWebView2.PostWebMessageAsJson(reply);
        }

        async Task<object?> DispatchAsync(BridgeRequest request)
        {
            var args = request.Args ?? Array.Empty<JsonElement>();
            T Arg<T>(int index) => ArgOrDefault<T>(args, index)!;

            switch (request.Method)
            {
                case "GetClientVersion":
                    return _api.GetClientVersion();
                case "GetWallpapers":
                    return await _api.GetWallpapers();
                case "GetWallpaper":
                    return await _api.GetWallpaper(Arg<string>(0));
                case "GetThumbnails":
                    return await _api.GetThumbnails(Arg<string>(0));
                case "ShowWallpaper":
                    return await _api.ShowWallpaper(Arg<string>(0), Arg<string>(1));
                case "GetRunningWallpapers":
                    return _api.GetRunningWallpapers();
                case "CloseWallpaper":
                    return await _api.CloseWallpaper(Arg<string[]>(0));
                case "ExploreFile":
                    return await _api.ExploreFile(Arg<string>(0));
                case "SetupFFmpeg":
                    return _api.SetupFFmpeg(Arg<string>(0));
                case "StopSetupFFmpeg":
                    return await _api.StopSetupFFmpeg();
                case "StopSetupPlayer":
                    return await _api.StopSetupPlayer();
                case "GetUserSetting":
                    return await _api.GetUserSetting();
                case "SetUserSetting":
                    return await _api.SetUserSetting(Arg<UserSetting>(0));
                case "GetRunningData":
                    return await _api.GetRunningData();
                case "GetDraftDir":
                    return await _api.GetDraftDir();
                case "UpdateProjectInfo":
                    return await _api.UpdateProjectInfo(Arg<string>(0), Arg<WallpaperProjectInfo?>(1));
                case "UpdateWallpaperOption":
                    return await _api.UpdateWallpaperOption(Arg<string>(0), Arg<WallpaperOption>(1));
                case "GetWallpaperOption":
                    return await _api.GetWallpaperOption(Arg<string>(0));
                case "DeleteWallpaper":
                    return await _api.DeleteWallpaper(Arg<string>(0));
                case "DeleteFiles":
                    return await _api.DeleteFiles(Arg<List<string>>(0));
                case "MoveFile":
                    return await _api.MoveFile(Arg<string>(0), Arg<string>(1), Arg<bool>(2));
                case "OpenStoreReview":
                    return await _api.OpenStoreReview();
                case "IsUwp":
                    return await _api.IsUwp();
                case "StopDownloadWallpaper":
                    return await _api.StopDownloadWallpaper(Arg<string>(0));
                case "DownloadWallpaper":
                    return await _api.DownloadWallpaper(Arg<string>(0), Arg<string>(1), Arg<WallpaperProjectInfo?>(2));
                case "DownloadWallpaperToGroup":
                    return await _api.DownloadWallpaperToGroup(Arg<string>(0), Arg<string>(1), Arg<WallpaperProjectInfo?>(2), Arg<string?>(3));
                case "GetDownloadRecords":
                    return await _api.GetDownloadRecords();
                case "ClearDownloadRecords":
                    return await _api.ClearDownloadRecords();
                case "AddDownloadRecords":
                    return await _api.AddDownloadRecords(Arg<List<DownloadRecord>>(0));
                default:
                    throw new NotSupportedException($"unknown bridge method:{request.Method}");
            }
        }

        static T? ArgOrDefault<T>(JsonElement[] args, int index)
        {
            if (index >= args.Length || args[index].ValueKind == JsonValueKind.Null)
                return default;
            return args[index].Deserialize<T>(JsonOptions);
        }

        #endregion

        #region web resource (upload / image)

        async void OnWebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            //异步处理期间挂起网络请求
            var deferral = e.GetDeferral();
            try
            {
                var uri = new Uri(e.Request.Uri);
                if (uri.Host.Equals(App.UiHost, StringComparison.OrdinalIgnoreCase))
                {
                    //UI 主机：wwwroot 静态资源原生应答（导航与子资源全走这里）
                    e.Response = HandleUiStaticFile(uri);
                }
                else if (uri.AbsolutePath.StartsWith("/api/upload", StringComparison.OrdinalIgnoreCase))
                {
                    e.Response = await HandleUploadAsync(uri, e.Request.Method, e.Request.Content);
                }
                else if (uri.AbsolutePath.StartsWith("/assets/image", StringComparison.OrdinalIgnoreCase))
                {
                    e.Response = await HandleImageAsync(uri);
                }
                else if (uri.AbsolutePath.Equals("/default-fallback-image.webp", StringComparison.OrdinalIgnoreCase))
                {
                    //占位图（img onerror 兜底）也走拦截应答，避免假主机 DNS 失败导致卡片纯白
                    e.Response = await HandleStaticFileAsync(uri, "default-fallback-image.webp", "image/webp");
                }
            }
            catch
            {
                //任何异常按 404 处理，避免请求悬挂
                e.Response = CreateTextResponse(404, "Not Found");
            }
            finally
            {
                deferral.Complete();
            }
        }

        //UI 主机静态资源应答：wwwroot 文件映射 + SPA 回退（目录 index.html → 200.html）
        static readonly System.Collections.Generic.Dictionary<string, string> UiMimeMap = new(StringComparer.OrdinalIgnoreCase)
        {
            [".html"] = "text/html; charset=utf-8", [".js"] = "application/javascript",
            [".css"] = "text/css", [".json"] = "application/json", [".webmanifest"] = "application/manifest+json",
            [".png"] = "image/png", [".webp"] = "image/webp", [".jpg"] = "image/jpeg", [".svg"] = "image/svg+xml",
            [".ico"] = "image/x-icon", [".woff2"] = "font/woff2", [".woff"] = "font/woff", [".ttf"] = "font/ttf",
        };

        CoreWebView2WebResourceResponse? HandleUiStaticFile(Uri uri)
        {
            if (string.IsNullOrEmpty(_wwwrootDir))
                return CreateTextResponse(404, "Not Found");

            //路径映射 + 边界校验：resolve 后必须仍在 wwwroot 内，防路径穿越
            var rel = uri.AbsolutePath == "/" ? "index.html" : uri.AbsolutePath.TrimStart('/');
            var file = Path.GetFullPath(Path.Combine(_wwwrootDir, rel.Replace('/', Path.DirectorySeparatorChar)));
            if (!file.StartsWith(Path.GetFullPath(_wwwrootDir), StringComparison.OrdinalIgnoreCase))
                return CreateTextResponse(403, "Forbidden");

            if (Directory.Exists(file) || !File.Exists(file))
            {
                var candidate = Path.Combine(file, "index.html");
                if (File.Exists(candidate))
                    file = candidate;
                else
                    file = Path.Combine(_wwwrootDir, "200.html");
            }

            var ext = Path.GetExtension(file).ToLowerInvariant();
            var contentType = UiMimeMap.TryGetValue(ext, out var mime) ? mime : "application/octet-stream";
            var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read);
            return CreateResponse(stream, 200, "OK", $"Content-Type: {contentType}");
        }

        async Task<CoreWebView2WebResourceResponse?> HandleStaticFileAsync(Uri uri, string fileName, string contentType)
        {
            string appDir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
            string file = Path.Combine(appDir, "wwwroot", fileName);
            if (!File.Exists(file))
                return CreateTextResponse(404, "Not Found");

            var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read);
            return CreateResponse(stream, 200, "OK", $"Content-Type: {contentType}");
        }

        async Task<CoreWebView2WebResourceResponse?> HandleUploadAsync(Uri uri, string method, Stream? content)
        {
            //dev 模式页面在 localhost:3001 上，跨源 fetch 会先发预检
            if (method == "OPTIONS")
                return CreateTextResponse(204, "No Content", WithCors("Content-Type: application/json"));

            string? distDir = GetQueryValue(uri, "distDir");
            string? fileName = GetQueryValue(uri, "fileName");

            var r = await _fileService.SaveUploadFileAsync(content, fileName, distDir);
            return CreateJsonResponse(r);
        }

        async Task<CoreWebView2WebResourceResponse?> HandleImageAsync(Uri uri)
        {
            //与原 HTTP 接口兼容：localpath/localPath 均可
            string? localPath = GetQueryValue(uri, "localpath") ?? GetQueryValue(uri, "localPath");
            var result = await _fileService.GetImageAsync(localPath);
            if (result == null)
                return CreateTextResponse(404, "Not Found");

            return CreateResponse(result.Content, 200, "OK", WithCors($"Content-Type: {result.ContentType}"));
        }

        CoreWebView2WebResourceResponse CreateJsonResponse(object value)
        {
            byte[] json = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
            return CreateResponse(new MemoryStream(json), 200, "OK", WithCors("Content-Type: application/json"));
        }

        CoreWebView2WebResourceResponse CreateTextResponse(int statusCode, string reason, string? headers = null)
        {
            return CreateResponse(Stream.Null, statusCode, reason, headers);
        }

        //允许 dev 前端（localhost:3001 等）跨源访问虚拟域名资源
        static string WithCors(string headers)
        {
            return $"{headers}\r\nAccess-Control-Allow-Origin: *";
        }

        CoreWebView2WebResourceResponse CreateResponse(Stream content, int statusCode, string reason, string? headers)
        {
            var coreWebView2 = _coreWebView2 ?? WebMessageEventPublisher.Instance.AttachedWebViews.FirstOrDefault();
            if (coreWebView2 == null)
                throw new InvalidOperationException("no attached webview");

            return coreWebView2.Environment.CreateWebResourceResponse(content, statusCode, reason, headers);
        }

        static string? GetQueryValue(Uri uri, string key)
        {
            string query = uri.Query;
            if (string.IsNullOrEmpty(query) || query == "?")
                return null;

            //不引 ASP.NET 组件，手动解析查询串（键大小写不敏感，值 URL 解码）
            foreach (var pair in query.TrimStart('?').Split('&'))
            {
                int eq = pair.IndexOf('=');
                string k = eq < 0 ? pair : pair[..eq];
                if (string.Equals(Uri.UnescapeDataString(k), key, StringComparison.OrdinalIgnoreCase))
                {
                    string v = eq < 0 ? "" : pair[(eq + 1)..];
                    string v2 = Uri.UnescapeDataString(v).Replace('+', ' ');
                    return string.IsNullOrEmpty(v2) ? null : v2;
                }
            }
            return null;
        }

        #endregion

        #region contract

        class BridgeRequest
        {
            [JsonPropertyName(WebBridge.Magic)]
            public int VersionFlag { get; set; }

            [JsonPropertyName("id")]
            public int? Id { get; set; }

            [JsonPropertyName("method")]
            public string? Method { get; set; }

            [JsonPropertyName("args")]
            public JsonElement[]? Args { get; set; }
        }

        class BridgeReply
        {
            [JsonPropertyName(WebBridge.Magic)]
            public int VersionFlag { get; set; } = WebBridge.Version;

            [JsonPropertyName("id")]
            public int Id { get; set; }

            [JsonPropertyName("ok")]
            public bool Ok { get; set; }

            [JsonPropertyName("result")]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
            public object? Result { get; set; }

            [JsonPropertyName("error")]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
            public string? Error { get; set; }
        }

        #endregion
    }

    /// <summary>
    /// 事件广播：把下载/FFmpeg/播放器进度事件推给所有接入桥的 WebView2 页面
    /// </summary>
    public class WebMessageEventPublisher : IEventPublisher
    {
        static readonly Logger _logger = LogManager.GetCurrentClassLogger();

        public static WebMessageEventPublisher Instance { get; } = new();

        readonly List<CoreWebView2> _webViews = new();

        internal IReadOnlyList<CoreWebView2> AttachedWebViews => _webViews;

        internal void Attach(CoreWebView2 coreWebView2)
        {
            lock (_webViews)
            {
                if (!_webViews.Contains(coreWebView2))
                    _webViews.Add(coreWebView2);
            }
        }

        internal void Detach(CoreWebView2 coreWebView2)
        {
            lock (_webViews)
            {
                _webViews.Remove(coreWebView2);
            }
        }

        public async Task PublishAsync(string eventName, object payload)
        {
            List<CoreWebView2> targets;
            lock (_webViews)
            {
                targets = _webViews.ToList();
            }

            if (targets.Count == 0)
            {
                _logger.Debug($"PublishAsync {eventName}: no attached webview, skipped");
                return;
            }

            string json = JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                [WebBridge.Magic] = WebBridge.Version,
                ["event"] = eventName,
                ["payload"] = payload,
            }, WebBridge.JsonOptions);

            //下载进度等事件来自后台线程，而 WebView2 API 只能在创建它的 UI 线程调用
            var dispatcher = Application.Current?.Dispatcher;
            if (dispatcher == null)
                return;

            await dispatcher.InvokeAsync(() =>
            {
                foreach (var webView in targets)
                {
                    try
                    {
                        webView.PostWebMessageAsJson(json);
                    }
                    catch (Exception ex)
                    {
                        _logger.Debug($"PublishAsync post failed: {ex.Message}");
                    }
                }
            });
        }
    }
}
