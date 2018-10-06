using System;

using LiveWallpaper.Store.ViewModels;

namespace LiveWallpaper.Store.Views.MainDetail
{
    public sealed partial class DetailsView
    {
        public DetailsView()
        {
            InitializeComponent();
        }

        public MainDetailViewModel ViewModel => DataContext as MainDetailViewModel;
    }
}
