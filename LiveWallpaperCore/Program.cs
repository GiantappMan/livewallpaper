using System;
using System.Windows.Forms;

namespace LiveWallpaperCore
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.Run(new AppContext());
        }
    }
}
