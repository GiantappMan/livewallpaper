using LiveWallpaper.ViewModels;
using LiveWallpaperEngine;
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;

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

        private async void TabControl_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            TabControl control = sender as TabControl;
            if (control.SelectedIndex == 1)
            {
                //var vm = DataContext as MainViewModel;
                //vm.InitServer();
                Uri uri = new Uri("live.wallpaper.store://");

#pragma warning disable UWP003 // UWP-only
                bool success = await Windows.System.Launcher.LaunchUriAsync(uri);
#pragma warning restore UWP003 // UWP-only
            }
        }

        private async void ListView_ScrollChanged(object sender, ScrollChangedEventArgs e)
        {
            if (e.VerticalChange > 0)
            {
                if (e.VerticalOffset + e.ViewportHeight == e.ExtentHeight)
                {
                    var vm = DataContext as MainViewModel;
                    await vm.Server.LoadWallpapers();
                }
            }
        }
    }
}
