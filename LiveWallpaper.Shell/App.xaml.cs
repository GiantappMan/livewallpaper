using Giantapp.LiveWallpaper.Engine;
using HandyControl.Controls;
using LiveWallpaper.LocalServer;
using LiveWallpaper.Shell.Views;
using Microsoft.Extensions.DependencyInjection;
using NLog;
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace LiveWallpaper.Shell
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        #region fields

        #region notifyIcon

        private readonly NotifyIcon _notifyIcon = new();
        private readonly ContextMenu _contextMenu = new();
        private readonly MenuItem _btnAbount = new();
        private readonly MenuItem _btnOffline = new();
        private readonly MenuItem _btnLocalWallpaper = new();
        private readonly MenuItem _btnCommunity = new();
        private readonly MenuItem _btnCommunityWebView2 = new();
        private readonly MenuItem _btnSetting = new();
        private readonly MenuItem _btnExit = new();

        #endregion

        #region fields

        private static Mutex? _mutex;
        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
        private static string? _clientVersion;
        private static MainWindow? _mainWindow;
        const string serverHost = "https://livewallpaper.giantapp.cn/";
        private static int _hostPort;
        private static readonly int _defaultHostPort = 5001;

        #endregion

        #endregion

        protected override void OnStartup(StartupEventArgs e)
        {
            bool ok = CheckMutex();
            if (!ok)
            {
                ShowToastAndKillProcess();
                //return;
            }

            CatchApplicationError();
            InitIoc();
            InitNotifyIcon();
            InitApp();
            //base.OnStartup(e);
        }

        #region properties

        #region IOC

        private void InitIoc()
        {
            Services = ConfigureServices();
        }
        public static App Instance => (App)Current;
        public IServiceProvider? Services { get; private set; }

        /// <summary>
        /// Configures the services for the application.
        /// </summary>
        private static IServiceProvider ConfigureServices()
        {
            var services = new ServiceCollection();

            services.AddSingleton<ILogger>(_logger);

            return services.BuildServiceProvider();
        }

        #endregion

        #endregion

        #region callback
        private void LanService_CultureChanged(object? sender, EventArgs e)
        {
            SetMenuText();
        }
        private async void BtnExit_Click(object Sender, EventArgs e)
        {
            await WallpaperApi.Dispose();
            _notifyIcon?.Dispose();
            Current.Shutdown();
        }
        private void NotifyIcon_MouseDoubleClick(object sender, RoutedEventArgs e)
        {
            string? url = GetUrl("", GetLocalHosst());
            OpenLocalView(url);
        }
        private void BtnSetting_Click(object sender, EventArgs e)
        {
            string? url = GetUrl("/setting", GetLocalHosst());
            OpenLocalView(url);
        }
        private void BtnMainUIWeb_Click(object sender, EventArgs e)
        {
            string? url = GetUrl("", GetLocalHosst());
            OpenLocalView(url);
        }
        private void MainWindow_Closed(object? sender, EventArgs e)
        {
            if (_mainWindow != null)
                _mainWindow.Closed -= MainWindow_Closed;
            _mainWindow = null;
        }
        private void BtnAbount_Click(object sender, EventArgs e)
        {
            OpenBrowser("https://www.giantapp.cn/post/products/livewallpaperv2/");
        }
        private void BtnCommunity_Click(object sender, EventArgs e)
        {
            string? r = GetUrl("/wallpapers", serverHost);
            OpenBrowser(r);
        }
        private void BtnCommunityWebView2_Click(object sender, EventArgs e)
        {
            string? r = GetUrl("/wallpapers", serverHost);
            OpenLocalView(r);
        }
        private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            var ex = e.ExceptionObject as Exception;
            _logger.Error(ex);
            System.Windows.MessageBox.Show($"Error:{ex?.Message}. \r \r Livewallpaper has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
            OpenConfigFolder();
        }
        private void Current_DispatcherUnhandledException(object sender, System.Windows.Threading.DispatcherUnhandledExceptionEventArgs e)
        {
            var ex = e.Exception;
            _logger.Error(ex);
            System.Windows.MessageBox.Show($"Error:{ex.Message}. \r \r Livewallpaper has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
            OpenConfigFolder();
        }
        #endregion

        #region private methods
        private void SetMenuText()
        {
            _ = Current.Dispatcher.Invoke(async () =>
            {
                _btnAbount.Header = await AppManager.GetText("about");
                _btnCommunity.Header = await AppManager.GetText("wallpaperCommunityBrowser");
                _btnCommunityWebView2.Header = await AppManager.GetText("wallpaperCommunity");
                //_btnOffline.Header = await AppManager.GetText("client.offline");
                _btnLocalWallpaper.Header = await AppManager.GetText("localWallpaper");
                _btnExit.Header = await AppManager.GetText("exit");
                _btnSetting.Header = await AppManager.GetText("settings");
                _notifyIcon.Text = await AppManager.GetText("appName");
            });
        }
        private void InitApp()
        {
            var version = Assembly.GetEntryAssembly()?.GetName().Version;
            _clientVersion = version!.ToString();
            _hostPort = GetPort();

            WallpaperApi.Initlize(Current.Dispatcher);
            AppManager.CultureChanged += LanService_CultureChanged;
            SetMenuText();
            _ = Task.Run(() =>
            {
                ServerWrapper.Start(_hostPort);
            });
        }
        //捕获异常
        private void CatchApplicationError()
        {
            //日志路径
            var config = new NLog.Config.LoggingConfiguration();

            string logPath = Path.Combine(AppManager.LogDir, "log.txt");
            var logfile = new NLog.Targets.FileTarget("logfile") { FileName = logPath };
            var logconsole = new NLog.Targets.ConsoleTarget("logconsole");

            config.AddRule(LogLevel.Info, LogLevel.Fatal, logconsole);
            config.AddRule(LogLevel.Debug, LogLevel.Fatal, logfile);

            // Apply config           
            LogManager.Configuration = config;

            //异常捕获
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;

            Current.DispatcherUnhandledException += Current_DispatcherUnhandledException;

            //Application.SetHighDpiMode(HighDpiMode.PerMonitorV2); 多屏 DPI
        }
        private void InitNotifyIcon()
        {
            string? dir = Path.GetDirectoryName(Assembly.GetEntryAssembly()?.Location);
            string settingImage = Path.Combine(dir!, "Assets", "setting.png");
            string webImage = Path.Combine(dir!, "Assets", "web.png");
            string windowImage = Path.Combine(dir!, "Assets", "window.png");
            string exitImage = Path.Combine(dir!, "Assets", "exit.png");
            string logoImage = Path.Combine(dir!, "Assets", "logo128.ico");

            _btnAbount.Click += BtnAbount_Click;
            _contextMenu.Items.Add(_btnAbount);
            _contextMenu.Items.Add(new Separator());


            _btnCommunity.Icon = new Image() { Source = new BitmapImage(new Uri(webImage, UriKind.RelativeOrAbsolute)) };
            _btnCommunity.Click += BtnCommunity_Click;
            _contextMenu.Items.Add(_btnCommunity);

            _btnCommunityWebView2.Icon = new Image() { Source = new BitmapImage(new Uri(windowImage, UriKind.RelativeOrAbsolute)) };
            _btnCommunityWebView2.Click += BtnCommunityWebView2_Click;
            _contextMenu.Items.Add(_btnCommunityWebView2);

            _btnLocalWallpaper.Icon = new Image() { Source = new BitmapImage(new Uri(windowImage, UriKind.RelativeOrAbsolute)) };
            _btnLocalWallpaper.Click += BtnMainUIWeb_Click;
            _contextMenu.Items.Add(_btnLocalWallpaper);

            _btnSetting.Icon = new Image() { Source = new BitmapImage(new Uri(settingImage, UriKind.RelativeOrAbsolute)) };
            _btnSetting.Click += BtnSetting_Click;
            _contextMenu.Items.Add(_btnSetting);

            _contextMenu.Items.Add(new Separator());

            _btnExit.Icon = new Image() { Source = new BitmapImage(new Uri(exitImage, UriKind.RelativeOrAbsolute)) };
            _btnExit.Click += BtnExit_Click;
            _contextMenu.Items.Add(_btnExit);

            _notifyIcon.Icon = new BitmapImage(new Uri(logoImage, UriKind.Absolute))
            {
                DecodePixelWidth = 300,
                DecodePixelHeight = 300
            };
            _notifyIcon.ContextMenu = _contextMenu;
            _notifyIcon.MouseDoubleClick += NotifyIcon_MouseDoubleClick;
            _notifyIcon.Init();
        }
        /// <summary>
        /// 获取可用端口
        /// </summary>
        /// <returns></returns>
        static int GetPort()
        {
            int[] defaultPorts = new int[] { _defaultHostPort, 6001, 7001, 8001, 0 };//0 表示随机

            for (int i = 0; i < defaultPorts.Length; i++)
            {
                try
                {
                    TcpListener l = new(IPAddress.Loopback, defaultPorts[i]);
                    l.Start();
                    int port = ((IPEndPoint)l.LocalEndpoint).Port;
                    l.Stop();
                    return port;
                }
                catch (Exception)
                {
                    continue;
                }
            }

            return _defaultHostPort;
        }
        internal static string GetLocalHosst()
        {
            return $"http://localhost:{_hostPort}/";
        }
        private async void OpenLocalView(string? url)
        {
            if (url == null)
                return;

            try
            {
                url = $"{url}?v={_clientVersion}";//加个参数更新浏览器缓存
                if (_hostPort != _defaultHostPort)
                {
                    url = $"{url}&p={_hostPort}";
                }
                if (_mainWindow == null)
                {
                    _mainWindow = new MainWindow(url)
                    {
                        Title = await AppManager.GetText("appName")
                    };
                    _mainWindow.Closed += MainWindow_Closed;
                    _mainWindow.Show();
                }
                else
                    _mainWindow.ShowUrl(url);
            }
            catch (Exception ex)
            {
                //电脑卡 释放时可能出异常
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }
        private static string? GetUrl(string url, string host)
        {
            if (AppManager.UserSetting == null)
                return null;

            //默认
            string lan = "en";
            if (AppManager.UserSetting.General.CurrentLan != null)
            {
                //根据配置打开网页
                lan = AppManager.UserSetting.General.CurrentLan;
            }
            else
            {
                //没有配置，是中文系统
                if (Thread.CurrentThread.CurrentCulture.Name.StartsWith("zh"))
                    lan = "zh";
            }

            switch (lan)
            {
                case "zh":
                    //中文在前端为默认语言
                    //去掉第一个斜线否者会多
                    //英语 xxxx/en/page
                    //中文 xxxx/page
                    if (url.StartsWith("/"))
                        url = url[1..];
                    break;
                default:
                    url = $"{lan}{url}";
                    break;
            }

            url = $"{host}{url}";
            return url;
        }
        private static void OpenBrowser(string? url)
        {
            try
            {
                if (url == null)
                    return;
                url = $"{url}?v={_clientVersion}";//加个参数更新浏览器缓存
                if (_hostPort != _defaultHostPort)
                {
                    url = $"{url}&p={_hostPort}";
                }
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(ex.ToString());
            }
        }
        private static bool CheckMutex()
        {
            try
            {
                //_mutex = new Mutex(true, "Livewallpaper", out bool ret);
                //兼容腾讯桌面，曲线救国...
                _mutex = new Mutex(true, "cxWallpaperEngineGlobalMutex", out bool ret);
                if (!ret)
                {
                    return false;
                }
                _mutex.ReleaseMutex();
                return true;
            }
            catch (Exception ex)
            {
                _logger.Error(ex);
                return false;
            }
            finally
            {
            }
        }
        private static async void ShowToastAndKillProcess()
        {
            await AppManager.ShowGuidToastAsync();
            //杀掉其他实例
            try
            {
                var ps = Process.GetProcessesByName("livewallpaper2");
                var cp = Process.GetCurrentProcess();
                foreach (var p in ps)
                {
                    if (p.Id == cp.Id)
                        continue;
                    p.Kill();
                }
            }
            catch (Exception)
            {

            }
            //Environment.Exit(0);
        }
        public static void OpenConfigFolder()
        {
            try
            {
                Process.Start("Explorer.exe", AppManager.ConfigDir);
            }
            catch (Exception ex)
            {
                _logger.Warn("OpenConfigFolder:" + ex);
                System.Windows.MessageBox.Show("OpenConfigFolder:" + ex);
            }
        }
        #endregion

    }
}
