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

            InitServer();
            await LoadDataAsync();
        }

        #region properites

        #region Server

        /// <summary>
        /// The <see cref="Server" /> property's name.
        /// </summary>
        public const string ServerPropertyName = "Server";

        private ServerViewModel _Server;

        /// <summary>
        /// Server
        /// </summary>
        public ServerViewModel Server
        {
            get { return _Server; }

            set
            {
                if (_Server == value) return;

                _Server = value;
                NotifyOfPropertyChange(ServerPropertyName);
            }
        }

        #endregion

        #endregion

        public void InitServer()
        {
            if (Server != null)
                return;

            Server = IoC.Get<ServerViewModel>();
            Server.InitServer();
        }


        public async Task LoadDataAsync()
        {
            Items.Clear();

            var data = await SampleDataService.GetSampleModelDataAsync();

            Items.AddRange(data.Select(d => new MainDetailViewModel(d)));
        }
    }
}
