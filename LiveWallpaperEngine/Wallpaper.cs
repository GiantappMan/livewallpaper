using DZY.DotNetUtil.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngine
{
    /// <summary>
    /// 表示一个壁纸
    /// </summary>
    public class Wallpaper : ObservableObject
    {
        public string AbsolutePath { get; set; }
        #region ProjectInfo

        /// <summary>
        /// The <see cref="ProjectInfo" /> property's name.
        /// </summary>
        public const string ProjectInfoPropertyName = "ProjectInfo";

        private ProjectInfo _ProjectInfo;

        /// <summary>
        /// ProjectInfo
        /// </summary>
        public ProjectInfo ProjectInfo
        {
            get { return _ProjectInfo; }

            set
            {
                if (_ProjectInfo == value) return;

                _ProjectInfo = value;
                NotifyOfPropertyChange(ProjectInfoPropertyName);
            }
        }

        #endregion
    }
}

