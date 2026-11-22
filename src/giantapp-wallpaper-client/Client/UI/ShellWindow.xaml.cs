using Client.Libs;
using Client.UI;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using MultiLanguageForXAML;
using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;

namespace GiantappWallpaper;

public class ShellConfig
{
    public double Width { get; set; }
    public double Height { get; set; }
    public WindowState WindowState { get; set; } = WindowState.Normal;

    public static bool Compare(ShellConfig? a, ShellConfig? b)
    {
        if (a == null && b == null)
            return true;
        if (a == null || b == null)
            return false;
        return a.Width == b.Width && a.Height == b.Height && a.WindowState == b.WindowState;
    }
}

public enum Mode
{
    Light,
    Dark,
    System
}

public partial class ShellWindow : Window
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private ShellConfig? _cacheShellConfig;
    private readonly string? _configKey;

    //工具条图标字形（Segoe Fluent Icons / MDL2）
    private const string CopyGlyph = "\uE8C8";
    private const string CheckGlyph = "\uE73E";
    //从右向左书写的界面语言（侧栏在右侧，社区返回键需镜像到右上角）
    private static readonly HashSet<string> RtlLanguages = new() { "ar", "he" };
    private readonly DispatcherTimer _copyFeedbackTimer;
    //最大化状态下 WebView2 视口重同步的防抖定时器（见 ShellWindow_SizeChanged）
    private DispatcherTimer? _webviewResyncDelay;
    //社区 iframe 在 webview 坐标系里的 [left, top, right, bottom]；null=未知（工具条退回窗口角定位）。
    internal double[]? HubIframeRect { get; private set; }
    //站点「回到顶部」按钮的 webview 坐标 [left, top, right, bottom]（含站点自身滚动条让位），
    //悬浮工具条以它为锚才能像素级对齐；null=未知
    internal double[]? HubBtnRect { get; private set; }
    //社区右下角浏览器快捷工具条（独立小窗口，见 CommunityNavWindow）：后退/前进/刷新，
    //只在社区页显示且只在社区内部生效，绝不退回/前进到社区之外的客户端页面。
    //内部历史以社区 iframe 的 location.href 序列建模；后退/前进前实时读 href 确认目标条目，
    //操作落位期间按钮强制禁用（iframe 的 history 遍历并非严格帧内作用，帧历史耗尽时会弹
    //joint 历史把壳也退掉，实测如此，必须靠门控避免）
    private CommunityNavWindow? _communityNav;
    private bool _hubActive;
    private bool _hubNavInFlight;
    private CoreWebView2Frame? _hubFrame;
    private readonly List<string> _hubUrls = new();
    private int _hubUrlIndex;

    #region properties
    public static ShellWindow? Instance { get; private set; }
    public static object? ClientApi { get; set; }
    public static bool IsDarkMode { get; private set; }//没有System
    public static Mode Mode { get; private set; }//有System
    public static string Theme { get; private set; } = string.Empty;
    public static bool AllowDragFile { get; set; } = false;

    public static Dictionary<string, string> CustomFolderMapping { get; private set; } = new();
    public static Dictionary<string, string> RewriteMapping { get; internal set; } = new();

    //自动追加.html的域名
    public static string[] AutoAppendHtmlDomains { get; set; } = new string[0];

    /// <summary>
    /// 允许iframe 调用api对象
    /// </summary>
    public static string[] Origins { get; set; } = new string[0];

    //按Esc关闭窗口
    public bool CloseByEsc { get; set; } = false;

    #endregion

    public ShellWindow(bool showAddress, string? configKey = null)
    {
        //允许视频自动播放 https://stackoverflow.com/questions/68709227/how-to-enable-media-autoplay-in-microsoft-webview2
        //允许 拖动 https://github.com/MicrosoftEdge/WebView2Feedback/issues/2243
        Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--autoplay-policy=no-user-gesture-required --enable-features=msWebView2EnableDraggableRegions");

        _configKey = configKey;
        InitializeComponent();
        addressPanel.Visibility = showAddress ? Visibility.Visible : Visibility.Collapsed;
        BtnCopyAddress.ToolTip = LanService.Get("copy");
        _copyFeedbackTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1.5) };
        _copyFeedbackTimer.Tick += (s, e) =>
        {
            _copyFeedbackTimer.Stop();
            BtnCopyAddress.Content = CopyGlyph;
        };
        SizeChanged += ShellWindow_SizeChanged;
        //窗口移动/缩放时让悬浮返回键跟着走
        LocationChanged += (_, _) => _communityNav?.UpdatePlacement();
        webview2.DefaultBackgroundColor = Color.Transparent;
        webview2.CoreWebView2InitializationCompleted += Webview2_CoreWebView2InitializationCompleted;

        _cacheShellConfig = Configer.Get<ShellConfig>(configKey);
        const float defaultWidth = 1024;
        const float defaultHeight = 680;
        if (_cacheShellConfig != null)
        {
            if (_cacheShellConfig.Width <= 800 || _cacheShellConfig.Height <= 482)
            {
                Width = defaultWidth;
                Height = defaultHeight;
            }
            else
            {
                Width = _cacheShellConfig.Width;
                Height = _cacheShellConfig.Height;
            }
            WindowState = _cacheShellConfig.WindowState;
        }
        else
        {
            Width = defaultWidth;
            Height = defaultHeight;
        }
        StateChanged += ShellWindow_StateChanged;
        //WindowState 可能在订阅前被恢复成最大化，同步一次按钮状态
        UpdateWindowButtonsState();
    }

    #region public
    public static bool ShouldAppsUseDarkMode()
    {
        try
        {
            RegistryKey key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            if (key != null)
            {
                int appsUseLightTheme = (int)key.GetValue("AppsUseLightTheme", -1);
                if (appsUseLightTheme == 0)
                {
                    // 当前使用暗色主题
                    return true;
                }
                else if (appsUseLightTheme == 1)
                {
                    // 当前使用亮色主题
                    return false;
                }
                else
                {
                    // 无法确定当前主题
                }
                key.Close();
            }
        }
        catch (Exception ex)
        {
            _logger.Info(ex);
        }
        return true;
    }

    public static void SetTheme(string theme, Mode mode)
    {
        Mode = mode;
        Theme = theme;

        //首字母大写
        theme = theme.First().ToString().ToUpper() + theme[1..];
        SystemEvents.UserPreferenceChanged -= SystemEvents_UserPreferenceChanged;
        if (Mode == Mode.System)
        {
            var tmp = ShouldAppsUseDarkMode();
            //转换system的实际值
            mode = tmp ? Mode.Dark : Mode.Light;
            //监控系统主题变化
            SystemEvents.UserPreferenceChanged += SystemEvents_UserPreferenceChanged;
        }

        IsDarkMode = mode == Mode.Dark;

        ResourceDictionary appResources = Application.Current.Resources;
        var old = appResources.MergedDictionaries.FirstOrDefault(x => x.Source?.ToString().Contains("/LiveWallpaper3;component/UI/Themes") == true);
        if (old != null)
            appResources.MergedDictionaries.Remove(old);

        ResourceDictionary themeDict = new()
        {
            Source = new Uri($"/LiveWallpaper3;component/UI/Themes/{mode}/{theme}.xaml", UriKind.RelativeOrAbsolute)
        };
        appResources.MergedDictionaries.Add(themeDict);
    }

    public static async void ShowShell(string? url)
    {
        Instance ??= new ShellWindow(false);
        await Instance.ShowUrl(url);
    }

    public async Task ShowUrl(string? url)
    {
        _logger.Info($"ShowShell {url}");

        bool ok = await Task.Run(CheckWebView2);
        if (!ok)
        {
            //没装webview2
            loading.Visibility = Visibility.Collapsed;
            tips.Visibility = Visibility.Visible;

            LoopCheckWebView2(url);
        }
        else
        {
            loading.Visibility = Visibility.Visible;
        }

        if (WindowState == WindowState.Minimized)
            WindowState = WindowState.Normal;

        Activate();

        //前端没有system，根据后端统一样式
        var realModel = Mode.ToString().ToLower();
        if (Mode == Mode.System)
            realModel = IsDarkMode ? "dark" : "light";
        //判断url是否包含query
        if (url != null && !url.Contains("mode="))
        {
            if (url.Contains("?"))
                url += $"&mode={realModel}";
            else
                url += $"?mode={realModel}";
        }

        webview2.Source = new Uri(url);
        webview2.NavigationCompleted += NavigationCompleted;

        Show();
    }

    public static void ApplyCustomFolderMapping(Dictionary<string, string> mapping, Microsoft.Web.WebView2.Wpf.WebView2? webview2 = null)
    {
        //清理老映射
        foreach (var item in CustomFolderMapping)
        {
            webview2?.CoreWebView2?.ClearVirtualHostNameToFolderMapping(item.Key);
        }

        CustomFolderMapping = mapping;

        webview2 ??= Instance?.webview2;
        if (webview2 == null)
            return;

        foreach (var item in mapping)
        {
            bool isAbsoluteFilePath = Path.IsPathRooted(item.Value);
            bool isUWP = UWPHelper.IsRunningAsUwp();
            //必须判断，商店版无法创建相对路径
            if ((!isUWP || isAbsoluteFilePath) && !Directory.Exists(item.Value))
                Directory.CreateDirectory(item.Value);
            webview2?.CoreWebView2?.SetVirtualHostNameToFolderMapping(item.Key, item.Value, CoreWebView2HostResourceAccessKind.Allow);
        }
    }

    #endregion

    #region private
    //每秒检查1次，直到成功或者窗口关闭
    private static void LoopCheckWebView2(string? url)
    {
        Task.Run(async () =>
        {
            while (true)
            {
                await Task.Delay(1000);
                if (Instance == null)
                {
                    break;
                }
                bool ok = await Task.Run(CheckWebView2);
                if (ok)
                {
                    Instance.Dispatcher.Invoke(() =>
                    {
                        ShowShell(url);
                    });
                    break;
                }
            }
        });
    }

    static bool CheckWebView2()
    {
        try
        {
            string version = CoreWebView2Environment.GetAvailableBrowserVersionString(null, new CoreWebView2EnvironmentOptions());
            return true;
        }
        catch (WebView2RuntimeNotFoundException e)
        {
            Debug.WriteLine(e);
        }
        return false;
    }

    //禁用拖放文件打开新窗口
    private async void DisableDragFile()
    {
        if (webview2.CoreWebView2 != null)
        {
            // DragEnter 事件处理程序
            await webview2.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
   "window.addEventListener('dragover',function(e){e.preventDefault();},false);" +
   "window.addEventListener('drop',function(e){" +
      "e.preventDefault();" +
   //"console.log(e.dataTransfer);" +
   //"console.log(e.dataTransfer.files[0])" +
   "}, false);");
        }
    }

    private void ShellWindow_StateChanged(object sender, EventArgs e)
    {
        UpdateWindowButtonsState();
        _communityNav?.UpdatePlacement();

        //修改webview2，document.shell_hidden 属性
        string value = WindowState == WindowState.Minimized ? "true" : "false";
        webview2.CoreWebView2?.ExecuteScriptAsync($"document.shell_hidden = {value}");

        if (WindowState != WindowState.Minimized)
        {
            //WebView2(WPF)+WindowChrome 已知问题：最大化/还原（含任务栏自动隐藏改变工作区高度）后，
            //浏览器视口可能停留在旧尺寸，页面底部锚定的元素（社区站「回到顶部」按钮等）会沉到
            //窗口外只剩半个（偏移量恰为 CaptionHeight=48）。等布局落定后微调高度再还原，
            //借尺寸变更事件强制控制器按最终窗口尺寸重设 bounds（与正常拖拽缩放同路径）。
            Dispatcher.BeginInvoke(System.Windows.Threading.DispatcherPriority.Loaded,
                new Action(() => ResyncCommunityNavAfterLayoutAsync()));
            SaveShellConfig();
        }
    }

    //webview 高度微调 1px 再恢复 Grid 自适应高度，触发两次布局让 WebView2 重新套用 bounds；
    //顺带让 CommunityNavWindow 按落定后的尺寸重新定位
    private void FixWebView2StaleBounds()
    {
        if (!webview2.IsLoaded || webview2.ActualHeight <= 1)
            return;
        double h = webview2.ActualHeight;
        webview2.Height = h - 1;
        webview2.UpdateLayout();
        webview2.ClearValue(System.Windows.FrameworkElement.HeightProperty);
        webview2.UpdateLayout();
        _ = LogViewportDiagnosticsAsync("resync");
    }

    //临时诊断：对账 WPF 尺寸与页面视口高度、社区站「回到顶部」按钮实际坐标/透明度，
    //用于定位 WebView2 内容偏移问题，问题关闭后移除
    private async System.Threading.Tasks.Task LogViewportDiagnosticsAsync(string tag)
    {
        try
        {
            var core = webview2.CoreWebView2;
            if (core == null || !_hubActive)
                return;
            string top = await core.ExecuteScriptAsync(
                "JSON.stringify({iw:innerWidth,ih:innerHeight,dch:document.documentElement.clientHeight,vvH:visualViewport&&visualViewport.height,vvY:visualViewport&&visualViewport.offsetTop,scrollY:scrollY})");
            string frame = "null";
            if (_hubFrame != null && _hubFrame.IsDestroyed() == 0)
                frame = await _hubFrame.ExecuteScriptAsync(
                    "JSON.stringify({ih:innerHeight,dch:document.documentElement.clientHeight,scrollY:scrollY,btn:(function(){var el=document.querySelector(\"[aria-label='回到顶部']\");if(!el)return null;var r=el.getBoundingClientRect();var cs=getComputedStyle(el);return {x:Math.round(r.x),y:Math.round(r.y),w:r.width,h:r.height,op:cs.opacity}})()})");
            _logger.Info($"[VPDiag:{tag}] wpf={webview2.ActualWidth:0.#}x{webview2.ActualHeight:0.#} state={WindowState} hubRect={(HubIframeRect == null ? "null" : string.Join(",", HubIframeRect))} btnRect={(HubBtnRect == null ? "null" : string.Join(",", HubBtnRect))} top={top} frame={frame}");
        }
        catch (Exception ex)
        {
            _logger.Info($"[VPDiag:{tag}] failed: {ex.Message}");
        }
    }

    //地址栏弹窗（加载外部网页）的窗口按钮：最大化/还原互斥显示
    private void UpdateWindowButtonsState()
    {
        bool maximized = WindowState == WindowState.Maximized;
        BtnMaximize.Visibility = maximized ? Visibility.Collapsed : Visibility.Visible;
        BtnRestore.Visibility = maximized ? Visibility.Visible : Visibility.Collapsed;
    }

    #endregion

    #region callback

    private static void SystemEvents_UserPreferenceChanged(object sender, UserPreferenceChangedEventArgs e)
    {
        if (e.Category == UserPreferenceCategory.General)
        {
            Debouncer.Shared.Delay(() =>
            {
                SetTheme(Theme, Mode);
            }, 1000);
        }
    }
    private void ShellWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        //最大化状态下任务栏自动隐藏/弹出会改变工作区高度，窗口跟着变尺寸但不触发 StateChanged，
        //WebView2 视口可能停留在旧尺寸（页面底部锚定元素沉到窗口外）。防抖后强制重同步一次。
        if (WindowState == WindowState.Maximized)
        {
            if (_webviewResyncDelay == null)
                _webviewResyncDelay = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(200) };
            _webviewResyncDelay.Tick -= WebviewResync_Tick;
            _webviewResyncDelay.Tick += WebviewResync_Tick;
            _webviewResyncDelay.Stop();
            _webviewResyncDelay.Start();
            return;
        }
        SaveShellConfig();
    }

    private void WebviewResync_Tick(object? sender, EventArgs e)
    {
        _webviewResyncDelay?.Stop();
        ResyncCommunityNavAfterLayoutAsync();
    }

    //记录窗口大小
    private void SaveShellConfig()
    {
        ShellConfig config = new()
        {
            Width = Width,
            Height = Height,
            WindowState = WindowState
        };

        if (!ShellConfig.Compare(_cacheShellConfig, config))
        {
            Debouncer.Shared.Delay(() =>
            {
                if (_configKey != null)
                    Configer.Set(_configKey, config, out _);
                else
                    Configer.Set(config, out _);
            }, 300);
            _cacheShellConfig = config;
        }
    }

    private static void NavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (Instance != null)
        {
            Instance.webview2.NavigationCompleted -= NavigationCompleted;
        }
    }

    private void DownloadHyperlink_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            string dir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
            var setupPath = Path.Combine(dir, "Assets/MicrosoftEdgeWebview2Setup.exe");
            //固定程序 explorer.exe，随包安装器路径仅作参数
            Process.Start("explorer.exe", $"\"{setupPath}\"");
        }
        catch (Exception ex)
        {
            Debug.WriteLine(ex);
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        SizeChanged -= ShellWindow_SizeChanged;
        StateChanged -= ShellWindow_StateChanged;
        webview2.CoreWebView2InitializationCompleted -= Webview2_CoreWebView2InitializationCompleted;
        SystemEvents.UserPreferenceChanged -= SystemEvents_UserPreferenceChanged;

        if (webview2.CoreWebView2 != null)
        {
            webview2.CoreWebView2.NavigationStarting -= CoreWebView2_NavigationStarting;
            webview2.CoreWebView2.SourceChanged -= CoreWebView2_SourceChanged;
            webview2.CoreWebView2.HistoryChanged -= CoreWebView2_HistoryChanged;
            webview2.CoreWebView2.NewWindowRequested -= CoreWebView2_NewWindowRequested;
            webview2.CoreWebView2.FrameCreated -= CoreWebView2_FrameCreated;
            webview2.CoreWebView2.FrameNavigationCompleted -= CoreWebView2_FrameNavigationCompleted;
        }

        //webview2.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
        //社区快捷工具条悬浮窗口随壳一起关闭
        _communityNav?.Close();
        _communityNav = null;
        //强制回收webview2
        if (Instance == this)
            Instance = null;
        base.OnClosed(e);
        Configer.Save();
        webview2.Dispose();
        GC.Collect();
    }

    private void Webview2_CoreWebView2InitializationCompleted(object? sender, CoreWebView2InitializationCompletedEventArgs e)
    {
        if (webview2.CoreWebView2 == null)
            return;
#if DEBUG
        //webview2.CoreWebView2.OpenDevToolsWindow();
#endif
        webview2.CoreWebView2.AddHostObjectToScript("api", ClientApi);
        webview2.CoreWebView2.AddHostObjectToScript("shell", new ShellApiObject(this));
        //商店版（UWP）内嵌在 UA 尾部注入固定标识：官网 SSR 据此首帧不渲染站外引流直链（微软商店规则）；
        //安装版不注入，官网照常展示直链。标识需与 giantapp-wallpaper-server 的 STORE_CLIENT_UA_MARKER 保持一致
        if (UWPHelper.IsRunningAsUwp())
            webview2.CoreWebView2.Settings.UserAgent =
                $"{webview2.CoreWebView2.Settings.UserAgent} GiantAppWallpaperStore/1.0";
        webview2.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
        webview2.CoreWebView2.SourceChanged += CoreWebView2_SourceChanged;
        webview2.CoreWebView2.HistoryChanged += CoreWebView2_HistoryChanged;
        //webview2.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        webview2.CoreWebView2.NewWindowRequested += CoreWebView2_NewWindowRequested;
        webview2.CoreWebView2.FrameCreated += CoreWebView2_FrameCreated;
        webview2.CoreWebView2.FrameNavigationCompleted += CoreWebView2_FrameNavigationCompleted;

        if (!AllowDragFile)
            DisableDragFile();
        ApplyCustomFolderMapping(CustomFolderMapping, webview2);

#if !DEBUG
        //禁用F12
        webview2.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
        //禁用右键菜单
        webview2.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        //左下角提示
        webview2.CoreWebView2.Settings.IsStatusBarEnabled = false;
#endif
        //允许记住密码
        webview2.CoreWebView2.Settings.IsPasswordAutosaveEnabled = true;
    }

    private void CoreWebView2_SourceChanged(object sender, CoreWebView2SourceChangedEventArgs e)
    {
        string url = ((CoreWebView2)sender).Source;
        tbAddress.Text = url;
        UpdateNavButtonsState();
    }

    private void CoreWebView2_HistoryChanged(object? sender, object e)
    {
        UpdateNavButtonsState();
        //社区内部导航会改变历史，刷新帧地址模型
        if (_hubActive)
            _ = PollHubFrameUrlAsync();
    }

    //前进/后退按钮随历史记录可用性联动
    private void UpdateNavButtonsState()
    {
        BtnBack.IsEnabled = webview2.CoreWebView2?.CanGoBack == true;
        BtnForward.IsEnabled = webview2.CoreWebView2?.CanGoForward == true;
        UpdateCommunityNav();
    }

    //社区右下角快捷工具条：仅当前在社区页显示；后退/前进只在社区内部生效，
    //刷新只重载社区 iframe
    private void UpdateCommunityNav()
    {
        var core = webview2.CoreWebView2;
        bool show = false;
        bool rtl = false;
        bool canBack = false;
        bool canForward = false;
        if (Uri.TryCreate(core?.Source, UriKind.Absolute, out var uri) && uri != null)
        {
            rtl = IsRtlShellUri(uri);
            if (IsHubPath(uri.AbsolutePath))
            {
                _hubActive = true;
                bool idle = !_hubNavInFlight;
                //帧内 URL 序列索引：>0 有可后退页面，<count-1 有可前进页面
                canBack = idle && _hubUrlIndex > 0;
                canForward = idle && _hubUrlIndex < _hubUrls.Count - 1;
                show = true;
            }
            else
            {
                //离开社区：重置检测状态
                _hubActive = false;
                _hubFrame = null;
                _hubUrls.Clear();
                _hubUrlIndex = 0;
            }
        }
        if (!show)
        {
            _communityNav?.UpdateState(false, false, false, false);
            return;
        }
        if (_communityNav == null)
        {
            _communityNav = new CommunityNavWindow(this);
            _communityNav.BackRequested += () => CommunityNavTraverseAsync(-1);
            _communityNav.ForwardRequested += () => CommunityNavTraverseAsync(1);
            _communityNav.RefreshRequested += CommunityNavRefresh;
        }
        _communityNav.UpdateState(true, rtl, canBack, canForward);
    }

    private void CommunityNavTraverseAsync(int delta)
    {
        if (_hubNavInFlight)
            return;
        _ = CommunityNavTraverseAsyncCore(delta);
    }

    //后退/前进一步：先实时读地址确认目标条目存在才执行；落位期间按钮保持禁用
    private async System.Threading.Tasks.Task CommunityNavTraverseAsyncCore(int delta)
    {
        var frame = _hubFrame;
        if (frame == null || frame.IsDestroyed() != 0)
            return;
        _hubNavInFlight = true;
        try
        {
            string href = await TryReadHubHrefAsync(frame);
            if (href == null)
                return;
            UpdateHubUrlModel(href);
            UpdateCommunityNav();
            int target = _hubUrlIndex + delta;
            if (target < 0 || target >= _hubUrls.Count)
                return; //已在社区起点/终点：无可后退/前进内容
        string before = href;
        await frame.ExecuteScriptAsync(delta < 0 ? "history.back()" : "history.forward()");
        _hubUrlIndex = target; //乐观移动并禁用，防止连点
        UpdateCommunityNav();
        //快轮询等地址落位：一有变化立即恢复按钮（SPA 的 history 跳转几十毫秒即落位，
        //旧实现固定轮询 8×150ms≈1.2 秒，按钮禁用感很明显）；剩余校正由
        //HistoryChanged → PollHubFrameUrlAsync 兜底
        for (int i = 0; i < 6; i++)
        {
            await System.Threading.Tasks.Task.Delay(50);
            href = await TryReadHubHrefAsync(frame);
            if (href == null || _hubFrame != frame)
                return;
            if (href != before)
            {
                UpdateHubUrlModel(href);
                break;
            }
        }
        }
        finally
        {
            _hubNavInFlight = false;
            UpdateCommunityNav();
            _ = PollHubFrameUrlAsync(); //最终校正一次
        }
    }

    //刷新社区 iframe（只重载社区页面，不动壳）
    private void CommunityNavRefresh()
    {
        if (_hubNavInFlight)
            return;
        var frame = _hubFrame;
        if (frame == null || frame.IsDestroyed() != 0)
            return;
        _ = frame.ExecuteScriptAsync("location.reload()");
    }

    //读取社区 iframe 当前地址（原始 JSON 编码串，同一地址编码稳定可直接比较）
    private static async System.Threading.Tasks.Task<string?> TryReadHubHrefAsync(CoreWebView2Frame frame)
    {
        try
        {
            string href = await frame.ExecuteScriptAsync("location.href");
            return string.IsNullOrEmpty(href) || href == "null" ? null : href;
        }
        catch
        {
            return null; //帧已销毁或尚不可执行脚本
        }
    }

    //维护访问序列模型：新地址截断前进记录后入栈，后退/前进则指针回移
    private void UpdateHubUrlModel(string href)
    {
        if (_hubUrls.Count == 0)
        {
            _hubUrls.Add(href);
            _hubUrlIndex = 0;
            return;
        }
        if (_hubUrls[_hubUrlIndex] == href)
            return;
        int i = _hubUrls.IndexOf(href);
        if (i >= 0)
        {
            _hubUrlIndex = i;
            return;
        }
        if (_hubUrlIndex < _hubUrls.Count - 1)
            _hubUrls.RemoveRange(_hubUrlIndex + 1, _hubUrls.Count - _hubUrlIndex - 1);
        _hubUrls.Add(href);
        _hubUrlIndex = _hubUrls.Count - 1;
        _logger.Info($"[HubBack] model out: index={_hubUrlIndex} count={_hubUrls.Count} show={_hubUrlIndex > 0}");
    }

    //读取工具条对齐锚点：hub 页里社区 iframe 的位置（查 DOM，同源）+
    //站点「回到顶部」按钮的位置（跨源帧脚本；right:24 相对站点布局视口，
    //还要让开站点自身滚动条，只有按钮实测坐标才是精确锚点）
    internal async System.Threading.Tasks.Task RefreshHubAnchorAsync()
    {
        try
        {
            var core = webview2.CoreWebView2;
            if (core == null)
                return;
            string s = await core.ExecuteScriptAsync(
                "(function(){var f=document.querySelector('iframe');if(!f)return 'null';var r=f.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].join(',')})()");
            if (ParseRectScriptResult(s, out var iframe))
                HubIframeRect = iframe;
            else
                HubIframeRect = null;

            HubBtnRect = null;
            var frame = _hubFrame;
            if (iframe != null && frame != null && frame.IsDestroyed() == 0)
            {
                string b = await frame.ExecuteScriptAsync(
                    "(function(){var e=document.querySelector(\"[aria-label='回到顶部']\");if(!e)return 'null';var r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].join(',')})()");
                if (ParseRectScriptResult(b, out var btn))
                {
                    //iframe 相对坐标 → webview 坐标
                    HubBtnRect = new double[4] {
                        iframe[0] + btn[0], iframe[1] + btn[1],
                        iframe[0] + btn[2], iframe[1] + btn[3],
                    };
                }
            }
        }
        catch
        {
            HubIframeRect = null; //脚本失败退回窗口角定位
            HubBtnRect = null;
        }
    }

    //ExecuteScriptAsync 返回 JSON 字符串（双层编码），解析 "[l,t,r,b]" 形式
    private static bool ParseRectScriptResult(string s, out double[]? rect)
    {
        rect = null;
        try
        {
            var inner = System.Text.Json.JsonDocument.Parse(s).RootElement.GetString();
            if (string.IsNullOrEmpty(inner) || inner == "null")
                return false;
            var p = inner.Split(',');
            if (p.Length != 4)
                return false;
            rect = p.Select(x => double.Parse(x, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
            return true;
        }
        catch
        {
            return false;
        }
    }

    //重读锚点（iframe/按钮位置）并让工具条重新落位（状态/尺寸变化后调用）
    private async void ResyncCommunityNavAfterLayoutAsync()
    {
        await RefreshHubAnchorAsync();
        FixWebView2StaleBounds();
        _communityNav?.UpdatePlacement();
    }

    private async System.Threading.Tasks.Task PollHubFrameUrlAsync()
    {
        var frame = _hubFrame;
        if (frame == null || frame.IsDestroyed() != 0 || _hubFrame != frame)
            return;
        string href = await TryReadHubHrefAsync(frame);
        if (href == null || _hubFrame != frame)
            return;
        UpdateHubUrlModel(href);
        UpdateCommunityNav();
        await RefreshHubAnchorAsync();
        _communityNav?.UpdatePlacement();
        await LogViewportDiagnosticsAsync("poll");
    }

    private void CoreWebView2_FrameNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        //社区 iframe 文档级导航完成后刷新地址模型
        if (_hubActive)
            _ = PollHubFrameUrlAsync();
    }

    //壳的顶层路径是否是社区页（静态导出为 /{lang}/hub.html，SPA 路由为 /{lang}/hub）
    private static bool IsHubPath(string absolutePath)
    {
        string path = absolutePath.TrimEnd('/');
        return path.EndsWith("/hub", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/hub.html", StringComparison.OrdinalIgnoreCase);
    }

    //从壳地址的第一段解析语言并判断是否 RTL（如 /zh.html、/en/hub）
    private static bool IsRtlShellUri(Uri uri)
    {
        string first = uri.AbsolutePath.Trim('/').Split('/').FirstOrDefault() ?? string.Empty;
        string lang = first.EndsWith(".html", StringComparison.OrdinalIgnoreCase)
            ? first[..^5]
            : first;
        return RtlLanguages.Contains(lang.ToLowerInvariant());
    }

    private void CoreWebView2_FrameCreated(object sender, CoreWebView2FrameCreatedEventArgs e)
    {
        e.Frame.AddHostObjectToScript("api", ClientApi, Origins);
        webview2.CoreWebView2.AddHostObjectToScript("shell", new ShellApiObject(this));
        //社区页创建的第一个帧即社区 iframe，用它在帧内执行 history.back / 读取 location
        if (_hubActive && _hubFrame == null)
            _hubFrame = e.Frame;
    }

    private void CoreWebView2_NewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;

        var window = new ShellWindow(true, "InfoWindow")
        {
            CloseByEsc = true
        };
        window.webview2.Visibility = Visibility.Visible;
        _ = window.ShowUrl(e.Uri);
    }

    private void CoreWebView2_NavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
    {
        tbAddress.Text = e.Uri;
        var uri = new Uri(e.Uri);
        //if rewrited
        if (uri.Query.Contains("rewrited=true"))
            return;
        foreach (var item in RewriteMapping)
        {
            //用正则匹配
            var matches = System.Text.RegularExpressions.Regex.Matches(uri.AbsolutePath, item.Key);
            if (matches.Count > 0)
            {
                var oldContent = matches[0].Value;
                var newContent = item.Value.Replace(item.Key, oldContent);
                e.Cancel = true;
                string rewriteAbsolutePath = uri.AbsolutePath.Replace(oldContent, newContent);
                string rewriteUrl = uri.GetLeftPart(UriPartial.Authority) + rewriteAbsolutePath + uri.Query;

                if (rewriteUrl.Contains("?"))
                    rewriteUrl += "&rewrited=true";
                else
                    rewriteUrl += "?rewrited=true";
                webview2.CoreWebView2.Navigate(rewriteUrl);
                break;
            }
        }

        //auto append html
        foreach (var domain in AutoAppendHtmlDomains)
        {
            if (uri.Host.Contains(domain))
            {
                //静态导出没有目录索引页，尾斜杠路径要先去掉再补 .html，
                //否则生成 /en/settings/.html 这类 404 地址
                string path = uri.AbsolutePath.TrimEnd('/');
                if (path.Length > 0 && !path.EndsWith(".html"))
                {
                    e.Cancel = true;
                    string rewriteUrl = uri.GetLeftPart(UriPartial.Authority) + path + ".html" + uri.Query;
                    webview2.CoreWebView2.Navigate(rewriteUrl);
                }
                break;
            }
        }
    }

    internal void HideLoading()
    {
        loading.Visibility = Visibility.Collapsed;
        webview2.Visibility = Visibility.Visible;
    }

    private void Window_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
    {
        //Ctrl+Shift+R 强制刷新：清空浏览器缓存后重新加载
        if (e.Key == Key.R && Keyboard.Modifiers == (ModifierKeys.Control | ModifierKeys.Shift))
        {
            _ = ForceReloadAsync();
            return;
        }
        //社区快捷键：Alt+← 后退、Alt+→ 前进、F5 刷新，仅在社区页生效。
        //WPF 版 WebView2 会把浏览器加速键转发成 WPF 冒泡 KeyDown 路由到这里
        if (_hubActive)
        {
            if (e.Key == Key.Left && Keyboard.Modifiers == ModifierKeys.Alt)
            {
                e.Handled = true;
                CommunityNavTraverseAsync(-1);
                return;
            }
            if (e.Key == Key.Right && Keyboard.Modifiers == ModifierKeys.Alt)
            {
                e.Handled = true;
                CommunityNavTraverseAsync(1);
                return;
            }
            if (e.Key == Key.F5)
            {
                e.Handled = true;
                CommunityNavRefresh();
                return;
            }
        }
        if (CloseByEsc && e.Key == Key.Escape)
        {
            Close();
        }
    }

    //清空本地浏览器缓存（HTTP 缓存，不动 localStorage/登录态）并重新加载，等同浏览器 Ctrl+Shift+R
    public async Task ForceReloadAsync()
    {
        var core = webview2.CoreWebView2;
        if (core == null)
            return;
        _logger.Info("ForceReload");
        try
        {
            await core.Profile.ClearBrowsingDataAsync(CoreWebView2BrowsingDataKinds.DiskCache);
        }
        catch (Exception ex)
        {
            //旧版 WebView2 Runtime 可能不支持该接口，降级为普通刷新
            _logger.Error(ex);
        }
        core.Reload();
    }

    private void BtnBack_Click(object sender, RoutedEventArgs e)
    {
        webview2.CoreWebView2?.GoBack();
    }

    private void BtnForward_Click(object sender, RoutedEventArgs e)
    {
        webview2.CoreWebView2?.GoForward();
    }

    private void BtnReload_Click(object sender, RoutedEventArgs e)
    {
        webview2.CoreWebView2?.Reload();
    }

    private void BtnMinimize_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void BtnMaximize_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Maximized;
    }

    private void BtnRestore_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Normal;
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void BtnCopyAddress_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            if (UWPHelper.IsRunningAsUwp())
            {
                var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();
                dataPackage.SetText(tbAddress.Text);
                Windows.ApplicationModel.DataTransfer.Clipboard.SetContent(dataPackage);
            }
            else
            {
                System.Windows.Forms.Clipboard.SetText(tbAddress.Text);
            }
            //复制成功反馈：字形变对勾，短暂显示后还原
            BtnCopyAddress.Content = CheckGlyph;
            _copyFeedbackTimer.Stop();
            _copyFeedbackTimer.Start();
        }
        catch (Exception ex)
        {
            _logger.Error(ex);
            MessageBox.Show(ex.Message);
        }
    }
    #endregion
}
