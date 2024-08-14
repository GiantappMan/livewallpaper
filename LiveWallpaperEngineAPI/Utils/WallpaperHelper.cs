//原理参考
//https://www.codeproject.com/Articles/856020/Draw-Behind-Desktop-Icons-in-Windows 
//https://github.com/Francesco149/weebp/blob/master/src/weebp.c 
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using WinAPI;
using WinAPI.Desktop.API;

namespace Giantapp.LiveWallpaper.Engine.Utils
{
    public class WallpaperHelper
    {
        #region fields

        IntPtr _currentHandler;
        IntPtr? _parentHandler;
        Rectangle _targetBounds;
        RECT _lastPos;

        #region static

        static readonly Dictionary<string, WallpaperHelper> _cacheInstances = new();
        static IDesktopWallpaper? _desktopWallpaperAPI;
        static uint _slideshowTick;
        static IntPtr _progman;
        static IntPtr _workerw;
        static IntPtr _desktopWorkerw;
        //static uint? _defaultBackgroundColor;
        public static bool? IsSystemWallpaperEnabled { get; private set; }

        public Rectangle TargetBounds { get => _targetBounds; }

        #endregion

        #endregion

        #region construct

        static WallpaperHelper()
        {
            EnableSystemWallpaper(false);
        }

        //禁止外部程序集直接构造
        private WallpaperHelper(Rectangle bounds)
        {
            _targetBounds = bounds;
        }

        #endregion

        #region  public methods        

        public static void RestoreDefaultWallpaper()
        {
            SetDesktopWallpaper(GetDesktopWallpaper());
        }

        static string GetDesktopWallpaper()
        {
            int MAX_PATH = 260;
            string wallpaper = new('\0', MAX_PATH);
            _ = User32Wrapper.SystemParametersInfo(User32Wrapper.SPI_GETDESKWALLPAPER, (uint)wallpaper.Length, wallpaper, 0);
            return wallpaper[..wallpaper.IndexOf('\0')];
        }

        static void SetDesktopWallpaper(string filename)
        {
            _ = User32Wrapper.SystemParametersInfo(User32Wrapper.SPI_SETDESKWALLPAPER, 0, filename,
                User32Wrapper.SPIF_UPDATEINIFILE | User32Wrapper.SPIF_SENDWININICHANGE);
        }
        //private static string GetActiveWindowTitle()
        //{
        //    const int nChars = 256;
        //    StringBuilder Buff = new StringBuilder(nChars);
        //    IntPtr handle = User32Wrapper.GetForegroundWindow();

        //    if (User32Wrapper.GetWindowText(handle, Buff, nChars) > 0)
        //    {
        //        return $"handle:{handle} buff:{Buff}";
        //    }
        //    return $"handle:{handle}";
        //}

        internal static bool IsDesktop()
        {
            IntPtr hWnd = User32Wrapper.GetForegroundWindow();
            if (hWnd == _desktopWorkerw)
            {
                return true;
            }
            else if (hWnd == _progman)
            {
                return true;
            }
            else
            {
                return false;
            }
        }

        public void RestoreParent()
        {
            if (_parentHandler != null)
                User32Wrapper.SetParent(_currentHandler, _parentHandler.Value);

            _parentHandler = null;
        }

        public async void UpdatePosition(Rectangle bounds, int tryCount = 1)
        {
            _targetBounds = bounds;
            var rect = new RECT(_targetBounds);

            for (int i = 0; i < tryCount; i++)
            {
                //检查x秒，如果坐标有变化，重新应用
                RECT tmp = new(rect);
                _ = User32Wrapper.MapWindowPoints(IntPtr.Zero, _workerw, ref tmp, 2);
                if (tmp != _lastPos)
                {
                    _lastPos = tmp;
                    _ = User32WrapperEx.SetWindowPosEx(_currentHandler, _lastPos);
                    System.Diagnostics.Debug.WriteLine($"set window pos ${_lastPos}");
                }

                await Task.Delay(1000);
            }
        }

