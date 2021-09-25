using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.Forms;
using LiveWallpaper.LocalServer;
using NLog;
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Threading;

namespace LiveWallpaper
{
    public class AppContext : ApplicationContext
    {
        #region ui
        private NotifyIcon _notifyIcon;
        private ContextMenuStrip _contextMenu;
        private ToolStripMenuItem _btnAbount;
        private ToolStripMenuItem _btnOffline;
        private ToolStripMenuItem _btnMainUIWeb;
        private ToolStripMenuItem _btnCommunity;
        private ToolStripMenuItem _btnSetting;
        private ToolStripMenuItem _btnExit;
        private System.ComponentModel.IContainer _components;
        //private MainWindow _mainWindow = null;
        #endregion

        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
        private static readonly LanService _lanService = new LanService();
        private static Dispatcher _uiDispatcher;
        private static Mutex _mutex;
        private static MainForm _mainForm = null;

        private static int _hostPort;

        public AppContext()
        {
            _hostPort = GetPort();

            _uiDispatcher = Dispatcher.CurrentDispatcher;
            InitializeUI();

            WallpaperApi.Initlize(_uiDispatcher);
            AppManager.CultureChanged += LanService_CultureChanged;
            SetMenuText();
            _ = Task.Run(() =>
            {
                ServerWrapper.Start(_hostPort);
            });
            CheckMutex();
        }

        private async void CheckMutex()
        {
            try
            {
                //_mutex = new Mutex(true, "Livewallpaper", out bool ret);
                //兼容腾讯桌面，曲线救国...
                _mutex = new Mutex(true, "cxWallpaperEngineGlobalMutex", out bool ret);
                if (!ret)
                {
                    _notifyIcon.ShowBalloonTip(5, await GetText("common.information"), await GetText("client.started"), ToolTipIcon.Info);
                    Environment.Exit(0);
                    return;
                }
            }
            catch (Exception ex)
            {
                _logger.Error(ex);
            }
            finally
            {
                _mutex.ReleaseMutex();
            }
        }

        private void InitializeUI()
        {
            _components = new System.ComponentModel.Container();
            _contextMenu = new ContextMenuStrip();

            _btnAbount = new ToolStripMenuItem();
            _btnAbount.Click += BtnAbount_Click;
            _contextMenu.Items.Add(_btnAbount);
            _contextMenu.Items.Add(new ToolStripSeparator());

            _btnOffline = new ToolStripMenuItem();
            _btnOffline.Click += BtnOffline_Click;
            _contextMenu.Items.Add(_btnOffline);

            _contextMenu.Items.Add(new ToolStripSeparator());

            _btnCommunity = new ToolStripMenuItem();
            _btnCommunity.Click += BtnCommunity_Click;
            _contextMenu.Items.Add(_btnCommunity);

            _btnMainUIWeb = new ToolStripMenuItem();
            _btnMainUIWeb.Click += BtnMainUIWeb_Click;
            _contextMenu.Items.Add(_btnMainUIWeb);

            _btnSetting = new ToolStripMenuItem();
            _btnSetting.Click += BtnSetting_Click;
            string dir = Path.GetDirectoryName(Application.ExecutablePath);
            string imgPath = Path.Combine(dir, "Assets", "setting.png");
            _btnSetting.Image = Image.FromFile(imgPath);
            _contextMenu.Items.Add(_btnSetting);

            _contextMenu.Items.Add(new ToolStripSeparator());

            _btnExit = new ToolStripMenuItem();
            _btnExit.Click += BtnExit_Click;
            _contextMenu.Items.Add(_btnExit);

            _notifyIcon = new NotifyIcon(_components)
            {
                Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location),
                ContextMenuStrip = _contextMenu,
                Visible = true
            };

            _notifyIcon.MouseDoubleClick += NotifyIcon_MouseDoubleClick;
            _notifyIcon.MouseClick += new MouseEventHandler(NotifyIcon_MouseClick);
        }


