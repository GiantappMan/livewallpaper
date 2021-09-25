using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaper.Forms
{
    public partial class MainForm : Form
    {
        public MainForm()
        {
            InitializeComponent();
            //todo 没装浏览器，显示下载链接
        }

        internal void Open(string url)
        {
            var uri = new Uri(url);
            if (webView2.Source != null && webView2.Source.AbsoluteUri == uri.AbsoluteUri)
                return;
            webView2.Source = uri;
        }
    }
}
