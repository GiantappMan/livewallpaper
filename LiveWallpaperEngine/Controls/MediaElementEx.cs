using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Controls;

namespace LiveWallpaperEngine.Controls
{
    public class MediaElementEx : MediaElement
    {
        public MediaElementEx()
        {
            UnloadedBehavior = MediaState.Play;
            MediaEnded += MediaElementEx_MediaEnded;
        }

        private void MediaElementEx_MediaEnded(object sender, System.Windows.RoutedEventArgs e)
        {
            var mediaElement = sender as MediaElement;
            mediaElement.Position = new TimeSpan(0, 0, 0);
        }
    }
}
