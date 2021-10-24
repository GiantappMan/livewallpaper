using LiveWallpaper.LocalServer;
using Microsoft.Web.WebView2.Core;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaper.Forms
{
    public partial class MainForm : Form
    {
        private bool browserInit = false;
        private readonly string downloadUrl = null;
        public MainForm()
        {
            InitializeComponent();
            StartPosition = FormStartPosition.CenterScreen;
            downloadUrl = $"{AppContext.GetLocalHosst()}MicrosoftEdgeWebview2Setup.exe";
            panel_tips.Visible = false;
            try
            {
                var version = CoreWebView2Environment.GetAvailableBrowserVersionString();
            }
            catch (WebView2RuntimeNotFoundException)
            {
                //Handle the runtime not being installed.
                //exception.Message` is very nicely specific: It (currently at least) says "Couldn't find a compatible Webview2 Runtime installation to host WebViews."
                ShowTips();
            }
        }

        private async void ShowTips()
        {
            label_tips.Text = await AppManager.GetText("common.installWebview2Tips");
            webview2link.Text = downloadUrl;
            panel_tips.Visible = true;
        }

        internal async void Open(string url)
        {
            try
            {
                if (!browserInit)
                {
                    var webView2Environment = await CoreWebView2Environment.CreateAsync(null, AppManager.CacheDir);
                    await webView2.EnsureCoreWebView2Async(webView2Environment);
                    browserInit = true;
                }
                var uri = new Uri(url);
                if (webView2.Source != null && webView2.Source.AbsoluteUri == uri.AbsoluteUri)
                    return;
                webView2.Source = uri;
            }
            catch (Exception)
            {
            }
        }

        private void Webview2link_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
        {
            try
            {
                //string url = "https://developer.microsoft.com/MicrosoftEdgeWebview2Setup.exe";
                Process.Start(new ProcessStartInfo(downloadUrl) { UseShellExecute = true });
                webview2link.LinkVisited = true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }
    }
}
