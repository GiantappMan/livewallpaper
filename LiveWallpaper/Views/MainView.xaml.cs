using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using LiveWallpaper.Wallpapers;

namespace LiveWallpaper.Views
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainView : Window
    {
        public MainView()
        {
            InitializeComponent();
            RestoreDefaultBG();
        }

        private async void RestoreDefaultBG()
        {
            var _defaultBG = await ImgWallpaper.GetCurrentBG();
            await ImgWallpaper.SetBG(_defaultBG);
        }

        private void btn_CreateWallpaper(object sender, RoutedEventArgs e)
        {
            CreateWallpaperView createWindow = new CreateWallpaperView();
            //createWindow.Owner = this;
            createWindow.Show();
            createWindow.Closed += CreateWindow_Closed;
        }

        private void CreateWindow_Closed(object sender, EventArgs e)
        {
            CreateWallpaperView createWindow = sender as CreateWallpaperView;
            createWindow.Closed -= CreateWindow_Closed;
        }
    }
}
