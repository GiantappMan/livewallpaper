using System;
using System.Collections.ObjectModel;

using Caliburn.Micro;

using LiveWallpaper.Store.Helpers;

using Windows.Media.Core;
using Windows.Media.Playback;

namespace LiveWallpaper.Store.ViewModels
{
    public class DetailViewModel : Screen
    {
        // TODO WTS: Set your default video and image URIs
        private const string DefaultSource = "https://sec.ch9.ms/ch9/db15/43c9fbed-535e-4013-8a4a-a74cc00adb15/C9L12WinTemplateStudio_high.mp4";

        // The poster image is displayed until the video is started
        private const string DefaultPoster = "https://sec.ch9.ms/ch9/db15/43c9fbed-535e-4013-8a4a-a74cc00adb15/C9L12WinTemplateStudio_960.jpg";

        private IMediaPlaybackSource _source;

        public IMediaPlaybackSource Source
        {
            get { return _source; }
            set { Set(ref _source, value); }
        }

        private string _posterSource;

        public string PosterSource
        {
            get { return _posterSource; }
            set { Set(ref _posterSource, value); }
        }

        public DetailViewModel()
        {
            Source = MediaSource.CreateFromUri(new Uri(DefaultSource));
            PosterSource = DefaultPoster;
        }
    }
}
