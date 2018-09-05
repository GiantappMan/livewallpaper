using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace LiveWallpaperEngine.Controls
{
    /// <summary>
    /// Interaction logic for RenderWindow.xaml
    /// </summary>
    public partial class RenderWindow : Window
    {
        public RenderWindow()
        {
            InitializeComponent();
            Loaded += RenderWindow_Loaded;
        }

        private void RenderWindow_Loaded(object sender, RoutedEventArgs e)
        {
            Loaded -= RenderWindow_Loaded;

            double width = Screen.AllScreens[0].Bounds.Width;
            double height = Screen.AllScreens[0].Bounds.Height;

            Top = -4;
            Left = 0;
            Width = width;
            Height = height;

            WindowState = WindowState.Maximized;
        }

        #region Wallpaper

        public Wallpaper Wallpaper
        {
            get { return (Wallpaper)GetValue(WallpaperProperty); }
            set { SetValue(WallpaperProperty, value); }
        }

        // Using a DependencyProperty as the backing store for Wallpaper.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty WallpaperProperty =
            DependencyProperty.Register("Wallpaper", typeof(Wallpaper), typeof(RenderWindow), new PropertyMetadata(null));

        #endregion

        public new void Show()
        {
            base.Show();

        }
    }
}
