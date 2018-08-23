using Caliburn.Micro;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LiveWallpaper.Server.Models;
using LiveWallpaper.Wallpapers;
using MultiLanguageManager;

namespace LiveWallpaper.ViewModels
{
    public class CreateWallpaperViewModel : Screen
    {
        Wallpaper _wallpaper;

        public CreateWallpaperViewModel()
        {
            _wallpaper = new Wallpaper();
            _wallpaper.ID = Guid.NewGuid().ToString();
            _wallpaper.CreatedTime = DateTime.Now;
            Init();
            DisplayName = LanService.Get("create").Result;
            UpdateDesc();
        }

        private async void Init()
        {
            //var config = await ConfigHelper.LoadConfigAsync<UserConfig>();
            //if (config == null)
            //    config = new UserConfig();

            //Author = config.UserName;
        }

        #region properties

        #region Name

        /// <summary>
        /// The <see cref="Name" /> property's name.
        /// </summary>
        public const string NamePropertyName = "Name";

        private string _Name;

        /// <summary>
        /// Name
        /// </summary>
        public string Name
        {
            get { return _Name; }

            set
            {
                if (_Name == value) return;

                _Name = value;
                NotifyOfPropertyChange(NamePropertyName);
            }
        }

        #endregion

        #region Author

        /// <summary>
        /// The <see cref="Author" /> property's name.
        /// </summary>
        public const string AuthorPropertyName = "Author";

        private string _Author;

        /// <summary>
        /// Author
        /// </summary>
        public string Author
        {
            get { return _Author; }

            set
            {
                if (_Author == value) return;

                _Author = value;
                NotifyOfPropertyChange(AuthorPropertyName);
            }
        }

        #endregion

        #region Dir

        /// <summary>
        /// The <see cref="Dir" /> property's name.
        /// </summary>
        public const string DirPropertyName = "Dir";

        private string _Dir;

        /// <summary>
        /// Dir
        /// </summary>
        public string Dir
        {
            get { return _Dir; }

            set
            {
                if (_Dir == value) return;

                value = UpdateParameter2(value);
                _Dir = value;
                NotifyOfPropertyChange(DirPropertyName);
            }
        }
        private string UpdateParameter2(string value)
        {
            if (SelectedType == WallpaperType.Video)
                return value;

            FileInfo fileInfo = new FileInfo(value);
            if (fileInfo.Attributes == FileAttributes.Directory)
                return value;

            if (fileInfo.Attributes == FileAttributes.Archive)
            {

                var fileName = Path.GetFileName(value);
                if (string.IsNullOrEmpty(fileName))
                    return value;

                EndPoint = fileName;
                var result = value.Replace(fileName, "");
                return result;
            }

            return value;
        }
        #endregion

        #region EndPoint

        /// <summary>
        /// The <see cref="EndPoint" /> property's name.
        /// </summary>
        public const string EndPointPropertyName = "EndPoint";

        private string _EndPoint;

        /// <summary>
        /// EndPoint
        /// </summary>
        public string EndPoint
        {
            get { return _EndPoint; }

            set
            {
                if (_EndPoint == value) return;

                _EndPoint = value;
                NotifyOfPropertyChange(EndPointPropertyName);
            }
        }

        #endregion

        #region Arguments

        /// <summary>
        /// The <see cref="Arguments" /> property's name.
        /// </summary>
        public const string ArgumentsPropertyName = "Arguments";

        private string _Arguments;

        /// <summary>
        /// Arguments
        /// </summary>
        public string Arguments
        {
            get { return _Arguments; }

            set
            {
                if (_Arguments == value) return;

                _Arguments = value;
                NotifyOfPropertyChange(ArgumentsPropertyName);
            }
        }

        #endregion

        #region DirDesc

        /// <summary>
        /// The <see cref="DirDesc" /> property's name.
        /// </summary>
        public const string DirDescPropertyName = "DirDesc";

        private string _DirDesc;

        /// <summary>
        /// DirDesc
        /// </summary>
        public string DirDesc
        {
            get { return _DirDesc; }

            set
            {
                if (_DirDesc == value) return;

                _DirDesc = value;
                NotifyOfPropertyChange(DirDescPropertyName);
            }
        }

        #endregion

        #region EndPointDesc

        /// <summary>
        /// The <see cref="EndPointDesc" /> property's name.
        /// </summary>
        public const string EndPointDescPropertyName = "EndPointDesc";

        private string _EndPointDesc;

        /// <summary>
        /// EndPointDesc
        /// </summary>
        public string EndPointDesc
        {
            get { return _EndPointDesc; }

            set
            {
                if (_EndPointDesc == value) return;

                _EndPointDesc = value;
                NotifyOfPropertyChange(EndPointDescPropertyName);
            }
        }

