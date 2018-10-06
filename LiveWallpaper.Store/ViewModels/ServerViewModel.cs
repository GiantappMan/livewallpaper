using Caliburn.Micro;
using LiveWallpaper.Server;
using LiveWallpaper.Store.Services;
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
        private int _pageIndex = 1;
        private readonly AppService _appService;

        public ServerViewModel(AppService appService)
        {
            _appService = appService;
        }

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

        #region IsLoadingWallpaper

        /// <summary>
        /// The <see cref="IsLoadingWallpaper" /> property's name.
        /// </summary>
        public const string IsLoadingWallpaperPropertyName = "IsLoadingWallpaper";

        private bool _IsLoadingWallpaper;

        /// <summary>
        /// IsLoadingWallpaper
        /// </summary>
        public bool IsLoadingWallpaper
        {
            get { return _IsLoadingWallpaper; }

            set
            {
                if (_IsLoadingWallpaper == value) return;

                _IsLoadingWallpaper = value;
                NotifyOfPropertyChange(IsLoadingWallpaperPropertyName);
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
                _pageIndex = 1;
                NotifyOfPropertyChange(SelectedTagPropertyName);
            }
        }

        #endregion

        #region Sorts

        /// <summary>
        /// The <see cref="Sorts" /> property's name.
        /// </summary>
        public const string SortsPropertyName = "Sorts";

        private ObservableCollection<SortServerObj> _Sorts;

        /// <summary>
        /// Sorts
        /// </summary>
        public ObservableCollection<SortServerObj> Sorts
        {
            get { return _Sorts; }

            set
            {
                if (_Sorts == value) return;

                _Sorts = value;
                NotifyOfPropertyChange(SortsPropertyName);
            }
        }

        #endregion

        #region SelectedSort

        /// <summary>
        /// The <see cref="SelectedSort" /> property's name.
        /// </summary>
        public const string SelectedSortPropertyName = "SelectedSort";

        private SortServerObj _SelectedSort;

        /// <summary>
        /// SelectedSort
        /// </summary>
        public SortServerObj SelectedSort
        {
            get { return _SelectedSort; }

            set
            {
                if (_SelectedSort == value) return;

                _SelectedSort = value;
                _pageIndex = 1;
                NotifyOfPropertyChange(SelectedSortPropertyName);
            }
        }

        #endregion

        #region Wallpapers

        /// <summary>
        /// The <see cref="Wallpapers" /> property's name.
        /// </summary>
        public const string WallpapersPropertyName = "Wallpapers";

        private ObservableCollection<WallpaperServerObj> _Wallpapers;

        /// <summary>
        /// Wallpapers
        /// </summary>
        public ObservableCollection<WallpaperServerObj> Wallpapers
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
            ServerInitialized = true;
            await LoadTagsAndSorts();
            await LoadWallpapers();
            IsBusy = false;
        }

        public async Task LoadTagsAndSorts()
        {
            var tempTag = await _localServer.GetTags();
            if (tempTag == null)
                return;
            Tags = new ObservableCollection<TagServerObj>(tempTag);

            if (Tags != null && Tags.Count > 0)
                SelectedTag = Tags[0];

            var tempSort = await _localServer.GetSorts();
            if (tempSort == null)
                return;

            Sorts = new ObservableCollection<SortServerObj>(tempSort);
            if (Sorts != null && Sorts.Count > 0)
                SelectedSort = Sorts[0];
        }

        public async Task LoadWallpapers()
        {
            if (IsLoadingWallpaper || SelectedTag == null || SelectedSort == null)
                return;

            IsLoadingWallpaper = true;

            if (Wallpapers == null)
                Wallpapers = new ObservableCollection<WallpaperServerObj>();
            else if (_pageIndex == 1)
                Wallpapers.Clear();

            var tempList = await _localServer.GetWallpapers(SelectedTag.ID, SelectedSort.ID, _pageIndex++);
            if (tempList == null)
                return;

            tempList.ForEach(m => Wallpapers.Add(m));

            IsLoadingWallpaper = false;
        }

        #endregion
    }
}
