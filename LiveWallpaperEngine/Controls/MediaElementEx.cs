using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace LiveWallpaperEngine.Controls
{
    public class MediaElementEx : MediaElement
    {
        public MediaElementEx()
        {
            LoadedBehavior = MediaState.Manual;
            //UnloadedBehavior = MediaState.Manual;
            MediaEnded += MediaElementEx_MediaEnded;
            IsEnabledChanged += MediaElementEx_IsEnabledChanged;
            Play();
        }

        private void MediaElementEx_SourceUpdated(object sender, System.Windows.Data.DataTransferEventArgs e)
        {
            Play();
        }

        private async void MediaElementEx_IsEnabledChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            if (IsEnabled)
            {
                await Task.Delay(1000);
                Play();
            }
            else
                Pause();
        }

        private void MediaElementEx_MediaEnded(object sender, System.Windows.RoutedEventArgs e)
        {
            var mediaElement = sender as MediaElement;
            mediaElement.Position = new TimeSpan(0, 0, 0);
        }
    }
}