        private void SetMenuText()
        {
            _ = _uiDispatcher.Invoke(async () =>
              {
                  _btnAbount.Text = await GetText("common.about");
                  _btnCommunity.Text = await GetText("wallpapers.title");
                  _btnOffline.Text = await GetText("client.offline");
                  _btnMainUIWeb.Text = await GetText("local.title");
                  _btnExit.Text = await GetText("client.exit");
                  _btnSetting.Text = await GetText("common.settings");
                  _notifyIcon.Text = await GetText("common.appName");
              });
        }

        internal static async Task<string> GetText(string key)
        {
            if (AppManager.UserSetting == null)
            {
                await AppManager.LoadUserSetting();
            }
            string culture = AppManager.UserSetting.General.CurrentLan ?? Thread.CurrentThread.CurrentCulture.Name;
            var r = await _lanService.GetTextAsync(key, culture);
            return r;
        }

        private void LanService_CultureChanged(object sender, EventArgs e)
        {
            SetMenuText();
        }

        /// <summary>
        /// 获取可用端口
        /// </summary>
        /// <returns></returns>
        static int GetPort()
        {
            //#if DEBUG
            return 5001;
            //#endif
            //TcpListener l = new TcpListener(IPAddress.Loopback, 0);
            //l.Start();
            //int port = ((IPEndPoint)l.LocalEndpoint).Port;
            //l.Stop();
            //return port;
        }

        private void BtnAbount_Click(object sender, EventArgs e)
        {
            InnerOpenUrl("https://www.giantapp.cn/post/products/livewallpaperv2/");
        }

        private void BtnCommunity_Click(object sender, EventArgs e)
        {
            OpenUrl("/wallpapers");
        }

        private void BtnOffline_Click(object sender, EventArgs e)
        {
            OpenUrl("", $"http://localhost:{_hostPort}/offline/");
        }

        private void BtnMainUIWeb_Click(object sender, EventArgs e)
        {
            string url = GetUrl("", $"http://localhost:{_hostPort}/offline/");
            OpenLocalView(url);
        }

        private async void OpenLocalView(string url)
        {
            if (_mainForm == null)
            {
                _mainForm = new MainForm();
                _mainForm.Text = await GetText("common.appName");
                _mainForm.FormClosed += _mainForm_FormClosed;
                _mainForm.Show();
            }
            else
                _mainForm.Activate();

            if (_mainForm.WindowState == FormWindowState.Minimized)
                _mainForm.WindowState = FormWindowState.Normal;

            _mainForm.Open(url);
        }

        private void MainWindow_Closed(object sender, EventArgs e)
        {
            //_mainWindow.Closed -= MainWindow_Closed;
            //_mainWindow = null;
        }

        private void BtnSetting_Click(object sender, EventArgs e)
        {
            string url = GetUrl("/setting", $"http://localhost:{_hostPort}/offline/");
            OpenLocalView(url);
        }

        private static string GetUrl(string url, string host)
        {
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
                        url = url.Substring(1);
                    break;
                default:
                    url = $"{lan}{url}";
                    break;
            }

            url = $"{host}{url}";
            return url;
        }

        private static void OpenUrl(string url, string host = "https://livewallpaper.giantapp.cn/")
        {
            string r = GetUrl(url, host);
            InnerOpenUrl(r);
        }

        private static void InnerOpenUrl(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString());
            }
        }

        private void NotifyIcon_MouseClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                MethodInfo mi = typeof(NotifyIcon).GetMethod("ShowContextMenu",
                 BindingFlags.Instance | BindingFlags.NonPublic);
                mi.Invoke(_notifyIcon, null);
            }
        }

        private void NotifyIcon_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            //MethodInfo mi = typeof(NotifyIcon).GetMethod("ShowContextMenu",
            //       BindingFlags.Instance | BindingFlags.NonPublic);
            //mi.Invoke(_notifyIcon, null);          
            string url = GetUrl("", $"http://localhost:{_hostPort}/offline/");
            OpenLocalView(url);
        }

        private void _mainForm_FormClosed(object sender, FormClosedEventArgs e)
        {
            _mainForm.FormClosed -= _mainForm_FormClosed;
            _mainForm = null;
        }

        private void BtnExit_Click(object Sender, EventArgs e)
        {
            _notifyIcon.Icon.Dispose();
            _notifyIcon.Dispose();
            Application.Exit();
        }
    }
}
