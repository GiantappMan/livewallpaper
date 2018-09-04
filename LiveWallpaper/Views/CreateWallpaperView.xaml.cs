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

        Window newWindow;
        private async void CheckBox_Checked(object sender, RoutedEventArgs e)
        {
            if (newWindow == null)
                newWindow = new Window();

            var render = new WallpaperRender();
            render.Wallpaper = WallpaperRender.Wallpaper;
            WallpaperRender.Wallpaper = null;
            newWindow.Content = render;
            newWindow.Show();

            var handler = new WindowInteropHelper(newWindow).Handle;
            await HandlerWallpaper.Show(handler);

            double width = Screen.AllScreens[0].Bounds.Width;
            double height = Screen.AllScreens[0].Bounds.Height;
            newWindow.WindowStyle = WindowStyle.None;
            newWindow.WindowState = WindowState.Maximized;

            newWindow.Width = width;
            newWindow.Height = height;
        }

        private async void CheckBox_Unchecked(object sender, RoutedEventArgs e)
        {
            newWindow.Close();
            newWindow = null;
            await HandlerWallpaper.Clean();
        }
    }
}
