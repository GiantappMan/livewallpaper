using DZY.DotNetUtil.ViewModels;
using System;
using System.Collections.Generic;
using System.IO;
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
        /// <summary>
        /// 壁纸的绝对路径
        /// </summary>
        public string AbsolutePath { get; set; }

        public string ExeName { get; internal set; }
        public string ExePath { get; internal set; }
        public object ExeArgs { get; internal set; }

        public Wallpaper()
        {

        }

        public Wallpaper(ProjectInfo info, string infoPath)
        {
            ProjectInfo = info;
            string dir = Path.GetDirectoryName(infoPath);
            AbsolutePath = Path.Combine(dir, info.File);
        }

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

        public static WallpaperType GetType(Wallpaper w)
        {
            if (w == null || w.ProjectInfo == null)
                return WallpaperType.NotSupport;

            return GetType(w.ProjectInfo.Type);
        }

        public static WallpaperType GetType(string type)
        {
            bool ok = Enum.TryParse(type, true, out WallpaperType r);
            if (!ok)
                return WallpaperType.NotSupport;
            return r;
        }
    }
}

