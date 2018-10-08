using System;
using LiveWallpaper.Server;
using LiveWallpaper.Store.ViewModels;

namespace LiveWallpaper.Store.Views.MainDetail
{
    public sealed partial class MasterView
    {
        public MasterView()
        {
            InitializeComponent();
        }

        public WallpaperServerObj ViewModel => DataContext as WallpaperServerObj;
    }
}
