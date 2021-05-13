using NLog;
using System;
using System.Threading;
using System.Windows.Forms;

namespace LiveWallpaper
{
    class Program
    {
        [STAThread]
        static void Main()
        {
            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Application.Run(new AppContext());
        }
    }
}
