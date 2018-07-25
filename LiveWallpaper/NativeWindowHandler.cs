using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper
{
    public class NativeWindowHandler
    {

        public NativeWindowHandler()
        {
        }

        private const int WM_CLOSE = 0x0010;
        private const int SW_SHOWNORMAL = 1;
        private const int SW_SHOWMINIMIZED = 2;
        private const int SW_SHOWMAXIMIZED = 3;


        [DllImport("user32.dll")]
        private static extern int SendMessage(int hWnd,
            int Msg,
            int wParam,
            int lParam);

        [DllImport("user32.dll")]
        private static extern int GetForegroundWindow();

        [DllImport("user32")]
        private static extern int ShowWindow(int hwnd, int nCmdShow);


        public Int32 GetWnd(string processName)
        {
            Process[] processes = Process.GetProcessesByName(processName);
            if (processes.Length == 0)
                throw new ArgumentException("Process Name " + processName +
                    " not running!");

            return processes[0].MainWindowHandle.ToInt32();
        }


        public Int32 GetForegroundWindowEx()
        {
            return GetForegroundWindow();
        }


        public void CloseWindow(Int32 handle)
        {
            SendMessage(handle, WM_CLOSE, 0, 0);
        }


        public void MinimizeWindow(Int32 handle)
        {
            ShowWindow(handle, SW_SHOWMINIMIZED);
        }


        public void MaximizeWindow(Int32 handle)
        {
            ShowWindow(handle, SW_SHOWMAXIMIZED);
        }


        public void NormalizeWindow(Int32 handle)
        {
            ShowWindow(handle, SW_SHOWNORMAL);
        }
    }
}
