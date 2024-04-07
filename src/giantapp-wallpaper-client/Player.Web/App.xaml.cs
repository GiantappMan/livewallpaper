using Client.Libs;
using System.Windows;

namespace Player.Web;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        NLogHelper.Init("LiveWallpaper3_WebPlayer");
        base.OnStartup(e);
    }
}