        #endregion

        #region ArgumentsDesc

        /// <summary>
        /// The <see cref="ArgumentsDesc" /> property's name.
        /// </summary>
        public const string ArgumentsDescPropertyName = "ArgumentsDesc";

        private string _ArgumentsDesc;

        /// <summary>
        /// ArgumentsDesc
        /// </summary>
        public string ArgumentsDesc
        {
            get { return _ArgumentsDesc; }

            set
            {
                if (_ArgumentsDesc == value) return;

                _ArgumentsDesc = value;
                NotifyOfPropertyChange(ArgumentsDescPropertyName);
            }
        }

        #endregion

        #region CanGenerate

        /// <summary>
        /// The <see cref="CanGenerate" /> property's name.
        /// </summary>
        public const string CanGeneratePropertyName = "CanGenerate";

        private bool _CanGenerate = true;

        /// <summary>
        /// CanGenerate
        /// </summary>
        public bool CanGenerate
        {
            get { return _CanGenerate; }

            set
            {
                if (_CanGenerate == value) return;

                _CanGenerate = value;
                NotifyOfPropertyChange(CanGeneratePropertyName);
            }
        }

        #endregion

        #region CanApply

        /// <summary>
        /// The <see cref="CanApply" /> property's name.
        /// </summary>
        public const string CanApplyPropertyName = "CanApply";

        private bool _CanApply = true;

        /// <summary>
        /// CanApply
        /// </summary>
        public bool CanApply
        {
            get { return _CanApply; }

            set
            {
                if (_CanApply == value) return;

                _CanApply = value;
                NotifyOfPropertyChange(CanApplyPropertyName);
            }
        }

        #endregion

        #region CanClean

        /// <summary>
        /// The <see cref="CanClean" /> property's name.
        /// </summary>
        public const string CanCleanPropertyName = "CanClean";

        private bool _CanClean;

        /// <summary>
        /// CanClean
        /// </summary>
        public bool CanClean
        {
            get { return _CanClean; }

            set
            {
                if (_CanClean == value) return;

                _CanClean = value;
                NotifyOfPropertyChange(CanCleanPropertyName);
            }
        }

        #endregion

        #region CanPublish

        /// <summary>
        /// The <see cref="CanPublish" /> property's name.
        /// </summary>
        public const string CanPublishPropertyName = "CanPublish";

        private bool _CanPublish;

        /// <summary>
        /// CanPublish
        /// </summary>
        public bool CanPublish
        {
            get { return _CanPublish; }

            set
            {
                if (_CanPublish == value) return;

                _CanPublish = value;
                NotifyOfPropertyChange(CanPublishPropertyName);
            }
        }

        #endregion

        #region CanDir

        /// <summary>
        /// The <see cref="CanDir" /> property's name.
        /// </summary>
        public const string CanDirPropertyName = "CanDir";

        private bool _CanDir;

        /// <summary>
        /// CanDir
        /// </summary>
        public bool CanDir
        {
            get { return _CanDir; }

            set
            {
                if (_CanDir == value) return;

                _CanDir = value;
                NotifyOfPropertyChange(CanDirPropertyName);
            }
        }

        #endregion
        #region SelectedType

        /// <summary>
        /// The <see cref="SelectedType" /> property's name.
        /// </summary>
        public const string SelectedTypePropertyName = "SelectedType";

        private WallpaperType _SelectedType;

        /// <summary>
        /// SelectedType
        /// </summary>
        public WallpaperType SelectedType
        {
            get { return _SelectedType; }

            set
            {
                if (_SelectedType == value) return;

                _SelectedType = value;
                UpdateDesc();
                NotifyOfPropertyChange(SelectedTypePropertyName);
            }
        }

        private async void UpdateDesc()
        {
            switch (SelectedType)
            {
                //应用程序壁纸
                case WallpaperType.Exe:
                    DirDesc = await LanService.Get("type_exe_desc1");
                    EndPointDesc = await LanService.Get("type_exe_desc2");
                    ArgumentsDesc = await LanService.Get("type_exe_desc3");
                    break;
                //网页壁纸
                case WallpaperType.WEB:
                    DirDesc = await LanService.Get("type_web_desc1");
                    EndPointDesc = await LanService.Get("type_web_desc2");
                    ArgumentsDesc = await LanService.Get("type_web_desc3");
                    break;
                //视频壁纸
                case WallpaperType.Video:
                    DirDesc = await LanService.Get("type_video_desc1");
                    EndPointDesc = await LanService.Get("type_video_desc2");
                    ArgumentsDesc = await LanService.Get("type_video_desc3");
                    break;
            }
            //DirDesc = EndPointDesc = ArgumentsDesc = null;
        }

