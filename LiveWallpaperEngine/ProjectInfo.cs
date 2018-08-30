using DZY.DotNetUtil.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngine
{
    /// <summary>
    /// 壁纸工程的详细信息
    /// </summary>
    public class ProjectInfo : ObservableObject
    {
        #region Description

        /// <summary>
        /// The <see cref="Description" /> property's name.
        /// </summary>
        public const string DescriptionPropertyName = "Description";

        private string _Description;

        /// <summary>
        /// Description
        /// </summary>
        public string Description
        {
            get { return _Description; }

            set
            {
                if (_Description == value) return;

                _Description = value;
                NotifyOfPropertyChange(DescriptionPropertyName);
            }
        }

        #endregion

        #region Title

        /// <summary>
        /// The <see cref="Title" /> property's name.
        /// </summary>
        public const string TitlePropertyName = "Title";

        private string _Title;

        /// <summary>
        /// Title
        /// </summary>
        public string Title
        {
            get { return _Title; }

            set
            {
                if (_Title == value) return;

                _Title = value;
                NotifyOfPropertyChange(TitlePropertyName);
            }
        }

        #endregion

        #region File

        /// <summary>
        /// The <see cref="File" /> property's name.
        /// </summary>
        public const string FilePropertyName = "File";

        private string _File;

        /// <summary>
        /// File
        /// </summary>
        public string File
        {
            get { return _File; }

            set
            {
                if (_File == value) return;

                _File = value;
                NotifyOfPropertyChange(FilePropertyName);
            }
        }

        #endregion

        #region Preview

        /// <summary>
        /// The <see cref="Preview" /> property's name.
        /// </summary>
        public const string PreviewPropertyName = "Preview";

        private string _Preview;

        /// <summary>
        /// Preview
        /// </summary>
        public string Preview
        {
            get { return _Preview; }

            set
            {
                if (_Preview == value) return;

                _Preview = value;
                NotifyOfPropertyChange(PreviewPropertyName);
            }
        }

        #endregion

        #region Type

        /// <summary>
        /// The <see cref="Type" /> property's name.
        /// </summary>
        public const string TypePropertyName = "Type";

        private string _Type;

        /// <summary>
        /// Type
        /// </summary>
        public string Type
        {
            get { return _Type; }

            set
            {
                if (_Type == value) return;

                _Type = value;
                NotifyOfPropertyChange(TypePropertyName);
            }
        }

        #endregion

        #region Visibility

        /// <summary>
        /// The <see cref="Visibility" /> property's name.
        /// </summary>
        public const string VisibilityPropertyName = "Visibility";

        private string _Visibility;

        /// <summary>
        /// Visibility
        /// </summary>
        public string Visibility
        {
            get { return _Visibility; }

            set
            {
                if (_Visibility == value) return;

                _Visibility = value;
                NotifyOfPropertyChange(VisibilityPropertyName);
            }
        }

        #endregion

        #region Tags

        /// <summary>
        /// The <see cref="Tags" /> property's name.
        /// </summary>
        public const string TagsPropertyName = "Tags";

        private List<string> _Tags;

        /// <summary>
        /// Tags
        /// </summary>
        public List<string> Tags
        {
            get { return _Tags; }

            set
            {
                if (_Tags == value) return;

                _Tags = value;
                NotifyOfPropertyChange(TagsPropertyName);
            }
        }

        #endregion
    }
}
