using Caliburn.Micro;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LiveWallpaper.Wallpapers;
using MultiLanguageManager;
using LiveWallpaperEngine;

namespace LiveWallpaper.ViewModels
{
    public class CreateWallpaperViewModel : Screen
    {
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
        public async void Generate()
        {
            //CanGenerate = false;

            ////var config = await ConfigHelper.LoadConfigAsync<UserConfig>();
            ////if (config == null)
            ////    config = new UserConfig();

            ////config.UserName = Author;

            ////todo 从文件夹读取
            ////var exist = config.Wallpapers.FirstOrDefault(m => m.ID == _wallpaper.ID);
            ////if (exist != null)
            ////    _wallpaper = exist;

            //_wallpaper.Author = Author;

            //var para = new WallpapaerParameter() { Dir = Dir, EnterPoint = EndPoint, Args = Arguments };
            //_wallpaper.PackInfo = para;
            //_wallpaper.Type = SelectedType;

            //_wallpaper.UpdatedTime = DateTime.Now;

            //await CreateLocalPack(_wallpaper);


            ////await ConfigHelper.SaveConfigAsync(config);

            //CanGenerate = true;
            //CanPublish = true;
        }

        public async void Apply()
        {
            //CanClean = true;
            //CanGenerate = true;
            ////await 
            //var para = new WallpapaerParameter() { Dir = Dir, EnterPoint = EndPoint, Args = Arguments };

            //await WallpaperManger.ApplyWallpaper(SelectedType, para);
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
