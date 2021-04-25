using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Windows;
using System.Windows.Forms;

namespace LiveWallpaperEngineRender.Test
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        Process _process;

        public MainWindow()
        {
            InitializeComponent();
        }

        private void ButtonLaunch_Click(object sender, RoutedEventArgs e)
        {
            ProcessStartInfo start = new ProcessStartInfo
            {
                FileName = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "LiveWallpaperEngineRender.exe"),
                Arguments = "--WindowLeft -10000  --WindowTop -10000",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };

            _process = new Process
            {
                StartInfo = start,
                EnableRaisingEvents = true
            };

            _process.Exited += Proc_Exited;
            _process.OutputDataReceived += Proc_OutputDataReceived;
            _process.Start();
            _process.BeginOutputReadLine();
        }
        private void Proc_OutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            System.Diagnostics.Debug.WriteLine(e.Data);
            if (e.Data == null)
                return;
            var protocol = JsonSerializer.Deserialize<RenderProtocol>(e.Data);
            switch (protocol.Command)
            {
                case ProtocolDefinition.Initlized:
                    var payload = protocol.GetPayLoad<InitlizedPayload>();
                    break;
            }
        }

        private void Proc_Exited(object sender, EventArgs e)
        {
        }

        private void ButtonPlay_Click(object sender, RoutedEventArgs e)
        {
            SendToRender(new RenderProtocol(new PlayVideoPayload()
            {
                FilePath = @"D:\gitee\LiveWallpaper\LiveWallpaperEngineAPI.Samples.NetCore.Test\WallpaperSamples\video.mp4",
                Screen = new string[] { Screen.PrimaryScreen.DeviceName },
            })
            {
                Command = ProtocolDefinition.PlayVideo
            });
        }

        private void SendToRender(RenderProtocol renderProtocol)
        {
            var json = JsonSerializer.Serialize(renderProtocol);
            _process.StandardInput.WriteLine(json);
        }

        private void ButtonStop_Click(object sender, RoutedEventArgs e)
        {
            SendToRender(new RenderProtocol(new PlayVideoPayload()
            {
                Screen = new string[] { Screen.PrimaryScreen.DeviceName },
            })
            {
                Command = ProtocolDefinition.StopVideo
            });
        }
    }
}
