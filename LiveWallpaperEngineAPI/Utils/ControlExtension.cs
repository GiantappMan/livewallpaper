using System;
using System.Windows.Forms;

namespace Giantapp.LiveWallpaper.Engine.Utils
{
    internal static class ControlExtension
    {
        public static void InvokeIfRequired(this Control control, Action a)
        {
            try
            {
                if (control.InvokeRequired)
                    control.Invoke(a);
                else
                    a();
            }
            catch (Exception e)
            {

            }
        }
    }
}
