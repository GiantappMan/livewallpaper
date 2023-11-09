using Client.Libs;
using Client.UI;
using Microsoft.Web.WebView2.Core;
using System;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;

namespace GiantappWallpaper;

class ShellConfig
{
    public double Width { get; set; }
    public double Height { get; set; }
}

public partial class ShellWindow : Window
{
    #region properties
    public static ShellWindow? Instance { get; private set; }
    public static object? ClientApi { get; set; }
    static readonly Uri _domain = new("https://client.app/");

    #endregion

    public ShellWindow()
    {
        InitializeComponent();
        SizeChanged += ShellWindow_SizeChanged;
        webview2.CoreWebView2InitializationCompleted += Webview2_CoreWebView2InitializationCompleted;
        webview2.Source = _domain;
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
    }

    #region public

    [DllImport("UXTheme.dll", SetLastError = true, EntryPoint = "#138")]
    public static extern bool ShouldSystemUseDarkMode();


    public static void SetTheme(string theme, string mode)
    {
        //首字母大写
        theme = theme.First().ToString().ToUpper() + theme[1..];
        if (mode == "system")
        {
            bool darkMode = ShouldSystemUseDarkMode();
            if (!darkMode)
            {
                mode = "light";
            }
            else
            {
                mode = "dark";
            }
        }
        ResourceDictionary appResources = System.Windows.Application.Current.Resources;
        var old = appResources.MergedDictionaries.FirstOrDefault(x => x.Source?.ToString().Contains("/LiveWallpaper3;component/UI/Themes") == true);
        if (old != null)
        {
            appResources.MergedDictionaries.Remove(old);
        }
        ResourceDictionary themeDict = new()
        {
            Source = new Uri($"/LiveWallpaper3;component/UI/Themes/{mode}/{theme}.xaml", UriKind.RelativeOrAbsolute)
        };
        appResources.MergedDictionaries.Add(themeDict);
    }

    public static async void ShowShell(string? url = "index.html")
    {

#if DEBUG
        //本地开发
        _domain = new("http://localhost:3000/");
        url = null;
#endif

        Instance ??= new ShellWindow();

        bool ok = await Task.Run(CheckWebView2);
        if (!ok)
        {
            //没装webview2
            Instance.loading.Visibility = Visibility.Collapsed;
            Instance.tips.Visibility = Visibility.Visible;
        }
        else
        {
            Instance.loading.Visibility = Visibility.Visible;
        }

        if (Instance.WindowState == WindowState.Minimized)
            Instance.WindowState = WindowState.Normal;

        if (Instance.Visibility == Visibility.Visible && !Instance.IsActive)
            Instance.Activate();

        if (url != null)
        {
            url = $"{_domain}{url}";
        }
        else
        {
            url = $"{_domain}";
        }

        Instance.webview2.Source = new Uri(url);
        Instance.webview2.NavigationCompleted += NavigationCompleted;
        Instance.Show();
    }

    #endregion

    #region private
    static bool CheckWebView2()
    {
        try
        {
            var version = CoreWebView2Environment.GetAvailableBrowserVersionString();
            return true;
        }
        catch (WebView2RuntimeNotFoundException e)
        {
            System.Diagnostics.Debug.WriteLine(e);
        }
        return false;
    }
    #endregion

    #region callback

    private void ShellWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
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

    }

    protected override void OnClosed(EventArgs e)
    {
        SizeChanged -= ShellWindow_SizeChanged;
        webview2.CoreWebView2InitializationCompleted -= Webview2_CoreWebView2InitializationCompleted;
        //webview2.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
        Instance = null;
        base.OnClosed(e);
        Configer.Save();
    }


    private void Webview2_CoreWebView2InitializationCompleted(object? sender, CoreWebView2InitializationCompletedEventArgs e)
    {
        if (ClientApi != null)
        {
            webview2.CoreWebView2.AddHostObjectToScript("api", new Client.Apps.ApiObject());
            webview2.CoreWebView2.AddHostObjectToScript("shell", new ShellApiObject());
        }
        //webview2.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        webview2.CoreWebView2.SetVirtualHostNameToFolderMapping("client.app", "Assets/UI", CoreWebView2HostResourceAccessKind.DenyCors);
#if !DEBUG
        //禁用F12
        webview2.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
        //禁用右键菜单
        webview2.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        //左下角提示
        webview2.CoreWebView2.Settings.IsStatusBarEnabled = false;
#endif
    }

    //private void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    //{
    //    var webView = sender as Microsoft.Web.WebView2.Wpf.WebView2;
    //    var msg = e.TryGetWebMessageAsString();
    //}

    #endregion

}
