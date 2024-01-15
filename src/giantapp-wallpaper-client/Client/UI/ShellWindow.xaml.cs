using Client.Apps.Configs;
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
using Windows.UI.Xaml.Controls;

namespace GiantappWallpaper;

class ShellConfig
{
    public double Width { get; set; }
    public double Height { get; set; }
}

public partial class ShellWindow : Window
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();

    #region properties
    public static ShellWindow? Instance { get; private set; }
    public static object? ClientApi { get; set; }

    public static bool DarkBackground { get; set; }
    public static bool AllowDragFile { get; set; } = false;

    public static Dictionary<string, string> CustomFolderMapping { get; private set; } = new();
    public static Dictionary<string, string> RewriteMapping { get; internal set; } = new();
    #endregion

    public ShellWindow()
    {
        var appearance = Configer.Get<Appearance>() ?? new();
        if (appearance.Mode == "system")
        {
            //监控系统主题变化
            SystemEvents.UserPreferenceChanged += (s, e) =>
            {
                if (e.Category == UserPreferenceCategory.General)
                {
                    Debouncer.Shared.Delay(() =>
                    {
                        SetTheme(appearance.Theme, appearance.Mode);
                    }, 1000);
                }
            };
        }

        InitializeComponent();
        SizeChanged += ShellWindow_SizeChanged;
        if (DarkBackground)
        {
            webview2.DefaultBackgroundColor = Color.FromKnownColor(KnownColor.Black);
        }
        else
        {
            webview2.DefaultBackgroundColor = Color.FromKnownColor(KnownColor.White);
        }
        webview2.CoreWebView2InitializationCompleted += Webview2_CoreWebView2InitializationCompleted;

        var config = Configer.Get<ShellConfig>();
        const float defaultWidth = 1024;
        const float defaultHeight = 680;
        if (config != null)
        {
            if (config.Width <= 800 || config.Height <= 482)
            {
                Width = defaultWidth;
                Height = defaultHeight;
            }
            else
            {
                Width = config.Width;
                Height = config.Height;
            }
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

    public static void SetTheme(string theme, string mode)
    {
        //首字母大写
        theme = theme.First().ToString().ToUpper() + theme[1..];
        if (mode == "system")
        {
            bool darkMode = ShouldAppsUseDarkMode();
            if (!darkMode)
            {
                mode = "light";
            }
            else
            {
                mode = "dark";
            }
        }
        ResourceDictionary appResources = Application.Current.Resources;
        var old = appResources.MergedDictionaries.FirstOrDefault(x => x.Source?.ToString().Contains("/LiveWallpaper3;component/UI/Themes") == true);
        if (old != null)
        {
            appResources.MergedDictionaries.Remove(old);
        }
        ResourceDictionary themeDict = new()
        {
            Source = new Uri($"/LiveWallpaper3;component/UI/Themes/{mode}/{theme}.xaml", UriKind.RelativeOrAbsolute)
        };
        DarkBackground = mode == "dark";
        appResources.MergedDictionaries.Add(themeDict);
    }

    public static async void ShowShell(string? url)
    {
        _logger.Info($"ShowShell {url}");
        Instance ??= new ShellWindow();

        bool ok = await Task.Run(CheckWebView2);
        if (!ok)
        {
            //没装webview2
            Instance.loading.Visibility = Visibility.Collapsed;
            Instance.tips.Visibility = Visibility.Visible;

            LoopCheckWebView2(url);
        }
        else
        {
            Instance.loading.Visibility = Visibility.Visible;
        }

        if (Instance.WindowState == WindowState.Minimized)
            Instance.WindowState = WindowState.Normal;

        Instance.Activate();

        Instance.webview2.Source = new Uri(url);
        Instance.webview2.NavigationCompleted += NavigationCompleted;
        Instance.Show();
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
            if (isAbsoluteFilePath && !Directory.Exists(item.Value))
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
            var version = CoreWebView2Environment.GetAvailableBrowserVersionString();
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
        webview2.CoreWebView2.ExecuteScriptAsync($"document.shell_hidden = {value}");
    }

    #endregion

    #region callback

    private void ShellWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        if (WindowState == WindowState.Maximized)
        {
            return;
        }
        //记录窗口大小
        ShellConfig config = new()
        {
            Width = Width,
            Height = Height
        };
        Configer.Set(config);
    }

    private static void NavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (Instance != null)
        {
            Instance.webview2.NavigationCompleted -= NavigationCompleted;
            Instance.loading.Visibility = Visibility.Collapsed;
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

        webview2.CoreWebView2.AddHostObjectToScript("api", ClientApi);
        webview2.CoreWebView2.AddHostObjectToScript("shell", new ShellApiObject());
        webview2.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
        //webview2.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

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

    private void CoreWebView2_NavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
    {
        var uri = new Uri(e.Uri);
        //if rewrited
        if (uri.Query.Contains("rewrited=true"))
            return;
        foreach (var item in RewriteMapping)
        {
            ////通配符
            //if (item.Key.Contains("*"))
            //{
            //用正则匹配
            var matches = System.Text.RegularExpressions.Regex.Matches(uri.AbsolutePath, item.Key);
            if (matches.Count > 0)
            {
                var oldContent = matches[0].Value;
                var newContent = item.Value.Replace(item.Key, oldContent);
                e.Cancel = true;
                string rewriteUrl = uri.AbsoluteUri.Replace(oldContent, newContent) + "?rewrited=true";
                webview2.CoreWebView2.Navigate(rewriteUrl);
                break;
            }
            //}
            ////全匹配
            //else if (item.Key.Contains(uri.AbsolutePath))
            //{
            //    e.Cancel = true;
            //    string rewriteUrl = uri.AbsoluteUri + ".html";
            //    webview2.CoreWebView2.Navigate(rewriteUrl);
            //    break;
            //}
        }
    }
    #endregion
}
