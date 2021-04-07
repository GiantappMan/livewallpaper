using System.Collections.Generic;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    public class ExeRender : ExternalProcessRender
    {
        public ExeRender() : base(WallpaperType.Exe, new List<string>() { ".exe" })
        {

        }
    }
}
