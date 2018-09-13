using LiveWallpaperEngine;
using System;
using System.Windows;

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
        }


        private void Btn_CreateWallpaper(object sender, RoutedEventArgs e)
        {
            CreateWallpaperView createWindow = new CreateWallpaperView();
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
