using MpvPlayer;
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace LiveWallpaper.WallpaperManager.Controls
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
                new PropertyChangedCallback((sender, e) =>
                {
                    WallpaperRender control = sender as WallpaperRender;
                    var temp = WallpaperManager.ResolveFromFile(e.NewValue.ToString());
                    control.SetValue(WallpaperProperty, temp);
                })));

        #endregion

        #region WallpaperEnabled

        public bool WallpaperEnabled
        {
            get { return (bool)GetValue(WallpaperEnabledProperty); }
            set { SetValue(WallpaperEnabledProperty, value); }
        }

        // Using a DependencyProperty as the backing store for WallpaperEnabled.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty WallpaperEnabledProperty =
            DependencyProperty.Register("WallpaperEnabled", typeof(bool), typeof(WallpaperRender), new PropertyMetadata(true));

        #endregion


        public void Capture(string tmpImg)
        {
            var player = GetChildOfType<MpvPlayerControl>(this as DependencyObject);
            player.ScreenshotToFile(tmpImg);
        }

        public static T GetChildOfType<T>(DependencyObject depObj)
    where T : DependencyObject
        {
            if (depObj == null) return null;

            for (int i = 0; i < VisualTreeHelper.GetChildrenCount(depObj); i++)
            {
                var child = VisualTreeHelper.GetChild(depObj, i);

                var result = (child as T) ?? GetChildOfType<T>(child);
                if (result != null) return result;
            }
            return null;
        }

        #endregion
    }
}
