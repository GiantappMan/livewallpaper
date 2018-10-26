using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Caliburn.Micro;
using LiveWallpaper.Server;
using LiveWallpaper.Store.Helpers;
using LiveWallpaper.Store.Services;
using LiveWallpaperEngine;
using Newtonsoft.Json;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.UI.Popups;
using Windows.Web.Http;
using Windows.Web.Http.Filters;

namespace LiveWallpaper.Store.ViewModels
{
    public class MainViewModel : Conductor<WallpaperServerObj>.Collection.OneActive
    {
        AppService _appService;

        public MainViewModel(AppService appService)
        {
            _appService = appService;
        }

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

        #region IsInstalling

        /// <summary>
        /// The <see cref="IsInstalling" /> property's name.
        /// </summary>
        public const string IsInstallingPropertyName = "IsInstalling";

        private bool _IsInstalling;

        /// <summary>
        /// IsInstalling
        /// </summary>
        public bool IsInstalling
        {
            get { return _IsInstalling; }

            set
            {
                if (_IsInstalling == value) return;

                _IsInstalling = value;
                NotifyOfPropertyChange(IsInstallingPropertyName);
            }
        }

        #endregion

        #region InstallProgress

        /// <summary>
        /// The <see cref="InstallProgress" /> property's name.
        /// </summary>
        public const string InstallProgressPropertyName = "InstallProgress";

        private float _InstallProgress;

        /// <summary>
        /// InstallProgress
        /// </summary>
        public float InstallProgress
        {
            get { return _InstallProgress; }

            set
            {
                if (_InstallProgress == value) return;

                _InstallProgress = value;
                NotifyOfPropertyChange(InstallProgressPropertyName);
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

        //public async void Install()
        //{
        //    try
        //    {
        //        //写入文件
        //        string dir = "d:\\";
        //        string fileName = "sample.txt";
        //        string fullPath = Path.Combine(dir, fileName);
        //        StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(dir);
        //        StorageFile writeFile = await storageFolder.CreateFileAsync(fileName, CreationCollisionOption.ReplaceExisting);
        //        await FileIO.WriteTextAsync(writeFile, DateTime.Now.ToString());

        //        //读取文件
        //        StorageFile readFile = await storageFolder.GetFileAsync(fileName);

        //        //全路径读取
        //        //StorageFile readFile = await StorageFile.GetFileFromPathAsync(fullPath);
        //        var stream = await readFile.OpenAsync(FileAccessMode.Read);
        //        ulong size = stream.Size;
        //        using (var inputStream = stream.GetInputStreamAt(0))
        //        {
        //            using (var dataReader = new Windows.Storage.Streams.DataReader(inputStream))
        //            {
        //                uint numBytesLoaded = await dataReader.LoadAsync((uint)size);
        //                string text = dataReader.ReadString(numBytesLoaded);
        //            }
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        throw;
        //    }
        //}
        ulong _totalSize;
        public async void Install()
        {
            if (IsInstalling)
                return;
            try
            {
                var selected = Server.WallpaperSorce.SelectedWallpaper;
                if (selected == null)
                    return;

                IsInstalling = true;

                if(string.IsNullOrEmpty(_appService.Setting.General.WallpaperSaveDir))
                {
#pragma warning disable UWP003 // UWP-only
                    MessageDialog dialog = new MessageDialog($"未设置壁纸目录，请下载《巨应动态壁纸》使用本应用");
#pragma warning restore UWP003 // UWP-only
                    await dialog.ShowAsync();
                    return;
                }

                StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(_appService.Setting.General.WallpaperSaveDir);
                var folder = await storageFolder.CreateFolderAsync(Guid.NewGuid().ToString());

                string previewName = $"preview{ Path.GetExtension(selected.Img)}";
                string videowName = $"index{ Path.GetExtension(selected.URL)}";
                await Download(folder, selected.Img, previewName, null);
                await Download(folder, selected.URL, videowName, OnSendRequestProgress);

                ProjectInfo info = new ProjectInfo
                {
                    Title = selected.Name,
                    Type = WallpaperType.Video.ToString(),
                    Preview = previewName,
                    File = videowName
                };
                var json = JsonConvert.SerializeObject(info);
                var projectFile = await folder.CreateFileAsync("project.json");
                await FileIO.WriteTextAsync(projectFile, json);
            }
            catch (Exception ex)
            {
#pragma warning disable UWP003 // UWP-only
                MessageDialog dialog = new MessageDialog($"安装出现异常，请联系开发者.{ex.Message}");
#pragma warning restore UWP003 // UWP-only
                await dialog.ShowAsync();
            }
            finally
            {
                IsInstalling = false;
            }
        }

        private async Task<ulong> Download(StorageFolder folder, string url, string targetName, Action<HttpProgress> progressChanged)
        {
            Uri uri = new Uri(url);
            Debug.WriteLine(url);
            using (var client = new HttpClient())
            {
                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, uri);

                HttpResponseMessage response = null;
                if (progressChanged != null)
                {
                    Progress<HttpProgress> progressCallback = new Progress<HttpProgress>(progressChanged);
                    var tokenSource = new CancellationTokenSource();
                    response = await client.SendRequestAsync(request).AsTask(tokenSource.Token, progressCallback);
                }
                else
                {
                    response = await client.SendRequestAsync(request);
                }

                IInputStream inputStream = await response.Content.ReadAsInputStreamAsync();
                bool ok = response.Content.TryComputeLength(out ulong length);
                StorageFile file = await folder.CreateFileAsync(targetName, CreationCollisionOption.GenerateUniqueName);

                IOutputStream outputStream = await file.OpenAsync(FileAccessMode.ReadWrite);
                await RandomAccessStream.CopyAndCloseAsync(inputStream, outputStream);
                return length;
            }
        }

        private void OnSendRequestProgress(HttpProgress obj)
        {
            if (_totalSize == 0 && obj.TotalBytesToReceive == null)
                return;

            if (obj.TotalBytesToReceive != null)
                _totalSize = obj.TotalBytesToReceive.Value;

            InstallProgress = (float)obj.BytesReceived / _totalSize * 100;
            Debug.WriteLine(obj.Stage + " " + obj.BytesReceived + " /" + obj.TotalBytesToReceive + " /" + InstallProgress);
        }

        public void Setting()
        {
            INavigationService service = IoC.Get<INavigationService>();
            bool ok = service.NavigateToViewModel<SettingViewModel>();
        }
    }
}
