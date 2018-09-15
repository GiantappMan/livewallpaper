using DZY.WinAPI;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Forms;

namespace LiveWallpaperEngine
{
    public class OtherProgramChecker
    {
        private bool _maximized = false;
        private static Process _currentProcess;

        public OtherProgramChecker(Process currentProcess)
        {
            _currentProcess = currentProcess;
        }

        public bool CheckMaximized()
        {
            bool ok = User32Wrapper.EnumDesktopWindows(IntPtr.Zero, new User32Wrapper.EnumDelegate(EnumDesktopWindowsCallBack), IntPtr.Zero);
            return _maximized;
        }

        private bool EnumDesktopWindowsCallBack(IntPtr hWnd, int lParam)
        {
            //过滤当前进程
            int pid = User32Wrapper.GetProcessId(hWnd);
            if (pid == _currentProcess.Id)
                return true;

            _maximized = WallpaperManager.IsMAXIMIZED(hWnd);
            if (_maximized)
                return false;

            return true;
        }

    }
}
