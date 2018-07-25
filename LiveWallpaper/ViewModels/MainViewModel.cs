using Caliburn.Micro;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using LiveWallpaper.Helpers;
using LiveWallpaper.Server.Models;
using LiveWallpaper.Wallpapers;

namespace LiveWallpaper.ViewModels
{
    public class MainViewModel : Screen
    {
        const string saveDIR = "Wallpapers";
        Wallpaper currentShowWallpaper;

        public MainViewModel()
        {
            RefreshLocalWallpaper();
        }

        #region  public methods

        public void CreateWallpaper()
        {
            var windowManager = IoC.Get<IWindowManager>();
            var vm = IoC.Get<CreateWallpaperViewModel>();
            windowManager.ShowWindow(vm);
            vm.Deactivated += Vm_Deactivated;
        }

        private void Vm_Deactivated(object sender, DeactivationEventArgs e)
        {
            var vm = sender as CreateWallpaperViewModel;
            vm.Deactivated -= Vm_Deactivated;

            RefreshLocalWallpaper();
        }

        public async void RefreshLocalWallpaper()
        {
            Wallpapers = new ObservableCollection<Wallpaper>();

            var dirPath = Path.Combine(Directory.GetCurrentDirectory(), saveDIR);
            if (!Directory.Exists(dirPath))
                Directory.CreateDirectory(dirPath);
            var dir = new DirectoryInfo(dirPath);
            try
            {
                var configs = dir.EnumerateFiles("config.json", SearchOption.AllDirectories);
                foreach (var item in configs)
                {
                    var data = await ConfigHelper.LoadConfigAsync<Wallpaper>(item.FullName);
                    Wallpapers.Add(data);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("failed to read wallpapers");
            }
        }

        public void ExploreWallpaper(Wallpaper s)
        {
            var currentDir = Directory.GetCurrentDirectory();
            var target = currentDir + s.PackInfo.Dir;
            Process.Start("Explorer.exe", target);
        }
        public void EditWallpaper(Wallpaper s)
        {
            var windowManager = IoC.Get<IWindowManager>();
            var vm = IoC.Get<CreateWallpaperViewModel>();
            vm.SetPaper(s);
            windowManager.ShowWindow(vm);
            vm.Deactivated += Vm_Deactivated;
        }
        public void DeleteWallpaper(Wallpaper w)
        {
            try
            {
                if (w == currentShowWallpaper)
                {
                    WallpaperManger.Clean();
                    currentShowWallpaper = null;
                }
                var currentDir = Directory.GetCurrentDirectory();
                var target = currentDir + w.PackInfo.Dir;
                Directory.Delete(target, true);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString());
            }
            RefreshLocalWallpaper();
        }

        public async void ApplyWallpaper(Wallpaper w)
        {
            currentShowWallpaper = w;
            await WallpaperManger.ApplyWallpaper(w.Type, w.PackInfo);
        }

        protected override void OnDeactivate(bool close)
        {
            base.OnDeactivate(close);
            WallpaperManger.Clean();
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
