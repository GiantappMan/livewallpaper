using LiveWallpaperEngine.Controls;
using LiveWallpaperEngine.NativeWallpapers;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Interop;

namespace LiveWallpaper.Views
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class CreateWallpaperView : Window
    {
        public CreateWallpaperView()
        {
            InitializeComponent();
        }

        RenderWindow renderWindow;
        private async void CheckBox_Checked(object sender, RoutedEventArgs e)
        {
            if (renderWindow == null)
                renderWindow = new RenderWindow();

            renderWindow.Wallpaper = WallpaperRender.Wallpaper;
            //WallpaperRender.Wallpaper = null;
            renderWindow.Show();

            var handler = new WindowInteropHelper(renderWindow).Handle;
            await HandlerWallpaper.Show(handler);
        }

        private async void CheckBox_Unchecked(object sender, RoutedEventArgs e)
        {
            renderWindow.Close();
            renderWindow = null;
            await HandlerWallpaper.Clean();
        }
    }
}
