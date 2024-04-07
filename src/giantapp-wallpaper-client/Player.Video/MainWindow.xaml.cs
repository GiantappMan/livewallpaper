using Player.Shared;
using System.IO;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Player.Video;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    List<string>? _playlist;
    int? _playIndex;

    public MainWindow()
    {
        InitializeComponent();
    }

    internal void ApplySetting(ArgsParser argsParser)
    {
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

    private void Media_MediaEnded(object sender, RoutedEventArgs e)
    {
        media.Position = TimeSpan.Zero;
        media.Play();
    }
}