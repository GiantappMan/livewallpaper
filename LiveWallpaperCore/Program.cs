using NLog;
using System;
using System.Threading;
using System.Windows.Forms;

namespace LiveWallpaper
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.Run(new AppContext());
        }
    }
}
