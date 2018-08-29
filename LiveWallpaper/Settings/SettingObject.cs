using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Settings
{
    public class GeneralObject
    {
        public bool StartWithWindows { get; set; }

        public string CurrentLan { get; set; }
    }


    public class SettingObject
    {
        public GeneralObject General { get; set; }
    }
}
