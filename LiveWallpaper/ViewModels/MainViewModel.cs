using Caliburn.Micro;
using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Windows;
using LiveWallpaperEngine;
using MultiLanguageManager;
using LiveWallpaper.Services;
using System.Threading.Tasks;
using System.Diagnostics;

namespace LiveWallpaper.ViewModels
{
    public class MainViewModel : ScreenWindow
    {
        private static NLog.Logger _logger = NLog.LogManager.GetCurrentClassLogger();
        private CreateWallpaperViewModel _createVM;

        public MainViewModel()
        {
            Init();
        }

        private async void Init()
        {
            await RefreshLocalWallpaper();
        }

        protected override void OnViewReady(object view)
        {
            base.OnViewReady(view);
        }

        #region  public methods

        public void CreateWallpaper()
        {
            if (_createVM != null)
            {
                _createVM.ActiveUI();
                return;
            }

            var windowManager = IoC.Get<IWindowManager>();
            _createVM = IoC.Get<CreateWallpaperViewModel>();
            _createVM.Deactivated += _createVM_Deactivated;
            windowManager.ShowWindow(_createVM, null, null);
        }

        private async void _createVM_Deactivated(object sender, DeactivationEventArgs e)
        {
            _createVM.Deactivated -= _createVM_Deactivated;
            if (_createVM.Result)
            {
                await RefreshLocalWallpaper();
            }
            _createVM = null;
        }

        public override object GetView(object context = null)
        {
            return base.GetView(context);
        }

        public async Task RefreshLocalWallpaper()
        {
            Wallpapers = new ObservableCollection<Wallpaper>();

            if (!Directory.Exists(AppService.LocalWallpaperDir))
                Directory.CreateDirectory(AppService.LocalWallpaperDir);

            try
            {
                var wallpapers = WallpaperManager.GetWallpapers(AppService.LocalWallpaperDir);
                foreach (var item in wallpapers)
                {
                    Wallpapers.Add(item);
                }
            }
            catch (Exception)
            {
                MessageBox.Show(await LanService.Get("mainUI_warning_loadError"));
            }
        }

        public void ExploreWallpaper(Wallpaper s)
        {
            try
            {
                Process.Start("Explorer.exe", $" /select, {s.AbsolutePath}");
            }
            catch (Exception ex)
            {
                _logger.Error(ex);
                MessageBox.Show(ex.Message);
            }
        }
        public void EditWallpaper(Wallpaper s)
        {
            var windowManager = IoC.Get<IWindowManager>();
            var vm = IoC.Get<CreateWallpaperViewModel>();
            vm.SetPaper(s);
            windowManager.ShowDialog(vm);
        }
        public async void DeleteWallpaper(Wallpaper w)
        {
            try
            {
                WallpaperManager.Delete(w);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString());
            }
            await RefreshLocalWallpaper();
        }

        public void ApplyWallpaper(Wallpaper w)
        {
            //currentShowWallpaper = w;
            //await WallpaperManger.ApplyWallpaper(w);
        }

        public void Setting()
        {
            IoC.Get<ContextMenuViewModel>().Config();
        }

        protected override void OnDeactivate(bool close)
        {
            base.OnDeactivate(close);
            //WallpaperManger.Clean();
        }

        #endregion

        #region properties


        #region Wallpapers

        /// <summary>
        /// The <see cref="Wallpapers" /> property's name.
        /// </summary>
        public const string WallpapersPropertyName = "Wallpapers";

        private ObservableCollection<Wallpaper> _Wallpapers;

        /// <summary>
        /// Wallpapers
        /// </summary>
        public ObservableCollection<Wallpaper> Wallpapers
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
    }
}
