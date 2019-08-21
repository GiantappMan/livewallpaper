using Caliburn.Micro;
using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Windows;
using LiveWallpaper.WallpaperManager;
using LiveWallpaper.Managers;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Dynamic;
using LiveWallpaper.Events;
using System.Windows.Interop;
using LiveWallpaper.Views;
using LiveWallpaperEngine;
using System.Collections.Generic;
using DZY.Util.WPF;
using DZY.Util.WPF.Views;
using DZY.Util.Common.Helpers;
using DZY.Util.WPF.ViewModels;

namespace LiveWallpaper.ViewModels
{
    public class MainViewModel : ScreenWindow, IHandle<SettingSaved>
    {
        private static NLog.Logger _logger = NLog.LogManager.GetCurrentClassLogger();
        private CreateWallpaperViewModel _createVM;
        IEventAggregator _eventAggregator;
        const float sourceWidth = 436;
        const float sourceHeight = 337;
        bool _firstLaunch = true;

        public MainViewModel(IEventAggregator eventAggregator)
        {
            _eventAggregator = eventAggregator;
            _eventAggregator.Subscribe(this);
            for (int i = 0; i < LiveWallpaperEngineManager.AllScreens.Count; i++)
            {
                Displays.Add(i + 1);
            }
            MultiDiplay = AppManager.Setting.Wallpaper.DisplayMonitor < 0 && LiveWallpaperEngineManager.AllScreens.Count > 1;
        }

        protected override void OnViewReady(object view)
        {
            base.OnViewReady(view);
        }

        #region public methods

        public async Task OnLoaded()
        {
            if (_firstLaunch)
            {
                AppManager.Run();
                //第一次时打开检查更新
                var handle = (new WindowInteropHelper(Application.Current.MainWindow)).Handle;
                await Task.Run(() =>
                 {
                     AppManager.MainHandle = handle;
                     AppManager.CheckUpates(handle);
                 });

                DZY.Util.Common.Helpers.AppHelper AppHelper = new DZY.Util.Common.Helpers.AppHelper();
                //0.0069444444444444, 0.0138888888888889 10/20分钟
                bool canPrpmpt = AppHelper.ShouldPrompt(new WPFPurchasedDataManager(AppManager.PurchaseDataPath), 15, 30);
                if (canPrpmpt)
                {
                    var windowManager = IoC.Get<IWindowManager>();

                    var view = new PurchaseTipsView();
                    var vm = new PurchaseTipsViewModel()
                    {
                        BGM = new Uri("Res//Sounds//PurchaseTipsBg.mp3", UriKind.RelativeOrAbsolute),
                        Content = new DefaultPurchaseTipsContent(),
                        PurchaseContent = "真可怜，给他买个包子吧",
                        RatingContent = "造孽啊，给个精神抚慰吧",
                    };
                    vm.Initlize(AppManager.GetPurchaseViewModel());
                    view.DataContext = vm;
                    view.Show();
                }

                _firstLaunch = false;

                if (AppManager.Setting.General.MinimizeUI)
                    TryClose();
            }

            Wallpapers = new ObservableCollection<Wallpaper>(AppManager.Wallpapers);

            if (AppManager.Setting.General.RecordWindowSize)
            {
                Width = AppManager.Setting.General.Width;
                Height = AppManager.Setting.General.Height;
            }
        }

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
            dynamic windowSettings = new ExpandoObject();
            windowSettings.WindowStartupLocation = WindowStartupLocation.CenterOwner;
            windowSettings.Owner = GetView();
            windowManager.ShowWindow(_createVM, null, windowSettings);
        }

        public async void SaveSizeData(double width, double height)
        {
            if (AppManager.SettingInitialized && AppManager.Setting.General.RecordWindowSize)
            {
                Width = width;
                Height = height;
                AppManager.Setting.General.Width = Width;
                AppManager.Setting.General.Height = Height;
                await JsonHelper.JsonSerializeAsync(AppManager.Setting, AppManager.SettingPath);
            }
        }

        public void EditWallpaper(Wallpaper s)
        {
            CreateWallpaper();
            _createVM.SetPaper(s);
        }

        private void _createVM_Deactivated(object sender, DeactivationEventArgs e)
        {
            _createVM.Deactivated -= _createVM_Deactivated;
            if (_createVM.Result)
            {
                RefreshLocalWallpaper();
            }
            _createVM = null;
        }

        public override object GetView(object context = null)
        {
            return base.GetView(context);
        }

        private bool _refreshing = false;

        public async void RefreshLocalWallpaper()
        {
            if (_refreshing)
                return;

            await Task.Run(() =>
            {
                _refreshing = true;
                AppManager.RefreshLocalWallpapers();
                Wallpapers = new ObservableCollection<Wallpaper>(AppManager.Wallpapers);
                _refreshing = false;
            });
        }

