using DZY.DotNetUtil.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Server
{
    public class WallpaperServerObj : ObservableObject
    {
        #region URL

        /// <summary>
        /// The <see cref="URL" /> property's name.
        /// </summary>
        public const string URLPropertyName = "URL";

        private string _URL;

        /// <summary>
        /// URL
        /// </summary>
        public string URL
        {
            get { return _URL; }

            set
            {
                if (_URL == value) return;

                _URL = value;
                NotifyOfPropertyChange(URLPropertyName);
            }
        }

        #endregion

        #region Img

        /// <summary>
        /// The <see cref="Img" /> property's name.
        /// </summary>
        public const string ImgPropertyName = "Img";

        private string _Img;

        /// <summary>
        /// Img
        /// </summary>
        public string Img
        {
            get { return _Img; }

            set
            {
                if (_Img == value) return;

                _Img = value;
                NotifyOfPropertyChange(ImgPropertyName);
            }
        }

        #endregion

        #region Name

        /// <summary>
        /// The <see cref="Name" /> property's name.
        /// </summary>
        public const string NamePropertyName = "Name";

        private string _Name;

        /// <summary>
        /// Name
        /// </summary>
        public string Name
        {
            get { return _Name; }

            set
            {
                if (_Name == value) return;

                _Name = value;
                NotifyOfPropertyChange(NamePropertyName);
            }
        }

        #endregion

        #region DownStr

        /// <summary>
        /// The <see cref="DownStr" /> property's name.
        /// </summary>
        public const string DownStrPropertyName = "DownStr";

        private string _DownStr;

        /// <summary>
        /// DownStr
        /// </summary>
        public string DownStr
        {
            get { return _DownStr; }

            set
            {
                if (_DownStr == value) return;

                _DownStr = value;
                NotifyOfPropertyChange(DownStrPropertyName);
            }
        }

        #endregion
    }
}
