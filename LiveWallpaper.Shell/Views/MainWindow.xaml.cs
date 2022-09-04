using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using LiveWallpaper.LocalServer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using NLog;
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;

namespace LiveWallpaper.Shell.Views
{
    public class MainViewModel : ObservableObject
    {
        private string? _tipsMessage = null;
        private bool _showTips;
        private bool _isLoading;
        private string? _downloadUrl;
        private string? _downloadText;
        private string? _url = null;
        private bool _browserInit = false;
        private double? _windowWidth;
        private double? _windowHeight;
        private WindowState _windowState;

        public MainViewModel()
        {
            OpenDownloadUrlCommand = new AsyncRelayCommand(OpenDownloadUrl);
            try
            {
                Init();
                IsLoading = true;
                var version = CoreWebView2Environment.GetAvailableBrowserVersionString();
            }
            catch (WebView2RuntimeNotFoundException)
            {
                //Handle the runtime not being installed.
                //exception.Message` is very nicely specific: It (currently at least) says "Couldn't find a compatible Webview2 Runtime installation to host WebViews."
                IsLoading = false;
                _ = Task.Run(async () =>
                {
                    DownloadUrl = $"{App.GetLocalHosst()}MicrosoftEdgeWebview2Setup.exe";
                    DownloadText = await AppManager.GetText("installNow");
                    TipsMessage = await AppManager.GetText("installWebview2Tips");
                    ShowTips = true;
                });
            }
            finally
            {
            }
        }

        private void Init()
        {
            if (AppManager.UserSetting != null)
            {
                _ = double.TryParse(AppManager.UserSetting.General.WindowWidth, out double tmpWidth);
                if (tmpWidth <= 500)
                {
                    tmpWidth = 1215;
                }
                _ = double.TryParse(AppManager.UserSetting.General.WindowHeight, out double tmpHeight);
                if (tmpHeight <= 300)
                {
                    tmpHeight = 680;
                }

                if (AppManager.UserSetting.General.WindowState != null)
                {
                    _ = Enum.TryParse(AppManager.UserSetting.General.WindowState, out WindowState tmpState);
                    WindowState = tmpState;
                }

                WindowWidth = tmpWidth;
                WindowHeight = tmpHeight;
            }
            else
            {
                WindowWidth = 1024;
                WindowHeight = 680;
            }
        }

        #region properties
        public bool ShowTips
        {
            get => _showTips;
            set => SetProperty(ref _showTips, value);
        }
        public bool IsLoading
        {
            get => _isLoading;
            set => SetProperty(ref _isLoading, value);
        }
        public string? TipsMessage
        {
            get => _tipsMessage;
            set => SetProperty(ref _tipsMessage, value);
        }
        public string? DownloadUrl
        {
            get => _downloadUrl;
            set => SetProperty(ref _downloadUrl, value);
        }
        public string? Url
        {
            get => _url;
            set => SetProperty(ref _url, value);
        }
        public string? DownloadText
        {
            get => _downloadText;
            set => SetProperty(ref _downloadText, value);
        }
        public double? WindowHeight
        {
            get => _windowHeight;
            set => SetProperty(ref _windowHeight, value);
        }
        public double? WindowWidth
        {
            get => _windowWidth;
            set => SetProperty(ref _windowWidth, value);
        }
        public WindowState WindowState
        {
            get => _windowState;
            set => SetProperty(ref _windowState, value);
        }

        #endregion

        #region commands
        public IAsyncRelayCommand OpenDownloadUrlCommand { get; }

