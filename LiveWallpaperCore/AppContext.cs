using LiveWallpaperCore.LocalServer;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaperCore
{
    public class AppContext : ApplicationContext
    {
        private NotifyIcon notifyIcon;
        private ContextMenuStrip contextMenu;
        //private ToolStripLabel programText;
        private ToolStripMenuItem btnMainUI;
        private ToolStripMenuItem btnExit;
        private System.ComponentModel.IContainer components;

        public AppContext()
        {
            InitializeAppContextComponent();
        }

        private void InitializeAppContextComponent()
        {
            components = new System.ComponentModel.Container();
            contextMenu = new ContextMenuStrip();

            btnMainUI = new ToolStripMenuItem()
            {
                Text = "主界面"
            };
            btnMainUI.Click += BtnMainUI_Click;
            contextMenu.Items.Add(btnMainUI);

            btnExit = new ToolStripMenuItem
            {
                Text = "退出",
            };
            btnExit.Click += BtnExit_Click;
            contextMenu.Items.Add(btnExit);

            notifyIcon = new NotifyIcon(components)
            {
                Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location),
                ContextMenuStrip = contextMenu,
                Text = "巨应壁纸",
                Visible = true
            };

            notifyIcon.MouseClick += new MouseEventHandler(NotifyIcon_MouseClick);

            Task.Run(() =>
              {
                  int port = FreeTcpPort();
                  string url = $"http://localhost:{port}/";
                  ServerWrapper.Start($"--urls={url}");
              });
        }

        static int FreeTcpPort()
        {
            TcpListener l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            int port = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return port;
        }

        private void BtnMainUI_Click(object sender, EventArgs e)
        {

        }

        private void NotifyIcon_MouseClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                MethodInfo mi = typeof(NotifyIcon).GetMethod("ShowContextMenu",
                 BindingFlags.Instance | BindingFlags.NonPublic);
                mi.Invoke(notifyIcon, null);
            }
        }

        private void BtnExit_Click(object Sender, EventArgs e)
        {
            notifyIcon.Icon.Dispose();
            notifyIcon.Dispose();
            Application.Exit();
        }
    }
}
