using System;

using LiveWallpaper.Store.ViewModels;

using Windows.UI.Xaml.Controls;

namespace LiveWallpaper.Store.Views
{
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            InitializeComponent();
        }

        private MainViewModel ViewModel
        {
            get { return DataContext as MainViewModel; }
        }
    }
}
