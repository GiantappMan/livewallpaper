using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Store.Models.Settngs
{
    public class GeneralSetting
    {
        public string WallpaperSaveDir { get; set; }

        internal static GeneralSetting GetDefault()
        {
            return new GeneralSetting();
        }
    }
}
