using NLog;
using Player.Shared;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Linq;
using System.Runtime.InteropServices;

namespace Player.Video;

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

        media.LoadedBehavior = MediaState.Manual;

        string panscan = argsParser.Get("panscan") ?? "1.0";
        media.Stretch = panscan == "1.0" ? Stretch.Fill : Stretch.Uniform;

        string windowMinimized = argsParser.Get("window-minimized") ?? "yes";
        //if (windowMinimized == "yes")
        //    WindowState = WindowState.Minimized;

        double volume = double.Parse(argsParser.Get("volume") ?? "0") / 100;
        media.Volume = volume;

        //不能隐藏，隐藏后找不到窗口句柄
        //ShowInTaskbar = false;
    }

    internal async void Show(string? playlistPath)
    {
        if (playlistPath != null)
        {
            _playlist = File.ReadAllLines(playlistPath).ToList();
            _playIndex = 0;
        }

        if (_playlist == null || _playIndex == null || _playIndex >= _playlist.Count)
            return;

        media.Source = new Uri(_playlist[_playIndex.Value]);
        Show();

        //尝试修复花屏
        await Task.Delay(300);
        media.Play();
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
                            res.Data = media.NaturalDuration.TimeSpan.TotalSeconds.ToString();
                            break;
                        case "time-pos":
                            res.Data = media.Position.TotalSeconds.ToString();
                            break;
                    }
                    break;
                case "set_property":
                    switch (para)
                    {
                        case "pause":
                            bool pause = commands?[2] == "True";
                            if (pause)
                                media.Pause();
                            else
                                media.Play();
                            break;
                        case "mute":
                            media.IsMuted = true;
                            break;
                        case "unmute":
                            media.IsMuted = false;
                            break;
                        case "volume":
                            media.Volume = double.Parse(commands?[2] ?? "0") / 100;
                            break;
                        case "percent-pos":
                            var percent = double.Parse(commands?[2] ?? "0");
                            media.Position = TimeSpan.FromSeconds(media.NaturalDuration.TimeSpan.TotalSeconds * percent / 100);
                            break;
                    }
                    break;
                case "stop":
                    media.Stop();
                    //刷新桌面
                    media.Source = null;
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

    private void Media_MediaEnded(object sender, RoutedEventArgs e)
    {
        media.Position = TimeSpan.Zero;
        media.Play();
    }
    #endregion

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    [return: MarshalAs(UnmanagedType.I4)]
    public static extern Int32 SystemParametersInfo(UInt32 uiAction, UInt32 uiParam, String? pvParam, UInt32 fWinIni);
    public static UInt32 SPI_SETDESKWALLPAPER = 20;
    public static UInt32 SPIF_UPDATEINIFILE = 0x1;
}