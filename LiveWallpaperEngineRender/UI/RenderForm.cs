using System;
using System.Drawing;
using System.Windows.Forms;

namespace LiveWallpaperEngineRender
{
    public partial class RenderForm : Form
    {
        private MpvControl _mpv;

        public RenderForm()
        {
            InitializeComponent();
            //UI
            BackColor = Color.Magenta;
            TransparencyKey = Color.Magenta;
            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.None;
            //Opacity = 0;
        }

        internal void PlayVideo(string filePath, bool hardwareDecoding, int volume, bool panscan)
        {
            if (_mpv == null)
            {
                _mpv = new MpvControl();
                ShowControl(_mpv);
            }

            _mpv.SetVolume(volume);

            _mpv.Play(filePath, hardwareDecoding, panscan);
        }

        internal void StopVideo()
        {
            _mpv?.Stop();
        }

        internal void PauseVideo()
        {
            _mpv?.Pause();
        }

        internal void ResumeVideo()
        {
            _mpv?.Resum();
        }
        internal void SetVolume(int volume)
        {
            _mpv.SetVolume(volume);
        }
        private void ShowControl(Control control)
        {
            Util.InvokeIfRequired(() =>
            {
                Controls.Clear();
                control.Dock = DockStyle.Fill;
                Controls.Add(control);
                Opacity = 1;
                Refresh();
            });
        }
    }
}
