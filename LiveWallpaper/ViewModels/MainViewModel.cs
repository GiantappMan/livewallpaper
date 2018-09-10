using Caliburn.Micro;
using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Windows;
using LiveWallpaperEngine;

namespace LiveWallpaper.ViewModels
{
    public class MainViewModel : ScreenWindow
    {
        const string saveDIR = "Wallpapers";
        private CreateWallpaperViewModel _createVM;

        public MainViewModel()
        {
            RefreshLocalWallpaper();
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

        private void _createVM_Deactivated(object sender, DeactivationEventArgs e)
        {
            _createVM.Deactivated -= _createVM_Deactivated;
            _createVM = null;
        }

        public override object GetView(object context = null)
        {
            return base.GetView(context);
        }

        public void RefreshLocalWallpaper()
        {
            Wallpapers = new ObservableCollection<Wallpaper>();

            var dirPath = Path.Combine(Services.AppService.ApptEntryDir, saveDIR);
            if (!Directory.Exists(dirPath))
                Directory.CreateDirectory(dirPath);
            var dir = new DirectoryInfo(dirPath);
            try
            {
                var configs = dir.EnumerateFiles("config.json", SearchOption.AllDirectories);
                //foreach (var item in configs)
                //{
                //    var data = await ConfigHelper.LoadConfigAsync<Wallpaper>(item.FullName);
                //    Wallpapers.Add(data);
                //}
            }
            catch (Exception)
            {
                MessageBox.Show("failed to read wallpapers");
            }
        }

        public void ExploreWallpaper(Wallpaper s)
        {
            //var currentDir = Services.AppService.ApptEntryDir;
            //var target = currentDir + s.PackInfo.Dir;
            //Process.Start("Explorer.exe", target);
        }
        public void EditWallpaper(Wallpaper s)
        {
            var windowManager = IoC.Get<IWindowManager>();
            var vm = IoC.Get<CreateWallpaperViewModel>();
            vm.SetPaper(s);
            windowManager.ShowDialog(vm);
        }
        public void DeleteWallpaper(Wallpaper w)
        {
            //try
            //{
            //    if (w == currentShowWallpaper)
            //    {
            //        WallpaperManger.Clean();
            //        currentShowWallpaper = null;
            //    }
            //    var currentDir = Services.AppService.ApptEntryDir;
            //    WallpaperManger.Delete(w);
            //}
            //catch (Exception ex)
            //{
            //    MessageBox.Show(ex.ToString());
            //}
            //RefreshLocalWallpaper();
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
