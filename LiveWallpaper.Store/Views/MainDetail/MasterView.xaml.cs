using System;

using LiveWallpaper.Store.ViewModels;

namespace LiveWallpaper.Store.Views.MainDetail
{
    public sealed partial class MasterView
    {
        public MasterView()
        {
            InitializeComponent();
        }

        public MainDetailViewModel ViewModel => DataContext as MainDetailViewModel;
    }
}
