using DZY.DotNetUtil.ViewModels;
using LiveWallpaper.Server;
using LiveWallpaper.Store.ViewModels;
using Microsoft.Toolkit.Collections;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaper.Store.Services
{
    public class WallpaperSorce : ObservableObject, IIncrementalSource<WallpaperServerObj>
    {
        private LocalServer _localServer;
        private int _pageIndex = 1;

        public WallpaperSorce()
        {

        }
        public WallpaperSorce(LocalServer server)
        {
            _localServer = server;
        }

        #region properties

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

        private List<WallpaperServerObj> _Wallpapers;

        /// <summary>
        /// Wallpapers
        /// </summary>
        public List<WallpaperServerObj> Wallpapers
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

        #region SelectedWallpaper

        /// <summary>
        /// The <see cref="SelectedWallpaper" /> property's name.
        /// </summary>
        public const string SelectedWallpaperPropertyName = "SelectedWallpaper";

        private WallpaperServerObj _SelectedWallpaper;

        /// <summary>
        /// SelectedWallpaper
        /// </summary>
        public WallpaperServerObj SelectedWallpaper
        {
            get { return _SelectedWallpaper; }

            set
            {
                if (_SelectedWallpaper == value) return;

                _SelectedWallpaper = value;
                NotifyOfPropertyChange(SelectedWallpaperPropertyName);
            }
        }

        #endregion

        #endregion

        public async Task<IEnumerable<WallpaperServerObj>> GetPagedItemsAsync(int pageIndex, int pageSize, CancellationToken cancellationToken = default(CancellationToken))
        {
            return await LoadWallpapers();
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

        public async Task<ReadOnlyCollection<WallpaperServerObj>> LoadWallpapers()
        {
            if (SelectedTag == null || SelectedSort == null)
                return null;

            if (Wallpapers == null)
                Wallpapers = new List<WallpaperServerObj>();
            else if (_pageIndex == 1)
                Wallpapers.Clear();

            var tempList = await _localServer.GetWallpapers(SelectedTag.ID, SelectedSort.ID, _pageIndex++);
            if (tempList == null)
                return new ReadOnlyCollection<WallpaperServerObj>(Wallpapers);

            tempList.ForEach(m => Wallpapers.Add(m));

            return new ReadOnlyCollection<WallpaperServerObj>(Wallpapers);
        }
    }
}
