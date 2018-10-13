using System;
using System.Linq;
using System.Threading.Tasks;

using Caliburn.Micro;
using LiveWallpaper.Server;
using LiveWallpaper.Store.Helpers;
using LiveWallpaper.Store.Services;

namespace LiveWallpaper.Store.ViewModels
{
    public class MainViewModel : Conductor<WallpaperServerObj>.Collection.OneActive
    {
        protected override void OnInitialize()
        {
            base.OnInitialize();

            InitServer();
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

        public void Install()
        {

        }

        public void Setting()
        {
            INavigationService service = IoC.Get<INavigationService>();
            bool ok = service.NavigateToViewModel<SettingViewModel>();
        }
    }
}
