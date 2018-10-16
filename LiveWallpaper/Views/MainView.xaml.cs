using LiveWallpaper.Managers;
using LiveWallpaper.ViewModels;
using LiveWallpaperEngine;
using System;
using System.Diagnostics;
using System.IO;
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
            Activated += MainView_Activated;
            Closed += MainView_Closed;
        }

        private void MainView_Closed(object sender, EventArgs e)
        {
            Closed -= MainView_Closed;
            Activated -= MainView_Activated;
            DataContext = null;
        }

        private void MainView_Activated(object sender, EventArgs e)
        {
            if (!(DataContext is MainViewModel vm))
                return;

            vm.RefreshLocalWallpaper();
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

        private void Window_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            if (!(DataContext is MainViewModel vm))
                return;

            vm.SaveSizeData();
        }

        //private async void TabControl_SelectionChanged(object sender, SelectionChangedEventArgs e)
        //{
        //    TabControl control = sender as TabControl;
        //    if (control.SelectedIndex == 1)
        //    {

        //    }
        //}

        //private async void ListView_ScrollChanged(object sender, ScrollChangedEventArgs e)
        //{
        //    if (e.VerticalChange > 0)
        //    {
        //        if (e.VerticalOffset + e.ViewportHeight == e.ExtentHeight)
        //        {
        //            var vm = DataContext as MainViewModel;
        //            await vm.Server.LoadWallpapers();
        //        }
        //    }
        //}
    }
}
