using Client.Libs;
using NLog;
using Player.Shared;
using System.Windows;

namespace Player.Video;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    #region filed
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    #endregion

    ArgsParser? _argsParser;
    protected override void OnStartup(StartupEventArgs e)
    {
        NLogHelper.Init("LiveWallpaper3_VideoPlayer");

        _argsParser = new ArgsParser(e.Args);

        _logger.Info($"Start {string.Join(" ", e.Args)}");

        var window = new MainWindow();

        var playlist = _argsParser.Get("playlist");

        window.Initlize(_argsParser);
        window.Show(playlist);
    }
}