        #endregion
        private Task OpenDownloadUrl()
        {
            try
            {
                ////string url = "https://developer.microsoft.com/MicrosoftEdgeWebview2Setup.exe";
                //if (_downloadUrl != null)
                //    Process.Start(new ProcessStartInfo(_downloadUrl) { UseShellExecute = true });
                string dir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
                var setupPath = Path.Combine(dir, "wwwroot/MicrosoftEdgeWebview2Setup.exe");
                Process.Start(new ProcessStartInfo(setupPath) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
            return Task.CompletedTask;
        }

        internal async Task SetupWebview(WebView2 webview2)
        {
            if (_browserInit || AppManager.EntryVersion == null)
                return;
            try
            {
                string cachePath = Path.Combine(AppManager.CacheDir, AppManager.EntryVersion);

                _ = Task.Run(CleanCacheDir);

                var webView2Environment = await CoreWebView2Environment.CreateAsync(null, cachePath);
                await webview2.EnsureCoreWebView2Async(webView2Environment);

                webview2.CoreWebView2.SourceChanged += CoreWebView2_SourceChanged;
                webview2.NavigationStarting += Webview2_NavigationStarting;
                webview2.CoreWebView2.DOMContentLoaded += CoreWebView2_DOMContentLoaded;
                webview2.NavigationCompleted += Webview2_NavigationCompleted;

                _browserInit = true;
            }
            catch (Exception ex)
            {
                var logger = App.Instance.Services!.GetService<ILogger>();
                logger?.Warn($"SetupWebview ex: {ex}");
                System.Diagnostics.Debug.WriteLine("SetupWebview ex:", ex);
            }
        }

        private void CleanCacheDir()
        {
            try
            {
                // 清理历史文件
                string[] dirs = Directory.GetDirectories(AppManager.CacheDir);
                foreach (string dirItem in dirs)
                {
                    var name = new DirectoryInfo(dirItem).Name;
                    if (name != AppManager.EntryVersion)
                    {
                        Directory.Delete(dirItem, true);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("CleanCacheDir ex {0}:", ex);
            }
        }

        private void CoreWebView2_SourceChanged(object? sender, CoreWebView2SourceChangedEventArgs e)
        {
            if (sender is CoreWebView2 webview2)
                _url = webview2.Source;
        }

        private void CoreWebView2_DOMContentLoaded(object? sender, CoreWebView2DOMContentLoadedEventArgs e)
        {
            IsLoading = false;
        }

        private void Webview2_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            IsLoading = false;
        }

        private void Webview2_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
        {
            _url = e.Uri;
            IsLoading = true;
        }
    }

    /// <summary>
    /// MainWindow.xaml 的交互逻辑
    /// </summary>
    public partial class MainWindow : Window
    {
        private readonly MainViewModel _vm = new();
        private bool _needSaveUserSetting = false;
        public MainWindow(string url)
        {
            if (_vm.WindowWidth != null)
                Width = _vm.WindowWidth.Value;
            if (_vm.WindowHeight != null)
                Height = _vm.WindowHeight.Value;

            InitializeComponent();
            DataContext = _vm;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            ShowUrl(url);
        }

        internal async void ShowUrl(string url)
        {
            try
            {
                await _vm.SetupWebview(webview2);
                //webview2.CoreWebView2.OpenDevToolsWindow();

                _vm.Url = url;

                if (!IsVisible)
                    Show();
                else
                    Activate();

                if (WindowState == WindowState.Minimized)
                    WindowState = WindowState.Normal;
            }
            catch (Exception ex)
            {
                //电脑卡 释放时可能出异常
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        private async void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            try
            {
                if (_needSaveUserSetting)
                {
                    await AppManager.SaveUserSetting(AppManager.UserSetting);
                }
                webview2.Dispose();
            }
            catch (Exception)
            {

            }
        }

        private void Window_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            if (AppManager.UserSetting != null)
            {
                AppManager.UserSetting.General.WindowWidth = Width.ToString();
                AppManager.UserSetting.General.WindowHeight = Height.ToString();
            }
            _needSaveUserSetting = true;
        }

        private void Window_StateChanged(object sender, EventArgs e)
        {
            if (WindowState == WindowState.Minimized)
                return;
            if (AppManager.UserSetting != null)
                AppManager.UserSetting.General.WindowState = this.WindowState.ToString();
            _needSaveUserSetting = true;
        }
    }
}
