using Caliburn.Micro;
using LiveWallpaper.Managers;
using LiveWallpaper.Server;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.ViewModels
{
    public class ServerViewModel : Screen
    {
        private LocalServer _localServer;

        #region properties

        #region ServerInitialized

        /// <summary>
        /// The <see cref="ServerInitialized" /> property's name.
        /// </summary>
        public const string ServerInitializedPropertyName = "ServerInitialized";

        private bool _ServerInitialized;

        /// <summary>
        /// ServerInitialized
        /// </summary>
        public bool ServerInitialized
        {
            get { return _ServerInitialized; }

            set
            {
                if (_ServerInitialized == value) return;

                _ServerInitialized = value;
                NotifyOfPropertyChange(ServerInitializedPropertyName);
            }
        }

        #endregion

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

        #region Tags

        /// <summary>
        /// The <see cref="Tags" /> property's name.
        /// </summary>
        public const string TagsPropertyName = "Tags";

        private ObservableCollection<TagServerObj> _Tags;

        /// <summary>
        /// Tags
        /// </summary>
        public ObservableCollection<TagServerObj> Tags
        {
            get { return _Tags; }

            set
            {
                if (_Tags == value) return;

                _Tags = value;
                NotifyOfPropertyChange(TagsPropertyName);
            }
        }

        #endregion

        #region SelectedTag

        /// <summary>
        /// The <see cref="SelectedTag" /> property's name.
        /// </summary>
        public const string SelectedTagPropertyName = "SelectedTag";

        private TagServerObj _SelectedTag;

        /// <summary>
        /// SelectedTag
        /// </summary>
        public TagServerObj SelectedTag
        {
            get { return _SelectedTag; }

            set
            {
                if (_SelectedTag == value) return;

                _SelectedTag = value;
                NotifyOfPropertyChange(SelectedTagPropertyName);
            }
        }

        #endregion

        #endregion

        #region methods
        public void InitServer()
        {
            IsBusy = true;
            _localServer = new LocalServer();
            _localServer.InitlizeServer(AppManager.Setting.Server.ServerUrl);
            ServerInitialized = true;
            LoadTags();
            IsBusy = false;
        }

        public async void LoadTags()
        {
            Tags = await _localServer.GetTags();
            if (Tags != null && Tags.Count > 0)
                SelectedTag = Tags[0];
        }

        #endregion
    }
}
