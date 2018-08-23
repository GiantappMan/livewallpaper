using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Models.Settings
{
    public class General
    {
        public bool StartWithWindows { get; set; }

        public string CurrentLan { get; set; }
    }


    public class Setting
    {
        public General General { get; set; }
    }
}