        public bool SendToBackground(IntPtr handler)
        {
            //处理alt+tab可以看见本程序
            //https://stackoverflow.com/questions/357076/best-way-to-hide-a-window-from-the-alt-tab-program-switcher
            int exStyle = User32Wrapper.GetWindowLong(handler, WindowLongFlags.GWL_EXSTYLE);
            exStyle |= (int)WindowStyles.WS_EX_TOOLWINDOW;
            _ = User32Wrapper.SetWindowLong(handler, WindowLongFlags.GWL_EXSTYLE, exStyle);

            if (handler != _currentHandler)
                //已经换了窗口，恢复上一个窗口
                RestoreParent();

            if (handler == IntPtr.Zero)
                return false;

            _ = User32Wrapper.GetWindowRect(handler, out _);

            _currentHandler = handler;

            _workerw = GetWorkerW();
            if (_workerw == IntPtr.Zero)
            {
                //有时候突然又不行了，在来一次
                User32Wrapper.SystemParametersInfo(User32Wrapper.SPI_SETCLIENTAREAANIMATION, 0, true, User32Wrapper.SPIF_UPDATEINIFILE | User32Wrapper.SPIF_SENDWININICHANGE);
                _workerw = GetWorkerW();
            }

            if (_workerw == IntPtr.Zero)
                return false;

            _parentHandler = User32Wrapper.GetParent(_currentHandler);

            User32Wrapper.SetParent(_currentHandler, _workerw);
            System.Diagnostics.Debug.WriteLine($"FullScreen {_targetBounds}");
            UpdatePosition(_targetBounds, 5);
            HideWindowBorder(_currentHandler);
            return true;
        }

        /// <summary>
        /// 恢复WorkerW中的所有句柄到桌面
        /// </summary>
        public static void RestoreAllHandles()
        {
            var desktop = User32Wrapper.GetDesktopWindow();
            var workw = GetWorkerW();
            var enumWindowResult = User32Wrapper.EnumChildWindows(workw, new EnumWindowsProc((tophandle, topparamhandle) =>
            {
                var txt = User32WrapperEx.GetWindowTextEx(tophandle);
                if (!string.IsNullOrEmpty(txt))
                {
                    User32Wrapper.SetParent(tophandle, desktop);
                }

                return true;
            }), IntPtr.Zero);

            var desktopWallpaperAPI = GetDesktopWallpaperAPI();
            RefreshWallpaper(desktopWallpaperAPI);
        }

        public static string GetCustomScreenName(int screenIndex)
        {
            return $"Display{screenIndex}";
        }
        /// <summary>
        /// 获取指定屏幕的实例
        /// </summary>
        /// <param name="screen"></param>
        /// <returns></returns>
        public static WallpaperHelper GetInstance(string screen)
        {
            if (!_cacheInstances.ContainsKey(screen))
            {
                var bounds = Screen.AllScreens.Select((m, Index) =>
                    new { m.Bounds, Index })
                    .First(m => GetCustomScreenName(m.Index) == screen).Bounds;

                _cacheInstances.Add(screen, new WallpaperHelper(bounds));
            }
            return _cacheInstances[screen];
        }

        internal static void UpdateScreenResolution()
        {
            foreach (var item in _cacheInstances)
            {
                var tmpScreen = Screen.AllScreens.Select((m, Index) => new { Index, m.Bounds }).ToList().FirstOrDefault(m => GetCustomScreenName(m.Index) == item.Key);
                if (tmpScreen == null)
                    continue;

                var bounds = tmpScreen.Bounds;
                item.Value.UpdatePosition(bounds, 5);
            }
        }
        private static IDesktopWallpaper? GetDesktopWallpaperAPI()
        {
            try
            {
                var result = DesktopWallpaperFactory.Create();
                return result;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
                return null;
            }
        }

        public static void DoSomeMagic()
        {
            //屏幕会闪两下，可以修复某些特殊情况不能用的问题，暂时还是屏蔽了体验不好
            //_ = User32Wrapper.SystemParametersInfo(User32Wrapper.SPI_SETCLIENTAREAANIMATION, 0, true, User32Wrapper.SPIF_UPDATEINIFILE | User32Wrapper.SPIF_SENDWININICHANGE);
            _desktopWallpaperAPI = GetDesktopWallpaperAPI();
            _desktopWallpaperAPI?.GetSlideshowOptions(out _, out _slideshowTick);
            if (_slideshowTick < 86400000)
                _desktopWallpaperAPI?.SetSlideshowOptions(DesktopSlideshowOptions.DSO_SHUFFLEIMAGES, 1000 * 60 * 60 * 24);
        }

        public static void RestoreMagic()
        {
            _desktopWallpaperAPI?.SetSlideshowOptions(DesktopSlideshowOptions.DSO_SHUFFLEIMAGES, _slideshowTick);
        }

