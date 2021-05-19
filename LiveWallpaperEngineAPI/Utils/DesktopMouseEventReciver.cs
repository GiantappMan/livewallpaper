// 参考ADD-SP的PR https://github.com/giant-app/LiveWallpaperEngine/pull/13 ，修改为c#版本
// 感谢https://github.com/ADD-SP 的提交
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using EventHook;
using EventHook.Hooks;
using WinAPI;

namespace Giantapp.LiveWallpaper.Engine.Utils
{

    /// <summary>
    /// 监听桌面鼠标消息
    /// </summary>
    public static class DesktopMouseEventReciver
    {
        private class TargetWindow
        {
            public TargetWindow(IntPtr handle, string screen)
            {
                Handle = handle;
                Screen = screen;
            }

            public IntPtr Handle { get; set; }
            public string Screen { get; set; }

        }
        private static readonly List<TargetWindow> _targetWindows = new();
        private static readonly EventHookFactory eventHookFactory = new();
        private static MouseWatcher mouseWatcher;
        private static bool started = false;
        private static DateTime _nextSendTime;

        //转发间隔，防止消阻塞
        public static int SendInterval { get; set; } = 0;

        public static Task AddHandle(IntPtr handle, string screen)
        {
            return Task.Run(() =>
            {
                System.Diagnostics.Debug.WriteLine($"AddHandle {handle}");
                var threadSafeList = ArrayList.Synchronized(_targetWindows);
                threadSafeList.Add(new TargetWindow(handle, screen));
                if (threadSafeList.Count > 0)
                    Start();
            });
        }
        public static Task RemoveHandle(IntPtr handle)
        {
            return Task.Run(() =>
            {
                System.Diagnostics.Debug.WriteLine($"RemoveHandle {handle}");
                var threadSafeList = ArrayList.Synchronized(_targetWindows);
                var exist = _targetWindows.FirstOrDefault(m => m.Handle == handle);
                if (exist == null)
                    return;
                threadSafeList.Remove(exist);
                if (threadSafeList.Count == 0)
                    Stop();
            });
        }
        private static void Stop()
        {
            mouseWatcher?.Stop();
            started = false;
        }

        private static void Start()
        {
            if (started)
                return;

            mouseWatcher = eventHookFactory.GetMouseWatcher();
            mouseWatcher.Start();
            mouseWatcher.OnMouseInput += (s, e) =>
            {
                if (SendInterval > 0)
                {
                    if (DateTime.Now < _nextSendTime)
                        return;

                    _nextSendTime = DateTime.Now + TimeSpan.FromMilliseconds(SendInterval);
                }

                //cef收到鼠标事件后会自动active，看有办法规避不
                //点击等事件只在桌面触发，否则可能导致窗口胡乱激活
                if (!WallpaperHelper.IsDesktop() && e.Message != MouseMessages.WM_MOUSEMOVE)
                    return;

                //MouseMessages[] supportMessage = new MouseMessages[] { MouseMessages.WM_MOUSEMOVE, MouseMessages.WM_LBUTTONDOWN, MouseMessages.WM_LBUTTONUP };
                //MouseMessages[] supportMessage = new MouseMessages[] { MouseMessages.WM_MOUSEMOVE };

                //if (!supportMessage.Contains(e.Message))
                //    return;

                int x = e.Point.x;
                int y = e.Point.y;
                var currentDisplay = Screen.FromPoint(new System.Drawing.Point(x, y));

                if (x < 0)
                    x = SystemInformation.VirtualScreen.Width + x - Screen.PrimaryScreen.Bounds.Width;
                else
                    x -= Math.Abs(currentDisplay.Bounds.X);

                if (y < 0)
                    y = SystemInformation.VirtualScreen.Height + y - Screen.PrimaryScreen.Bounds.Height;
                else
                    y -= Math.Abs(currentDisplay.Bounds.Y);

                // 根据官网文档中定义，lParam低16位存储鼠标的x坐标，高16位存储y坐标
                int lParam = y;
                lParam <<= 16;
                lParam |= x;
                // 发送消息给目标窗口

                IntPtr wParam = (IntPtr)0x0020;

                foreach (var window in _targetWindows)
                {
                    if (window.Screen != currentDisplay.DeviceName)
                        continue;

                    User32Wrapper.PostMessageW(window.Handle, (uint)e.Message, wParam, (IntPtr)lParam);
                }

                //System.Diagnostics.Debug.WriteLine("Mouse event {0} --000-- {1},{2}", e.Message.ToString(), e.Point.x, e.Point.y);
                //System.Diagnostics.Debug.WriteLine("Mouse event {0} {1},{2}", e.Message.ToString(), x, y);
            };

            started = true;
        }
    }
}
