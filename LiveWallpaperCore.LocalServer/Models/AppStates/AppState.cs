using System;
using System.Collections.Generic;
using System.Text;

namespace LiveWallpaperCore.LocalServer.Models.AppStates
{
    public class AppState
    {
        public bool IsBusy { get; set; }
        //0-1
        public float BusyProgressPercent { get; set; }
        public string BusyDesc { get; set; }
    }
}
