using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using LiveWallpaper.Configs;
using LiveWallpaper.Helpers;
using LiveWallpaper.Server.Models;
using LiveWallpaper.Wallpapers;
using IO = System.IO;

namespace LiveWallpaper.Views
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class CreateWallpaperView : Window
    {
        public CreateWallpaperView()
        {
            InitializeComponent();
        }
    }
}
