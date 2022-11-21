using GiantappUI.ViewModels;
using System;
using System.Windows;

namespace LiveWallpaper
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private static MainWindow? _mainWindow;

        public enum PageType
        {
            Setting,//设置
            Local,//本地壁纸
            Community//社区
        }

        private MainWindow()
        {
            InitializeComponent();
            DataContext = new WebView2ShellViewModel();
        }

        public static void ShowUI(PageType type)
        {
            if (_mainWindow != null)
            {
                _mainWindow.Activate();
            }
            else
            {
                _mainWindow = new();
                _mainWindow.Closed += MainWindow_Closed;
                _mainWindow.Show();
            }
        }

        private static void MainWindow_Closed(object sender, EventArgs e)
        {
            if (_mainWindow != null)
                _mainWindow.Closed -= MainWindow_Closed;
            _mainWindow = null;
        }
    }
}
