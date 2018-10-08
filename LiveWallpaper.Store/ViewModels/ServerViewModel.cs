using Caliburn.Micro;
using LiveWallpaper.Server;
using LiveWallpaper.Store.Services;
using Microsoft.Toolkit.Uwp;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Store.ViewModels
{
    public class ServerViewModel : Screen
    {
        private LocalServer _localServer;
        private readonly AppService _appService;

        public ServerViewModel(AppService appService)
        {
            _appService = appService;
        }

        #region properties

        #region IsBusy

        /// <summary>
        /// The <see cref="IsBusy" /> property's name.
        /// </summary>
        public const string IsBusyPropertyName = "IsBusy";

        private bool _IsBusy;

        /// <summary>
        /// IsBusy
        /// </summary>
        public bool IsBusy
        {
            get { return _IsBusy; }

            set
            {
                if (_IsBusy == value) return;

                _IsBusy = value;
                NotifyOfPropertyChange(IsBusyPropertyName);
            }
        }
        #endregion

        #region WallpaperSorce

        /// <summary>
        /// The <see cref="WallpaperSorce" /> property's name.
        /// </summary>
        public const string WallpaperSorcePropertyName = "WallpaperSorce";

        private WallpaperSorce _WallpaperSorce;

        /// <summary>
        /// WallpaperSorce
        /// </summary>
        public WallpaperSorce WallpaperSorce
        {
            get { return _WallpaperSorce; }

            set
            {
                if (_WallpaperSorce == value) return;

                _WallpaperSorce = value;
                NotifyOfPropertyChange(WallpaperSorcePropertyName);
            }
        }

        #endregion

        #region Wallpapers

        /// <summary>
        /// The <see cref="Wallpapers" /> property's name.
        /// </summary>
        public const string WallpapersPropertyName = "Wallpapers";

        private IncrementalLoadingCollection<WallpaperSorce, WallpaperServerObj> _Wallpapers;

        /// <summary>
        /// Wallpapers
        /// </summary>
        public IncrementalLoadingCollection<WallpaperSorce, WallpaperServerObj> Wallpapers
        {
            get { return _Wallpapers; }

            set
            {
                if (_Wallpapers == value) return;

                _Wallpapers = value;
                NotifyOfPropertyChange(WallpapersPropertyName);
            }
        }

        #endregion

        #endregion

        #region methods

        public async void InitServer()
        {
            IsBusy = true;
            _localServer = new LocalServer();
            await _appService.CheckDefaultSetting();
            await _localServer.InitlizeServer(_appService.Setting.ServerUrl);
            WallpaperSorce = new WallpaperSorce(_localServer);
            await WallpaperSorce.LoadTagsAndSorts();
            Wallpapers = new IncrementalLoadingCollection<WallpaperSorce, WallpaperServerObj>(WallpaperSorce);
            IsBusy = false;
        }


        #endregion
    }
}
