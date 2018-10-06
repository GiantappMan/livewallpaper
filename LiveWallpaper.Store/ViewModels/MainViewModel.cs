using System;
using System.Linq;
using System.Threading.Tasks;

using Caliburn.Micro;

using LiveWallpaper.Store.Helpers;
using LiveWallpaper.Store.Services;

namespace LiveWallpaper.Store.ViewModels
{
    public class MainViewModel : Conductor<MainDetailViewModel>.Collection.OneActive
    {
        protected override async void OnInitialize()
        {
            base.OnInitialize();

            await LoadDataAsync();
        }

        public async Task LoadDataAsync()
        {
            Items.Clear();

            var data = await SampleDataService.GetSampleModelDataAsync();

            Items.AddRange(data.Select(d => new MainDetailViewModel(d)));
        }
    }
}
