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
        private ToolStripMenuItem _btnLocalWallpaper;
        private ToolStripMenuItem _btnCommunity;
        private ToolStripMenuItem _btnSetting;
        private ToolStripMenuItem _btnExit;
        private System.ComponentModel.IContainer _components;
        //private MainWindow _mainWindow = null;
        #endregion

        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
        private static Dispatcher _uiDispatcher;
        private static Mutex _mutex;
        private static MainForm _mainForm = null;
        private static string _clientVersion;

        private static int _hostPort;

        public AppContext()
        {
            bool ok = CheckMutex();
            if (!ok)
            {
                ShowToastAndExit();
                return;
            }
            Init();
        }

        private void Init()
        {
            InitializeUI();
            var version = Assembly.GetEntryAssembly().GetName().Version;
            _clientVersion = version.ToString();
            _hostPort = GetPort();
            _uiDispatcher = Dispatcher.CurrentDispatcher;

            WallpaperApi.Initlize(_uiDispatcher);
            AppManager.CultureChanged += LanService_CultureChanged;
            SetMenuText();
            _ = Task.Run(() =>
            {
                ServerWrapper.Start(_hostPort);
            });
        }

        internal static string GetLocalHosst()
        {
            return $"http://localhost:{_hostPort}/";
        }

        private static async void ShowToastAndExit()
        {
            await AppManager.ShowGuidToastAsync();
            //string title = await AppManager.GetText("client.started");
            //string desc = await AppManager.GetText("common.information");
            //var toastContent = new ToastContent()
            //{
            //    Visual = new ToastVisual()
            //    {
            //        BindingGeneric = new ToastBindingGeneric()
            //        {
            //            Children =
            //                        {
            //                            new AdaptiveText()
            //                            {
            //                                Text =  title
            //                            },
            //                            new AdaptiveText()
            //                            {
            //                                Text =desc
            //                            }
            //                        }
            //        }
            //    }
            //};

            //var toastNotif = new ToastNotification(toastContent.GetXml());
            //ToastNotificationManagerCompat.CreateToastNotifier().Show(toastNotif);
            Environment.Exit(0);
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

        private void InitializeUI()
        {
            string dir = Path.GetDirectoryName(Application.ExecutablePath);
            string settingImage = Path.Combine(dir, "Assets", "setting.png");
            string webImage = Path.Combine(dir, "Assets", "web.png");
            string windowImage = Path.Combine(dir, "Assets", "window.png");
            string exitImage = Path.Combine(dir, "Assets", "exit.png");

            _components = new System.ComponentModel.Container();
            _contextMenu = new ContextMenuStrip();

            _btnAbount = new ToolStripMenuItem
            {
                //Image = Image.FromFile(webImage)
            };
            _btnAbount.Click += BtnAbount_Click;
            _contextMenu.Items.Add(_btnAbount);
            _contextMenu.Items.Add(new ToolStripSeparator());

            _btnOffline = new ToolStripMenuItem();
            //_btnOffline.Click += BtnOffline_Click;
            //_contextMenu.Items.Add(_btnOffline);

            //_contextMenu.Items.Add(new ToolStripSeparator());

            _btnCommunity = new ToolStripMenuItem
            {
                Image = Image.FromFile(webImage)
            };
            _btnCommunity.Click += BtnCommunity_Click;
            _contextMenu.Items.Add(_btnCommunity);

            _btnLocalWallpaper = new ToolStripMenuItem
            {
                Image = Image.FromFile(windowImage)
            };
            _btnLocalWallpaper.Click += BtnMainUIWeb_Click;
            _contextMenu.Items.Add(_btnLocalWallpaper);

            _btnSetting = new ToolStripMenuItem();
            _btnSetting.Click += BtnSetting_Click;

            _btnSetting.Image = Image.FromFile(settingImage);
            _contextMenu.Items.Add(_btnSetting);

            _contextMenu.Items.Add(new ToolStripSeparator());

            _btnExit = new ToolStripMenuItem
            {
                Image = Image.FromFile(exitImage)
            };
            _btnExit.Click += BtnExit_Click;
            _contextMenu.Items.Add(_btnExit);

            _notifyIcon = new NotifyIcon(_components)
            {
                Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location),
                ContextMenuStrip = _contextMenu,
                Visible = true
            };

            _notifyIcon.MouseDoubleClick += NotifyIcon_MouseDoubleClick;
            //_notifyIcon.MouseClick += new MouseEventHandler(NotifyIcon_MouseClick);
        }


        private void SetMenuText()
        {
            _ = _uiDispatcher.Invoke(async () =>
              {
                  _btnAbount.Text = await AppManager.GetText("common.about");
                  _btnCommunity.Text = await AppManager.GetText("wallpapers.title");
                  _btnOffline.Text = await AppManager.GetText("client.offline");
                  _btnLocalWallpaper.Text = await AppManager.GetText("local.title");
                  _btnExit.Text = await AppManager.GetText("client.exit");
                  _btnSetting.Text = await AppManager.GetText("common.settings");
                  _notifyIcon.Text = await AppManager.GetText("common.appName");
              });
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
            string url = GetUrl("", GetLocalHosst());
            OpenLocalView(url);
        }

        private void BtnMainUIWeb_Click(object sender, EventArgs e)
        {
            string url = GetUrl("", GetLocalHosst());
            OpenLocalView(url);
        }

        private async void OpenLocalView(string url)
        {
            if (_mainForm == null)
            {
                _mainForm = new MainForm
                {
                    Text = await AppManager.GetText("common.appName")
                };
                _mainForm.FormClosed += MainForm_FormClosed;
                _mainForm.Show();
            }
            else
                _mainForm.Activate();

            if (_mainForm.WindowState == FormWindowState.Minimized)
                _mainForm.WindowState = FormWindowState.Normal;

            url = $"{url}?v={_clientVersion}";//加个参数更新浏览器缓存
            _mainForm.Open(url);
        }

        private void MainWindow_Closed(object sender, EventArgs e)
        {
            //_mainWindow.Closed -= MainWindow_Closed;
            //_mainWindow = null;
        }

        private void BtnSetting_Click(object sender, EventArgs e)
        {
            string url = GetUrl("/setting", GetLocalHosst());
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
                        url = url[1..];
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
                url = $"{url}?v={_clientVersion}";//加个参数更新浏览器缓存
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
            BtnMainUIWeb_Click(null, null);
        }

        private void MainForm_FormClosed(object sender, FormClosedEventArgs e)
        {
            _mainForm.FormClosed -= MainForm_FormClosed;
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
