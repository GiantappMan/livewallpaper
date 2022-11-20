using GiantappUI.ViewModels;
using System.Windows;

namespace LiveWallpaper
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            DataContext = new WebView2ShellViewModel();
        }
    }
}
