using Newtonsoft.Json;
using NLog;
using Player.Shared;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace Player.Video;

public class MpvRequest
{
    [JsonProperty("command")]
    public object[]? Command { get; set; }
    [JsonProperty("request_id")]
    public string? RequestId { get; set; }
}
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

        _ipcServer = new IpcServer(ipcServer);
        _ipcServer.ReceivedMessage += IpcServer_ReceivedMessage;
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
        if (_ipcServer != null)
            _ipcServer.ReceivedMessage -= IpcServer_ReceivedMessage;
        _ipcServer?.Dispose();
        _ipcServer = null;
        base.OnClosed(e);
    }

    #region callback
    private void IpcServer_ReceivedMessage(object sender, string e)
    {
        _logger.Info($"ReceivedMessage: {e}");
        try
        {
            var test = JsonConvert.DeserializeObject<MpvRequest>(e);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine(ex.Message);
        }
    }

    private void Media_MediaEnded(object sender, RoutedEventArgs e)
    {
        media.Position = TimeSpan.Zero;
        media.Play();
    }
    #endregion

}