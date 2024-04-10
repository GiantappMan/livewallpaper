using NLog;
using Player.Shared;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Linq;

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
        media.Stretch = panscan == "1.0" ? Stretch.Fill : Stretch.UniformToFill;

        string windowMinimized = argsParser.Get("window-minimized") ?? "yes";
        if (windowMinimized == "yes")
            WindowState = WindowState.Minimized;

        //不能隐藏，隐藏后找不到窗口句柄
        //ShowInTaskbar = false;
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

        media.Source = new Uri(_playlist[_playIndex.Value]);
        Show();
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
            string? command = commands?[0];
            switch(command)
            {
                case "get_property":
                    string? para = commands?[1];
                    switch(para)
                    {
                        case "duration":
                            res.Data = media.NaturalDuration.TimeSpan.TotalSeconds.ToString();
                            break;
                        case "time-pos":
                            res.Data = media.Position.TotalSeconds.ToString();
                            break;
                    }
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

}