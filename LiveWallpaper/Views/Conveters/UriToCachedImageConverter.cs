using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Data;
using System.Windows.Media.Imaging;

namespace LiveWallpaper.Views.Conveters
{
    public class UriToCachedImageConverter : IValueConverter
    {
        public int DecodePixelWidth { get; set; }
        public int DecodePixelHeight { get; set; }

        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            if (value == null)
                return null;

            string path = value.ToString();

            try
            {
                if (!string.IsNullOrEmpty(path))
                {
                    BitmapImage bi = new BitmapImage();
                    bi.BeginInit();
                    bi.DecodePixelWidth = DecodePixelWidth;
                    bi.DecodePixelHeight = DecodePixelHeight;
                    bi.UriSource = new Uri(path);
                    bi.CacheOption = BitmapCacheOption.OnLoad;
                    bi.EndInit();
                    return bi;
                }
            }
            catch (Exception)
            {
                return null;
            }

            return null;
        }

        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            throw new NotImplementedException("Two way conversion is not supported.");
        }
    }
}
