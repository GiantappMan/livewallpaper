using Player.Shared;
using System.Windows;

namespace Player.Video;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    ArgsParser? _argsParser;
    protected override void OnStartup(StartupEventArgs e)
    {
        _argsParser = new ArgsParser(e.Args);

        var window = new MainWindow();

        var playlist = _argsParser.Get("playlist");

        window.Initlize(_argsParser);
        window.Show(playlist);
    }
}
