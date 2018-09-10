using Caliburn.Micro;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;

namespace LiveWallpaper.ViewModels
{
    public class ScreenWindow : Screen
    {
        public void ActiveUI()
        {
            var view = GetView();
            if (view is Window window)
            {
                if (window.WindowState == WindowState.Minimized)
                    window.WindowState = WindowState.Normal;
                window.Activate();
            }
        }
    }
}
