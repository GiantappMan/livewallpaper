using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace LiveWallpaperEngine.Controls
{
    public class RenderInfoSelector : DataTemplateSelector
    {
        public DataTemplate VideoTemplate { get; set; }
        public override DataTemplate SelectTemplate(object item, DependencyObject container)
        {
            Wallpaper wallpaper = item as Wallpaper;
            if (wallpaper == null || wallpaper.ProjectInfo == null)
                return null;

            var type = Wallpaper.GetType(wallpaper);
            switch (type)
            {
                case WallpaperType.Video:
                    return VideoTemplate;
            }
            return null;
        }
    }
}
