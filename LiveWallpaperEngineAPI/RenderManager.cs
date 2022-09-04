using Giantapp.LiveWallpaper.Engine.Renders;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Giantapp.LiveWallpaper.Engine
{
    /// <summary>
    /// 定义render类型的实现
    /// </summary>
    /// <typeparam name="Render"></typeparam>
    public static class RenderManager
    {
        public static List<IRender> Renders { get; set; } = new List<IRender>();

        public static IRender? GetRender(WallpaperType dType)
        {
            foreach (var instance in Renders)
            {
                if (instance.SupportType == dType)
                    return instance;
            }

            return null;
        }

        public static IRender? GetRenderByExtension(string? extension)
        {
            if (extension == null)
                return null;
            foreach (var instance in Renders)
            {
                var exist = instance.SupportExtension.FirstOrDefault(m => m == extension.ToLower());
                if (exist != null)
                    return instance;
            }

            return null;
        }

        internal static IRender? GetRender(WallpaperModel wallpaper)
        {
            if (wallpaper == null)
                return null;
            if (wallpaper.RunningData.Type != null)
                return GetRender(wallpaper.RunningData.Type.Value);
            else if (!string.IsNullOrEmpty(wallpaper.RunningData.AbsolutePath))
                return GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
            return null;
        }

        //public static WallpaperType? ResoveType(string filePath)
        //{
        //    var extension = Path.GetExtension(filePath);
        //    foreach (var render in Renders)
        //    {
        //        var exist = render.SupportedExtension.FirstOrDefault(m => m == extension.ToLower());
        //        if (exist != null)
        //            return render.SupportedType;
        //    }
        //    return null;
        //}
    }
}
