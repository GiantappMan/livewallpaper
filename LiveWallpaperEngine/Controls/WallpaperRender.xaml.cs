using System;
using System.Collections.Generic;
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

namespace LiveWallpaperEngine.Controls
{
    /// <summary>
    /// Interaction logic for WallpaperRender.xaml
    /// </summary>
    public partial class WallpaperRender : UserControl
    {
        public WallpaperRender()
        {
            InitializeComponent();
        }

        #region properties

        #region DragTips

        public object DragTips
        {
            get { return (object)GetValue(DragTipsProperty); }
            set { SetValue(DragTipsProperty, value); }
        }

        // Using a DependencyProperty as the backing store for DragTips.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty DragTipsProperty =
            DependencyProperty.Register("DragTips", typeof(object), typeof(WallpaperRender), new PropertyMetadata(null));

        #endregion

        #region Wallpaper

        public Wallpaper Wallpaper
        {
            get { return (Wallpaper)GetValue(WallpaperProperty); }
            set { SetValue(WallpaperProperty, value); }
        }

        // Using a DependencyProperty as the backing store for Wallpaper.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty WallpaperProperty =
            DependencyProperty.Register("Wallpaper", typeof(Wallpaper), typeof(WallpaperRender), new PropertyMetadata(null, new PropertyChangedCallback((sender, e) =>
            {

            })));

        #endregion

        #region FilePath

        public string FilePath
        {
            get { return (string)GetValue(FilePathProperty); }
            set { SetValue(FilePathProperty, value); }
        }

        // Using a DependencyProperty as the backing store for FilePath.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty FilePathProperty =
            DependencyProperty.Register("FilePath", typeof(string), typeof(WallpaperRender), new PropertyMetadata(null,
                new PropertyChangedCallback(async (sender, e) =>
                {
                    WallpaperRender control = sender as WallpaperRender;
                    var temp = await WallpaperManager.ResolveFromFile(e.NewValue.ToString());
                    control.SetValue(WallpaperProperty, temp);
                })));


        #endregion

        #endregion

        public void ShowPaper(Wallpaper Wwallpaper)
        {

        }

        public void ClosePaper()
        {

        }
    }
}
