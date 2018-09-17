using DZY.WinAPI;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
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

            _maximized = IsMAXIMIZED(hWnd);
            if (_maximized)
                return false;

            return true;
        }


        /// <summary>
        /// 窗口是否是最大化
        /// </summary>
        /// <param name="handle"></param>
        /// <returns></returns>
        public static bool IsMAXIMIZED(IntPtr handle)
        {
            WINDOWPLACEMENT placment = new WINDOWPLACEMENT();
            User32Wrapper.GetWindowPlacement(handle, ref placment);
            bool visible = User32Wrapper.IsWindowVisible(handle);
            if (visible)
            {
                if (placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWMAXIMIZED)
                {//窗口最大化
                    // Exclude suspended Windows apps
                    int ok = DwmapiWrapper.DwmGetWindowAttribute(handle, DwmapiWrapper.DWMWINDOWATTRIBUTE.DWMWA_CLOAKED, out var cloaked, Marshal.SizeOf<bool>());
                    //隐藏的UWP窗口
                    if (cloaked)
                    {
                        return false;
                    }
                    return true;
                }

                ////判断一些隐藏窗口
                ////http://forums.codeguru.com/showthread.php?445207-Getting-HWND-of-visible-windows
                //var wl = User32Wrapper.GetWindowLong(handle, WindowLongConstants.GWL_STYLE) & WindowStyles.WS_EX_APPWINDOW;
                //if (wl <= 0)
                //    return false;

                //判断是否是游戏全屏
                User32Wrapper.GetWindowRect(handle, out var r);
                if (r.Left == 0 && r.Top == 0)
                {
                    int with = r.Right - r.Left;
                    int height = r.Bottom - r.Top;

                    if (height == System.Windows.Forms.Screen.PrimaryScreen.Bounds.Height
                        && with == System.Windows.Forms.Screen.PrimaryScreen.Bounds.Width)
                    {
                        //当前窗口最大化，进入了游戏
                        var foregroundWIndow = User32Wrapper.GetForegroundWindow();
                        if (foregroundWIndow == handle)
                        {
                            var windowText = User32Wrapper.GetWindowText(handle);
                            return true;
                        }
                    }
                }
            }
            return false;
        }

    }
}
