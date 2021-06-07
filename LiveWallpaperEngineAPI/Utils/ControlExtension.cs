using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Giantapp.LiveWallpaper.Engine.Utils
{
    internal static class ControlExtension
    {
        public static void InvokeIfRequired(this Control control, Action a)
        {
            if (control.InvokeRequired)
                control.Invoke(a);
            else
                a();
        }
    }
}
