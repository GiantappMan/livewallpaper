using Client.Libs;
using Client.UI;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
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
    private string? _configKey;

    #region properties
    public static ShellWindow? Instance { get; private set; }
    public static object? ClientApi { get; set; }
    public static bool IsDarkMode { get; private set; }//没有System
    public static Mode Mode { get; private set; }//有System
    public static string Theme { get; private set; } = string.Empty;
    public static bool AllowDragFile { get; set; } = false;

    public static Dictionary<string, string> CustomFolderMapping { get; private set; } = new();
    public static Dictionary<string, string> RewriteMapping { get; internal set; } = new();

    /// <summary>
    /// 允许iframe 调用api对象
    /// </summary>
    public static string[] Origins { get; set; } = new string[0];

    #endregion

    public ShellWindow(bool showAddress, string? configKey = null)
    {
        _configKey = configKey;
        InitializeComponent();
        tbAddress.Visibility = showAddress ? Visibility.Visible : Visibility.Collapsed;
        SizeChanged += ShellWindow_SizeChanged;
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
        //修改webview2，document.shell_hidden 属性
        string value = WindowState == WindowState.Minimized ? "true" : "false";
        webview2.CoreWebView2?.ExecuteScriptAsync($"document.shell_hidden = {value}");

        if (WindowState != WindowState.Minimized)
        {
            SaveShellConfig();
        }
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
        if (WindowState == WindowState.Maximized)
        {
            return;
        }
        SaveShellConfig();
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
            Process.Start(new ProcessStartInfo(setupPath) { UseShellExecute = true });
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
            webview2.CoreWebView2.NewWindowRequested -= CoreWebView2_NewWindowRequested;
            webview2.CoreWebView2.FrameCreated -= CoreWebView2_FrameCreated;
        }

        //webview2.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
        //强制回收webview2
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
        webview2.CoreWebView2.AddHostObjectToScript("shell", new ShellApiObject());
        webview2.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
        webview2.CoreWebView2.SourceChanged += CoreWebView2_SourceChanged;
        //webview2.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        webview2.CoreWebView2.NewWindowRequested += CoreWebView2_NewWindowRequested;
        webview2.CoreWebView2.FrameCreated += CoreWebView2_FrameCreated;

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
    }

    private void CoreWebView2_SourceChanged(object sender, CoreWebView2SourceChangedEventArgs e)
    {
        string url = ((CoreWebView2)sender).Source;
        tbAddress.Text = url;
    }

    private void CoreWebView2_FrameCreated(object sender, CoreWebView2FrameCreatedEventArgs e)
    {
        e.Frame.AddHostObjectToScript("api", ClientApi, Origins);
    }

    private void CoreWebView2_NewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;

        var window = new ShellWindow(true, "InfoWindow");
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
    }

    internal void HideLoading()
    {
        loading.Visibility = Visibility.Collapsed;
        webview2.Visibility = Visibility.Visible;
    }
    #endregion

    private void Window_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            Close();
        }
    }
}
