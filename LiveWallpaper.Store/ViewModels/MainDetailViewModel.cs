using System;

using Caliburn.Micro;

using LiveWallpaper.Store.Models;

namespace LiveWallpaper.Store.ViewModels
{
    public class MainDetailViewModel : Screen
    {
        public MainDetailViewModel(SampleOrder item)
        {
            Item = item;
        }

        public SampleOrder Item { get; }
    }
}
