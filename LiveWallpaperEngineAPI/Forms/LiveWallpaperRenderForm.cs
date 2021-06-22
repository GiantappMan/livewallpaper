using Giantapp.LiveWallpaper.Engine.Utils;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using WinAPI;

namespace Giantapp.LiveWallpaper.Engine.Forms
{
    /// <summary>
    /// 显示壁纸根窗体
    /// </summary>
    public partial class LiveWallpaperRenderForm : Form
    {
        static readonly Dictionary<string, LiveWallpaperRenderForm> _hosts = new();
        readonly string _screenName;
        IntPtr lastWallpaperHandle;

        public LiveWallpaperRenderForm(string screenName)
        {
            InitializeComponent();
            Text = "RenderHost" + screenName;
            _screenName = screenName;
            //UI
            BackColor = Color.Magenta;
            TransparencyKey = Color.Magenta;
            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.None;
            //Opacity = 0;
            _hosts[screenName] = this;
        }

        private IntPtr? _cacheHandle;
        public IntPtr GetHandle()
        {
            if (_cacheHandle == null)
            {
                WallpaperApi.InvokeIfRequired(() =>
                {
                    _cacheHandle = Handle;
                });
            }
            return _cacheHandle.Value;
        }

        //internal void ShowWallpaper()
        //{
        //    //WallpaperApi.InvokeIfRequired(() =>
        //    //{
        //    //    Controls.Clear();
        //    //    //Opacity = 1;
        //    //    Refresh();
        //    //});

        //    IntPtr hostForm = GetHandle();

        //    var wpHelper = WallpaperHelper.GetInstance(_screenName);
        //    //hostfrom下潜桌面
        //    wpHelper.SendToBackground(hostForm);
        //}

        internal void ShowWallpaper(IntPtr wallpaperHandle)
        {
            if (lastWallpaperHandle == wallpaperHandle)
                return;

            lastWallpaperHandle = wallpaperHandle;

            IntPtr hostForm = GetHandle();
            WallpaperApi.InvokeIfRequired(() =>
            {
                Controls.Clear();
                Refresh();
            });

            var wpHelper = WallpaperHelper.GetInstance(_screenName);
            //hostfrom下潜桌面
            wpHelper.SendToBackground(hostForm);
            //壁纸parent改为hostform
            User32Wrapper.SetParent(wallpaperHandle, hostForm);
            //把壁纸全屏铺满 hostform
            WallpaperHelper.FullScreen(wallpaperHandle, wpHelper.TargetBounds, hostForm);
            //WallpaperHelper.FullScreen(wallpaperHandle, hostForm);        
        }

        public static LiveWallpaperRenderForm GetHost(string screen, bool autoCreate = true)
        {
            if (!_hosts.ContainsKey(screen))
            {
                if (autoCreate)
                    WallpaperApi.InvokeIfRequired(() =>
                    {
                        var host = _hosts[screen] = new LiveWallpaperRenderForm(screen);
                        host.Show();
                        var wpHelper = WallpaperHelper.GetInstance(screen);
                        //hostfrom下潜桌面
                        wpHelper.SendToBackground(host.GetHandle());
                    });
            }

            if (_hosts.ContainsKey(screen))
                return _hosts[screen];
            else
                return null;
        }

        #region private

        #endregion
    }
}
