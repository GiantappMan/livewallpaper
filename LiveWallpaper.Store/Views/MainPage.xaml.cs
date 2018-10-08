using System;
using System.Linq;

using LiveWallpaper.Store.ViewModels;

using Microsoft.Toolkit.Uwp.UI.Controls;

using Windows.UI.Xaml;
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

        //private void MasterDetailsViewControl_Loaded(object sender, RoutedEventArgs e)
        //{
        //    if (MasterDetailsViewControl.ViewState == MasterDetailsViewState.Both)
        //    {
        //        ViewModel.ActiveItem = ViewModel.Items.First();
        //    }
        //}
    }
}
