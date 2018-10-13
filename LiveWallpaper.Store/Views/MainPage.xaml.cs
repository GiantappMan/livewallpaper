using System;
using System.Linq;

using LiveWallpaper.Store.ViewModels;

using Microsoft.Toolkit.Uwp.UI.Controls;

using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

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

        MediaElement lastMediaElement;

        private void MasterDetailsViewControl_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            MasterDetailsView control = sender as MasterDetailsView;
            if (control.SelectedItem == null)
                if (lastMediaElement != null)
                    lastMediaElement.Stop();
        }

        private void MediaElement_Loaded(object sender, RoutedEventArgs e)
        {
            lastMediaElement = sender as MediaElement;
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