        public static void EnableSystemWallpaper(bool enable)
        {
            if (IsSystemWallpaperEnabled == enable)
                return;

            IsSystemWallpaperEnabled = enable;

            try
            {
                // win11会崩溃暂时屏蔽
                //if (_desktopWallpaperAPI == null)
                //    _desktopWallpaperAPI = GetDesktopWallpaperAPI();

                //if (!enable)
                //{
                //    if (_defaultBackgroundColor == null)
                //        _defaultBackgroundColor = _desktopWallpaperAPI.GetBackgroundColor();
                //    // 显示黑色bg
                //    _desktopWallpaperAPI.SetBackgroundColor(0);
                //}
                //else if (_defaultBackgroundColor != null)
                //    //恢复默认色
                //    _desktopWallpaperAPI.SetBackgroundColor(_defaultBackgroundColor.Value);

                //_desktopWallpaperAPI.Enable(enable);
            }
            catch (Exception ex)
            {
                _desktopWallpaperAPI = null;
                System.Diagnostics.Debug.WriteLine(ex);
            }
        }

        #endregion

        #region private
        internal static IntPtr GetWorkerW()
        {
            _progman = User32Wrapper.FindWindow("Progman", null);
            User32Wrapper.SendMessageTimeout(_progman,
                                   0x052C,
                                   new IntPtr(0xD),
                                   new IntPtr(0x1),
                                   SendMessageTimeoutFlags.SMTO_NORMAL,
                                   1000,
                                   out IntPtr unusefulResult);
            var enumWindowResult = User32Wrapper.EnumWindows(new EnumWindowsProc((tophandle, topparamhandle) =>
            {
                IntPtr shelldll_defview = User32Wrapper.FindWindowEx(tophandle,
                                            IntPtr.Zero,
                                            "SHELLDLL_DefView",
                                            IntPtr.Zero);

                if (shelldll_defview != IntPtr.Zero)
                {
                    var tophandleClassName = User32Wrapper.GetClassName(tophandle);
                    if (tophandleClassName != "WorkerW")
                        return true;

                    _workerw = User32Wrapper.FindWindowEx(IntPtr.Zero,
                                             tophandle,
                                             "WorkerW",
                                             IntPtr.Zero);

                    _desktopWorkerw = tophandle;
                    return false;
                }

                return true;
            }), IntPtr.Zero);

            if (_workerw == IntPtr.Zero)
            {
                //部分特殊机型
                var progman = User32Wrapper.FindWindow("Progman", null);
                if (progman != IntPtr.Zero)
                    _workerw = User32Wrapper.FindWindowEx(progman, IntPtr.Zero, "WorkerW", IntPtr.Zero);
            }

            return _workerw;
        }

        //internal static void FullScreen(IntPtr mainWindowHandle, IntPtr containerHandle)
        //{
        //    User32Wrapper.GetWindowRect(containerHandle, out RECT rect);
        //    FullScreen(mainWindowHandle, rect, containerHandle);
        //}

        public static void HideWindowBorder(IntPtr targeHandler)
        {
            //_ = User32Wrapper.MapWindowPoints(IntPtr.Zero, parent, ref rect, 2);
            //_ = User32WrapperEx.SetWindowPosEx(targeHandler, rect);

            var style = User32Wrapper.GetWindowLong(targeHandler, WindowLongFlags.GWL_STYLE);

            //https://stackoverflow.com/questions/2398746/removing-window-border
            //消除游戏边框
            style &= ~(int)(WindowStyles.WS_EX_TOOLWINDOW | WindowStyles.WS_CAPTION | WindowStyles.WS_THICKFRAME | WindowStyles.WS_MINIMIZEBOX | WindowStyles.WS_MAXIMIZEBOX | WindowStyles.WS_SYSMENU);
            _ = User32Wrapper.SetWindowLong(targeHandler, WindowLongFlags.GWL_STYLE, style);
        }

        //刷新壁纸
        public static IDesktopWallpaper? RefreshWallpaper(IDesktopWallpaper? desktopWallpaperAPI = null)
        {
            var explorer = ExplorerMonitor.ExploreProcess;
            if (explorer == null)
                return null;

            desktopWallpaperAPI ??= GetDesktopWallpaperAPI();

            try
            {
                desktopWallpaperAPI?.Enable(false);
                desktopWallpaperAPI?.Enable(true);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex);
            }
            return desktopWallpaperAPI;
        }

        #endregion
    }
}