        public void ExploreWallpaper(Wallpaper s)
        {
            try
            {
                string path = s.AbsolutePath;
                DesktopBridge.Helpers helpers = new DesktopBridge.Helpers();
                if (helpers.IsRunningAsUwp())
                    //https://stackoverflow.com/questions/48849076/uwp-app-does-not-copy-file-to-appdata-folder
                    path = path.Replace(AppManager.AppDataDir, AppManager.UWPRealAppDataDir);
                Process.Start("Explorer.exe", $" /select, {path}");
            }
            catch (Exception ex)
            {
                _logger.Error(ex);
                MessageBox.Show(ex.Message);
            }
        }

        public async void DeleteWallpaper(Wallpaper w)
        {
            bool ok = false;
            try
            {
                ok = await LiveWallpaper.WallpaperManager.WallpaperManager.Delete(w);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            if (!ok)
                MessageBox.Show("删除失败请手动删除");

            RefreshLocalWallpaper();
        }

        public async void ApplyWallpaper(Wallpaper w)
        {
            await AppManager.ShowWallpaper(w, -1);
        }

        Wallpaper _lastOverWallpaper;
        public void ApplyLastWallpaper(Wallpaper w)
        {
            _lastOverWallpaper = w;
        }

        public async void ApplyWallpaperToDisplay(int display)
        {
            if (_lastOverWallpaper == null)
                return;

            await AppManager.ShowWallpaper(_lastOverWallpaper, display - 1);
        }

        public void Setting()
        {
            IoC.Get<ContextMenuViewModel>().Config(GetView());
        }

        public async void OpenLocalServer()
        {
            //string serverFile = Path.Combine(AppManager.ApptEntryDir, "Res\\LiveWallpaperServer\\LiveWallpaperServer.exe");
            //Process.Start(serverFile);

            var wallpaperDir = AppManager.LocalWallpaperDir;
            wallpaperDir = wallpaperDir.Replace(AppManager.AppDataDir, AppManager.UWPRealAppDataDir);

            if (!Directory.Exists(wallpaperDir))
                //没有文件夹UWP会报错
                Directory.CreateDirectory(wallpaperDir);

            //host={AppManager.Setting.Server.ServerUrl}&
            Uri uri = new Uri($"live.wallpaper.store://?wallpaper={wallpaperDir}");

#pragma warning disable UWP003 // UWP-only
            bool success = await Windows.System.Launcher.LaunchUriAsync(uri);
#pragma warning restore UWP003 // UWP-only
        }

        public void Handle(SettingSaved message)
        {
            MultiDiplay = AppManager.Setting.Wallpaper.DisplayMonitor < 0 && LiveWallpaperEngineManager.AllScreens.Count > 1;

            if (AppManager.Setting.General.RecordWindowSize)
            {
                Width = AppManager.Setting.General.Width;
                Height = AppManager.Setting.General.Height;
            }
            else
            {
                Width = sourceWidth;
                Height = sourceHeight;
            }

            RefreshLocalWallpaper();
        }

        public void DownloadStore()
        {
            try
            {
                Process.Start("https://www.mscoder.cn/product/livewallpaperstore/");
            }
            catch (Exception)
            {
            }
        }

        #endregion

        #region properties

        #region Displays

        /// <summary>
        /// The <see cref="Displays" /> property's name.
        /// </summary>
        public const string DisplaysPropertyName = "Displays";

        private List<int> _Displays = new List<int>();

        /// <summary>
        /// Displays
        /// </summary>
        public List<int> Displays
        {
            get { return _Displays; }

            set
            {
                if (_Displays == value) return;

                _Displays = value;
                NotifyOfPropertyChange(DisplaysPropertyName);
            }
        }

        #endregion

        #region MultiDiplay

        /// <summary>
        /// The <see cref="MultiDiplay" /> property's name.
        /// </summary>
        public const string MultiDiplayPropertyName = "MultiDiplay";

        private bool _MultiDiplay;

        /// <summary>
        /// MultiDiplay
        /// </summary>
        public bool MultiDiplay
        {
            get { return _MultiDiplay; }

            set
            {
                if (_MultiDiplay == value) return;

                _MultiDiplay = value;
                NotifyOfPropertyChange(MultiDiplayPropertyName);
            }
        }

        #endregion

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

        #region Width

        /// <summary>
        /// The <see cref="Width" /> property's name.
        /// </summary>
        public const string WidthPropertyName = "Width";

        private double _Width = sourceWidth;

        /// <summary>
        /// Width
        /// </summary>
        public double Width
        {
            get { return _Width; }

            set
            {
                if (_Width == value) return;

                _Width = value;
                NotifyOfPropertyChange(WidthPropertyName);
            }
        }

        #endregion

        #region Height

        /// <summary>
        /// The <see cref="Height" /> property's name.
        /// </summary>
        public const string HeightPropertyName = "Height";

        private double _Height = sourceHeight;

        /// <summary>
        /// Height
        /// </summary>
        public double Height
        {
            get { return _Height; }

            set
            {
                if (_Height == value) return;

                _Height = value;
                NotifyOfPropertyChange(HeightPropertyName);
            }
        }

        #endregion

        #endregion
    }
}