        #endregion

        #endregion

        #region public methods 

        internal void SetPaper(Wallpaper w)
        {
            DisplayName = LanService.Get("edit").Result; 
            Name = w.Name;
            Dir = w.PackInfo.Dir;
            EndPoint = w.PackInfo.EnterPoint;
            Arguments = w.PackInfo.Args;
            SelectedType = w.Type;

            _wallpaper = w;
        }
        public async void Generate()
        {
            CanGenerate = false;

            //var config = await ConfigHelper.LoadConfigAsync<UserConfig>();
            //if (config == null)
            //    config = new UserConfig();

            //config.UserName = Author;

            //todo 从文件夹读取
            //var exist = config.Wallpapers.FirstOrDefault(m => m.ID == _wallpaper.ID);
            //if (exist != null)
            //    _wallpaper = exist;

            _wallpaper.Author = Author;

            var para = new WallpapaerParameter() { Dir = Dir, EnterPoint = EndPoint, Args = Arguments };
            _wallpaper.PackInfo = para;
            _wallpaper.Type = SelectedType;

            _wallpaper.UpdatedTime = DateTime.Now;

            await CreateLocalPack(_wallpaper);


            //await ConfigHelper.SaveConfigAsync(config);

            CanGenerate = true;
            CanPublish = true;
        }

        public async void Apply()
        {
            CanClean = true;
            CanGenerate = true;
            //await 
            var para = new WallpapaerParameter() { Dir = Dir, EnterPoint = EndPoint, Args = Arguments };

            await WallpaperManger.ApplyWallpaper(SelectedType, para);
        }

        public void Clean()
        {
            WallpaperManger.Clean();
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

        private async Task CreateLocalPack(Wallpaper wallpaper)
        {
            var target = Path.Combine(Directory.GetCurrentDirectory(), "Wallpapers", wallpaper.ID);
            var destDir = Directory.CreateDirectory(target);
            var currentDir = Directory.GetCurrentDirectory();

            var relativeDir = target.Replace(currentDir, "");

            wallpaper.Name = Name;

            switch (wallpaper.Type)
            {
                case WallpaperType.Exe:
                    if (relativeDir != wallpaper.PackInfo.Dir)
                    {
                        await Task.Run(() =>
                        {
                            CopyAll(new DirectoryInfo(wallpaper.PackInfo.Dir), destDir);
                        });

                    }
                    break;
                case WallpaperType.WEB:
                    var htmlDir = Path.GetDirectoryName(wallpaper.PackInfo.Args);
                    if (relativeDir != htmlDir)
                    {
                        await Task.Run(() =>
                        {
                            CopyAll(new DirectoryInfo(htmlDir), destDir);

                            var fileExtension = Path.GetExtension(wallpaper.PackInfo.Args);
                            string dest = Path.Combine(destDir.FullName, $"index{fileExtension}");
                            var relativePath = dest.Replace(currentDir, "");

                            wallpaper.PackInfo.Args = relativePath;
                        });
                    }
                    break;
                case WallpaperType.Video:
                    await Task.Run(() =>
                    {
                        var fileExtension = Path.GetExtension(wallpaper.PackInfo.Args);
                        string dest = Path.Combine(destDir.FullName, $"index{fileExtension}");
                        CopyFileToDir(wallpaper.PackInfo.Args, dest);
                        var relativePath = dest.Replace(currentDir, "");

                        wallpaper.PackInfo.Args = relativePath;
                    });

                    break;
            }

            wallpaper.PackInfo.Dir = relativeDir;
            //await ConfigHelper.SaveConfigAsync(wallpaper, Path.Combine(target, "config.json"));
        }

        private void CopyFileToDir(string path, string target)
        {
            FileInfo file = new FileInfo(path);
            file.CopyTo(target, true);
        }

        private void CopyAll(DirectoryInfo source, DirectoryInfo target)
        {
            Directory.CreateDirectory(target.FullName);

            // Copy each file into the new directory.
            foreach (FileInfo fi in source.GetFiles())
            {
                Console.WriteLine(@"Copying {0}\{1}", target.FullName, fi.Name);
                fi.CopyTo(Path.Combine(target.FullName, fi.Name), true);
            }

            // Copy each subdirectory using recursion.
            foreach (DirectoryInfo diSourceSubDir in source.GetDirectories())
            {
                DirectoryInfo nextTargetSubDir =
                    target.CreateSubdirectory(diSourceSubDir.Name);
                CopyAll(diSourceSubDir, nextTargetSubDir);
            }
        }

        #endregion
    }
}
