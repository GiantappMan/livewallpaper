using System;
using System.Diagnostics;
using System.IO;
using System.Windows;

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
        }

        private void Proc_Exited(object sender, EventArgs e)
        {
        }

        private void ButtonPlay_Click(object sender, RoutedEventArgs e)
        {
            _process.StandardInput.WriteLine("ssssd");
        }
    }
}
