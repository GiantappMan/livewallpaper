using Mpv.NET.Player;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaperEngineLib.Controls
{
    public partial class RenderForm : Form
    {
        private MpvPlayer player;

        public RenderForm()
        {
            BackColor = Color.Magenta;
            TransparencyKey = Color.Magenta;
            InitializeComponent();
            FormBorderStyle = FormBorderStyle.None;
            string appDir = System.IO.Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            player = new MpvPlayer(this.Handle, $@"{appDir}\lib\mpv-1.dll")
            {
                Loop = true,
                Volume = 0
            };
            //var test = player.API.GetPropertyString("video-aspect");
            //player.API.SetPropertyString("video-aspect", "1:1");

            FormClosing += RenderForm_FormClosing;

            //处理alt+tab可以看见本程序
            //https://stackoverflow.com/questions/357076/best-way-to-hide-a-window-from-the-alt-tab-program-switcher

            //int exStyle = (int)GetWindowLong(this.Handle, (int)GetWindowLongFields.GWL_EXSTYLE);

            //exStyle |= (int)ExtendedWindowStyles.WS_EX_TOOLWINDOW;
            //SetWindowLong(this.Handle, (int)GetWindowLongFields.GWL_EXSTYLE, (IntPtr)exStyle);
        }

        private void RenderForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            FormClosing -= RenderForm_FormClosing;
            if (player != null)
                player.Dispose();
        }

        private Wallpaper _wallpaper;

        public Wallpaper Wallpaper
        {
            get => _wallpaper;
            set
            {
                _wallpaper = value;
                if (value != null)
                {
                    if (player != null)
                    {
                        player.Pause();
                        player.Load(value.AbsolutePath);
                        player.Resume();
                    }
                }
                else
                {
                    if (player != null)
                        player.Stop();
                }
            }
        }

        internal void Mute(bool mute)
        {
            if (player != null)
                player.Volume = mute ? 0 : 100;
        }

        internal void Pause()
        {
            if (player != null)
                player.Pause();
        }

        internal void Resume()
        {
            if (player != null)
                player.Resume();
        }


        #region Window styles

        [Flags]
        public enum ExtendedWindowStyles
        {
            // ...
            WS_EX_TOOLWINDOW = 0x00000080,
            // ...
        }

        public enum GetWindowLongFields
        {
            // ...
            GWL_EXSTYLE = (-20),
            // ...
        }

        [DllImport("user32.dll")]
        public static extern IntPtr GetWindowLong(IntPtr hWnd, int nIndex);

        public static IntPtr SetWindowLong(IntPtr hWnd, int nIndex, IntPtr dwNewLong)
        {
            int error = 0;
            IntPtr result = IntPtr.Zero;
            // Win32 SetWindowLong doesn't clear error on success
            SetLastError(0);

            if (IntPtr.Size == 4)
            {
                // use SetWindowLong
                Int32 tempResult = IntSetWindowLong(hWnd, nIndex, IntPtrToInt32(dwNewLong));
                error = Marshal.GetLastWin32Error();
                result = new IntPtr(tempResult);
            }
            else
            {
                // use SetWindowLongPtr
                result = IntSetWindowLongPtr(hWnd, nIndex, dwNewLong);
                error = Marshal.GetLastWin32Error();
            }

            if ((result == IntPtr.Zero) && (error != 0))
            {
                throw new System.ComponentModel.Win32Exception(error);
            }

            return result;
        }

        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)]
        private static extern IntPtr IntSetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        [DllImport("user32.dll", EntryPoint = "SetWindowLong", SetLastError = true)]
        private static extern Int32 IntSetWindowLong(IntPtr hWnd, int nIndex, Int32 dwNewLong);

        private static int IntPtrToInt32(IntPtr intPtr)
        {
            return unchecked((int)intPtr.ToInt64());
        }

        [DllImport("kernel32.dll", EntryPoint = "SetLastError")]
        public static extern void SetLastError(int dwErrorCode);


        #endregion
    }
}
