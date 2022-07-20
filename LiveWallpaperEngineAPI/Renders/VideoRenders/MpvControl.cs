using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;

namespace Giantapp.LiveWallpaper.Engine.VideoRenders
{
    public partial class MpvControl
    {
        private Mpv.NET.Player.MpvPlayer _player;
        private int _volume;

        public MpvControl()
        {
        }


        public void Play(IntPtr renderHandle, string path, bool hwdec = true, bool panscan = true)
        {
            if (_player == null)
            {
                var assembly = Assembly.GetEntryAssembly();
                string appDir = System.IO.Path.GetDirectoryName(assembly.Location);
                string dllPath = $@"{appDir}\lib\mpv-2.dll";
                //if (IntPtr.Size == 4)
                //{
                //    // 32-bit
                //}
                //if (IntPtr.Size == 8)
                //{
                //    // 64-bit
                //    dllPath = $@"{appDir}\lib\mpv-1-x64.dll";
                //}
                WallpaperApi.InvokeIfRequired(() =>
                {
                    _player = new Mpv.NET.Player.MpvPlayer(renderHandle, dllPath)
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
                _player?.API.SetPropertyString("panscan", "1.0");
            }
            else
            {
                _player?.API.SetPropertyString("panscan", "0.0");
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
