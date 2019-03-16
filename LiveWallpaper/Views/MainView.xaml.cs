using LiveWallpaper.Managers;
using LiveWallpaper.ViewModels;
using LiveWallpaperEngineLib;
using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Interop;
using System.Windows.Threading;

namespace LiveWallpaper.Views
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainView
    {
        public MainView()
        {
            InitializeComponent();
            Activated += MainView_Activated;
            Closed += MainView_Closed;
            Loaded += OnLoaded;
        }

        private void MainView_Closed(object sender, EventArgs e)
        {
            Loaded -= OnLoaded;
            Closed -= MainView_Closed;
            Activated -= MainView_Activated;
            DataContext = null;
        }

        private void MainView_Activated(object sender, EventArgs e)
        {
            if (!(DataContext is MainViewModel vm))
                return;

            vm.RefreshLocalWallpaper();
        }

        private void Btn_CreateWallpaper(object sender, RoutedEventArgs e)
        {
            CreateWallpaperView createWindow = new CreateWallpaperView();
            createWindow.Show();
            createWindow.Closed += CreateWindow_Closed;
        }

        private void CreateWindow_Closed(object sender, EventArgs e)
        {
            CreateWallpaperView createWindow = sender as CreateWallpaperView;
            createWindow.Closed -= CreateWindow_Closed;
        }

        private const int WmExitSizeMove = 0x232;

        private async void OnLoaded(object sender, RoutedEventArgs args)
        {
            var helper = new WindowInteropHelper(this);
            if (helper.Handle != null)
            {
                var source = HwndSource.FromHwnd(helper.Handle);
                if (source != null)
                    source.AddHook(HwndMessageHook);
            }

            if ((DataContext is MainViewModel vm))
            {
                await vm.OnLoaded();

                Width = vm.Width;
                Height = vm.Height;
            }
        }

        private IntPtr HwndMessageHook(IntPtr wnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            switch (msg)
            {
                case WmExitSizeMove:
                    if ((DataContext is MainViewModel vm))
                        vm.SaveSizeData(Width, Height);
                    handled = true;
                    break;
            }
            return IntPtr.Zero;
        }
    }
}
