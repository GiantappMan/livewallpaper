using CefSharp;
using CefSharp.WinForms;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaperEngineWebRender
{

    public partial class BrowserForm : Form
    {
        private static List<BrowserForm> _allForms = new List<BrowserForm>();

        private readonly ChromiumWebBrowser browser;
        public BrowserForm(string url, int x, int y)
        {
            InitializeComponent();
            Location = new Point(x, y);
            Width = Screen.PrimaryScreen.Bounds.Width;
            Height = Screen.PrimaryScreen.Bounds.Height;
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;

            browser = new ChromiumWebBrowser(url);
            browser.MenuHandler = new MenuHanlder();

            Text = $"WebRender {url}";

            Controls.Add(browser);

            _allForms.Add(this);

            browser.IsBrowserInitializedChanged += Browser_IsBrowserInitializedChanged;
            //MouseMove += BrowserForm_MouseMove;
        }

        private void Browser_IsBrowserInitializedChanged(object sender, EventArgs e)
        {
            //browser.ShowDevTools();
            //var test = browser.GetBrowserHost().GetOpenerWindowHandle();
            Invoke((Action)(() =>
            {
                Text += $" cef={browser.GetBrowserHost().GetWindowHandle()}";
            }));
        }

        private void BrowserForm_MouseMove(object sender, MouseEventArgs e)
        {
            System.Diagnostics.Debug.WriteLine($"x:{e.X},y:{e.Y}");
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            _allForms.Remove(this);
            base.OnClosing(e);
            if (_allForms.Count == 0)
                Application.Exit();
        }
    }
}
