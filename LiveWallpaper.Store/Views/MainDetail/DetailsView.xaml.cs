using System;
using LiveWallpaper.Server;
using LiveWallpaper.Store.ViewModels;

namespace LiveWallpaper.Store.Views.MainDetail
{
    public sealed partial class DetailsView
    {
        public DetailsView()
        {
            InitializeComponent();
        }

        public WallpaperServerObj ViewModel => DataContext as WallpaperServerObj;
    }
}
