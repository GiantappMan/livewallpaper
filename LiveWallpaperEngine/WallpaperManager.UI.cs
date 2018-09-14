using Caliburn.Micro;
using DZY.WinAPI;
using LiveWallpaperEngine;
using LiveWallpaperEngine.Controls;
using LiveWallpaperEngine.NativeWallpapers;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Interop;

namespace LiveWallpaperEngine
{
    public static partial class WallpaperManager
    {
        /// <summary>
        /// 壁纸显示窗体
        /// </summary>
        public static RenderWindow RenderWindow { get; private set; }
        private static Wallpaper _lastwallPaper;
        private static SetWinEventHookDelegate _hookCallback;
        private static IntPtr _hook;
        private static Process _currentProcess;

        public static void Show(Wallpaper wallpaper)
        {
            if (_currentProcess == null)
                _currentProcess = Process.GetCurrentProcess();

            IntPtr handler = IntPtr.Zero;
            Execute.OnUIThread(() =>
            {
                if (RenderWindow == null)
                {
                    RenderWindow = new RenderWindow
                    {
                        Wallpaper = wallpaper
                    };
                    RenderWindow.Show();
                }
                else
                {
                    RenderWindow.Wallpaper = wallpaper;
                    RenderWindow.Visibility = System.Windows.Visibility.Visible;
                }

                handler = new WindowInteropHelper(RenderWindow).Handle;

                if (_hook == IntPtr.Zero)
                {
                    //监控其他程序是否最大化
                    _hookCallback = new SetWinEventHookDelegate(WinEventProc);
                    _hook = User32Wrapper.SetWinEventHook(SetWinEventHookEventType.EVENT_SYSTEM_FOREGROUND,
                        SetWinEventHookEventType.EVENT_OBJECT_LOCATIONCHANGE, IntPtr.Zero, _hookCallback, 0, 0, SetWinEventHookFlag.WINEVENT_OUTOFCONTEXT);
                }
            });

            HandlerWallpaper.Show(handler);
        }

        private static List<int> maximizedPid = new List<int>();
        private static void WinEventProc(IntPtr hook, SetWinEventHookEventType eventType, IntPtr window, int objectId, int childId, uint threadId, uint time)
        {
            try
            {
                //if (eventType == SetWinEventHookEventType.EVENT_SYSTEM_FOREGROUND ||
                //    eventType == SetWinEventHookEventType.EVENT_SYSTEM_MOVESIZEEND)
                //
                if (eventType == SetWinEventHookEventType.EVENT_OBJECT_LOCATIONCHANGE)
                {
                    WINDOWPLACEMENT placment = new WINDOWPLACEMENT();
                    User32Wrapper.GetWindowPlacement(window, ref placment);
                    string title = User32Wrapper.GetWindowText(window);
                    int pid = User32Wrapper.GetProcessId(window);
                    if (placment.showCmd == WINDOWPLACEMENTFlags.SW_HIDE)
                        return;

                    if (pid == _currentProcess.Id)
                        return;

                    //if (title == nameof(RenderWindow))
                    //    return;
                    //System.Diagnostics.Debug.WriteLine(title);

                    if (placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWMAXIMIZED)
                    {
                        if (!maximizedPid.Contains(pid))
                            maximizedPid.Add(pid);
                        //var handle = USER32Wrapper.GetForegroundWindow();
                        //string txt = USER32Wrapper.GetWindowText(handle);
                        //System.Diagnostics.Debug.WriteLine("foreground:" + txt);
                    }

                    if (placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWNORMAL ||
                        placment.showCmd == WINDOWPLACEMENTFlags.SW_RESTORE ||
                        placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOW ||
                        placment.showCmd == WINDOWPLACEMENTFlags.SW_SHOWMINIMIZED)
                    {
                        //System.Diagnostics.Debug.WriteLine("离开" + placment.showCmd);
                        if (maximizedPid.Contains(pid))
                            maximizedPid.Remove(pid);
                    }
                    //else
                    System.Diagnostics.Debug.WriteLine($"Other:{title}.pid:{pid}. cmd:{placment.showCmd }. {DateTime.Now}");
                    if (maximizedPid.Count == 0)
                        System.Diagnostics.Debug.WriteLine("无");
                    else
                    {
                        foreach (var item in maximizedPid)
                        {
                            System.Diagnostics.Debug.Write($"{item} ");
                        }
                        System.Diagnostics.Debug.WriteLine("");
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        internal static string GetWallpaperType(string filePath)
        {
            var extenson = Path.GetExtension(filePath);
            bool isVideo = VideoExtensions.FirstOrDefault(m => m.ToLower() == extenson.ToLower()) != null;
            if (isVideo)
                return WallpaperType.Video.ToString().ToLower();
            return null;
        }

        public static void Close()
        {
            if (RenderWindow == null)
                return;

            Execute.OnUIThread(() =>
            {
                RenderWindow.Visibility = System.Windows.Visibility.Collapsed;
                RenderWindow.Wallpaper = null;
            });

            if (_hook != IntPtr.Zero)
            {
                bool ok = User32Wrapper.UnhookWinEvent(_hook);
            }
            HandlerWallpaper.Close();
        }

        public static void Dispose()
        {
            if (RenderWindow == null)
                return;

            Close();

            RenderWindow.Close();
            RenderWindow = null;
        }

        public static void Preivew(Wallpaper previewWallpaper)
        {
            Execute.OnUIThread(() =>
            {
                _lastwallPaper = RenderWindow?.Wallpaper;
            });
            Show(previewWallpaper);
        }

        public static void StopPreview()
        {
            if (_lastwallPaper != null)
                Show(_lastwallPaper);
            else
                Close();
        }

        #region private

        #endregion
    }
}
