using NLog;
using Player.Shared;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Media;
using System.Runtime.InteropServices;

namespace Player.Web
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
        List<string>? _playlist;
        int? _playIndex;
        IpcServer? _ipcServer;

        public MainWindow()
        {
            Left = -10000;
            Top = -1000;
            WindowStyle = WindowStyle.None;
            Background = Brushes.Transparent;
            InitializeComponent();
        }

        internal void Initlize(ArgsParser argsParser)
        {
            //MessageBox.Show("test");
            string? ipcServer = argsParser.Get("input-ipc-server");
            if (ipcServer == null)
                return;

            _ipcServer = new(ipcServer)
            {
                //_ipcServer.ReceivedMessage += IpcServer_ReceivedMessage;
                ReceivedMessageFunc = IpcServer_ReceivedMessage
            };
            _ipcServer.Start();
        }

        internal void Show(string? playlistPath)
        {
            if (playlistPath != null)
            {
                _playlist = File.ReadAllLines(playlistPath).ToList();
                _playIndex = 0;
            }

            if (_playlist == null || _playIndex == null || _playIndex >= _playlist.Count)
                return;

            webview2.Source = new Uri(_playlist[_playIndex.Value]);
            Show();

            ////尝试修复花屏
            //await Task.Delay(300);
            //media.Play();
        }

        protected override void OnClosed(EventArgs e)
        {
            //if (_ipcServer != null)
            //    _ipcServer.ReceivedMessage -= IpcServer_ReceivedMessage;
            _ipcServer?.Dispose();
            _ipcServer = null;
            base.OnClosed(e);
        }

        #region callback
        private IpcPayload IpcServer_ReceivedMessage(IpcPayload payload)
        {
            _logger.Info($"ReceivedMessage: {JsonSerializer.Serialize(payload)}");
            var res = new IpcPayload
            {
                RequestId = payload?.RequestId,
            };
            try
            {
                string[]? commands = payload?.Command.Select(m => m.ToString()).ToArray();
                string? command = commands?.Length > 0 ? commands[0] : null;
                string? para = commands?.Length > 1 ? commands[1] : null;
                switch (command)
                {
                    case "get_property":
                        switch (para)
                        {
                            case "duration":
                                break;
                            case "time-pos":
                                break;
                        }
                        break;
                    case "set_property":
                        switch (para)
                        {
                            case "pause":
                                bool pause = commands?[2] == "True";
                                //if (pause)
                                //    media.Pause();
                                //else
                                //    media.Play();
                                break;
                            case "mute":
                                break;
                            case "unmute":
                                break;
                            case "volume":
                                break;
                            case "percent-pos":
                                var percent = double.Parse(commands?[2] ?? "0");
                                break;
                            case "panscan":
                                break;
                        }
                        break;
                    case "stop":
                        //刷新桌面
                        webview2.Source = null;
                        SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, null, SPIF_UPDATEINIFILE);
                        Close();
                        break;
                    case "quit":
                        Close();
                        break;
                    case "loadlist":
                        Show(para);
                        break;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
                _logger.Error($"IpcServer_ReceivedMessage: {ex}");
            }
            return res;
        }

        #endregion

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        [return: MarshalAs(UnmanagedType.I4)]
        public static extern int SystemParametersInfo(uint uiAction, uint uiParam, string? pvParam, uint fWinIni);
        public static uint SPI_SETDESKWALLPAPER = 20;
        public static uint SPIF_UPDATEINIFILE = 0x1;

    }
}