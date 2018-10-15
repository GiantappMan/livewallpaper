using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Caliburn.Micro;
using LiveWallpaper.Server;
using LiveWallpaper.Store.Helpers;
using LiveWallpaper.Store.Services;
using Windows.Storage;

namespace LiveWallpaper.Store.ViewModels
{
    public class MainViewModel : Conductor<WallpaperServerObj>.Collection.OneActive
    {
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

        #endregion

        public void InitServer()
        {
            if (Server != null)
                return;

            Server = IoC.Get<ServerViewModel>();
            Server.InitServer();
        }

        public async void Install()
        {
            try
            {
                //写入文件
                string dir = "d:\\";
                string fileName = "sample.txt";
                string fullPath = Path.Combine(dir, fileName);
                StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(dir);
                StorageFile writeFile = await storageFolder.CreateFileAsync(fileName, CreationCollisionOption.ReplaceExisting);
                await FileIO.WriteTextAsync(writeFile, DateTime.Now.ToString());

                //读取文件
                StorageFile readFile = await storageFolder.GetFileAsync(fileName);

                //全路径读取
                //StorageFile readFile = await StorageFile.GetFileFromPathAsync(fullPath);
                var stream = await readFile.OpenAsync(FileAccessMode.Read);
                ulong size = stream.Size;
                using (var inputStream = stream.GetInputStreamAt(0))
                {
                    using (var dataReader = new Windows.Storage.Streams.DataReader(inputStream))
                    {
                        uint numBytesLoaded = await dataReader.LoadAsync((uint)size);
                        string text = dataReader.ReadString(numBytesLoaded);
                    }
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public void Setting()
        {
            INavigationService service = IoC.Get<INavigationService>();
            bool ok = service.NavigateToViewModel<SettingViewModel>();
        }
    }
}
