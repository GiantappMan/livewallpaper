using Caliburn.Micro;
using System.Diagnostics;
using MultiLanguageManager;
using LiveWallpaperEngine;
using LiveWallpaperEngine.Controls;
using LiveWallpaperEngine.NativeWallpapers;
using System.Windows.Interop;
using LiveWallpaper.Services;

namespace LiveWallpaper.ViewModels
{
    public class CreateWallpaperViewModel : Screen
    {
        private bool _preview;

        public CreateWallpaperViewModel()
        {
            DisplayName = LanService.Get("common_create").Result;
        }

        #region properties

        #region CurrentWallpaper

        /// <summary>
        /// The <see cref="CurrentWallpaper" /> property's name.
        /// </summary>
        public const string CurrentWallpaperPropertyName = "CurrentWallpaper";

        private Wallpaper _CurrentWallpaper;

        /// <summary>
        /// CurrentWallpaper
        /// </summary>
        public Wallpaper CurrentWallpaper
        {
            get { return _CurrentWallpaper; }

            set
            {
                if (_CurrentWallpaper == value) return;

                _CurrentWallpaper = value;
                if (_preview)
                    Preview();
                NotifyOfPropertyChange(CurrentWallpaperPropertyName);
            }
        }

        #endregion

        #endregion

        #region public methods 

        internal void SetPaper(Wallpaper w)
        {
            DisplayName = LanService.Get("common_edit").Result;
            //Name = w.Name;
            //Dir = w.PackInfo.Dir;
            //EndPoint = w.PackInfo.EnterPoint;
            //Arguments = w.PackInfo.Args;
            //SelectedType = w.Type;

            //_wallpaper = w;
        }

        public async void Preview()
        {
            _preview = true;
            await WallpaperService.Preivew(CurrentWallpaper);
        }

        public async void StopPreview()
        {
            _preview = false;
            await WallpaperService.StopPreview();
        }

        public void Clean()
        {
            //WallpaperManger.Clean();
        }

        public void Publish()
        {

        }

        public void RestartExploer()
        {
            foreach (Process exe in Process.GetProcesses())
            {
                if (exe.ProcessName.StartsWith("explorer"))
                {
                    exe.Kill();
                    break;
                }
            }

            var p = new Process();
            string explorer = "explorer.exe";
            p.StartInfo.FileName = explorer;
            p.Start();
            p.Kill();
        }

        #endregion

        #region private methods



        #endregion
    }
}
