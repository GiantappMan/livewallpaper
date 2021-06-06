using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;

namespace Giantapp.LiveWallpaper.Engine.VideoRenders
{
    public partial class MpvControl : UserControl
    {
        private Mpv.NET.Player.MpvPlayer _player;
        //private string _lastPath;
        private int _volume;

        public MpvControl()
        {
            InitializeComponent();
            //UI
            BackColor = Color.Magenta;
        }

        private IntPtr? _cacheHandle;
        public IntPtr GetHandle()
        {
            if (_cacheHandle == null)
                _cacheHandle = this.Handle;
            return _cacheHandle.Value;
        }

        public void Play(string path, bool hwdec = true, bool panscan = true)
        {
            if (_player == null)
            {
                var assembly = Assembly.GetEntryAssembly();
                string appDir = System.IO.Path.GetDirectoryName(assembly.Location);
                //仅使用32位
                string dllPath = $@"{appDir}\lib\mpv-1.dll";
                //if (IntPtr.Size == 4)
                //{
                //    // 32-bit
                //}
                //else if (IntPtr.Size == 8)
                //{
                //    // 64-bit
                //    dllPath = $@"{appDir}\lib\mpv-1-x64.dll";
                //}
                WallpaperApi.UIInvoke(() =>
                {
                    _player = new Mpv.NET.Player.MpvPlayer(GetHandle(), dllPath)
                    {
                        Loop = true,
                        Volume = 0
                    };

                    _player.AutoPlay = true;
                    //Play(_lastPath);
                });
            }

            if (string.IsNullOrEmpty(path))
                return;

            //_lastPath = path;

            if (panscan)
            {
                //防止视频黑边
                _player.API.SetPropertyString("panscan", "1.0");
            }
            else
            {
                _player.API.SetPropertyString("panscan", "0.0");
            }

            if (hwdec)
            {
                // 设置解码模式为自动，如果条件允许，MPV会启动硬件解码
                _player?.API.SetPropertyString("hwdec", "auto");
            }
            else
            {
                //软解，消耗cpu
                _player?.API.SetPropertyString("hwdec", "no");
            }
            //允许休眠
            _player?.API.SetPropertyString("stop-screensaver", "no");
            _player.Volume = _volume;

            _player?.Pause();
            _player?.Load(path);
            _player?.Resume();
        }

        public void Stop()
        {
            _player?.Stop();
        }

        public void DisposePlayer()
        {
            _player?.Dispose();
            _player = null;
        }

        public void Pause()
        {
            _player?.Pause();
        }

        public void Resum()
        {
            _player?.Resume();
        }

        public void SetVolume(int v)
        {
            if (v < 0)
                v = 0;
            if (v > 100)
                v = 100;

            _volume = v;
            if (_player != null)
                _player.Volume = v;
        }
    }
}
