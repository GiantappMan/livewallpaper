//https://www.codeproject.com/Articles/856020/Draw-Behind-Desktop-Icons-in-Windows
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Forms;
using static LiveWallpaper.W32;

namespace LiveWallpaper.Wallpapers
{
    public class ExeWallpaper : IWallpaper
    {
        IntPtr workerw;
        IntPtr cacheParent;
        IntPtr cacheMainHandle;
        string _defaultBG;
        Process process = null;
        WallpapaerParameter lastParameter;

        public ExeWallpaper()
        {
        }


        public virtual Task Clean()
        {
            return Task.Run(() =>
            {
                lastParameter = null;
                Initlize();
                //W32.SetParent(cacheMainHandle, cacheParent);

                if (process != null)
                {
                    try
                    {
                        process.Kill();
                    }
                    catch (Exception)
                    {
                    }
                    process = null;
                }

                if (!string.IsNullOrEmpty(_defaultBG))
                {
                    ImgWallpaper.SetBG(_defaultBG);
                    _defaultBG = null;
                }


                //var resul = W32.RedrawWindow(workerw, IntPtr.Zero, IntPtr.Zero, RedrawWindowFlags.Invalidate);
                //var temp = W32.GetParent(workerw);
                //W32.SendMessage(temp, 0x000F, 0, IntPtr.Zero);
                //W32.SendMessage(workerw, 0x000F, 0, IntPtr.Zero);
                //W32.SendMessage(workerw, W32.WM_CHANGEUISTATE, 2, IntPtr.Zero);
                //W32.SendMessage(workerw, W32.WM_UPDATEUISTATE, 2, IntPtr.Zero);
            });
        }

        public virtual Task Dispose()
        {
            throw new NotImplementedException();
        }

        public virtual async Task Show(WallpapaerParameter model)
        {
            if (model == null || model.Equals(lastParameter))
                return;

            lastParameter = model;

            bool isOk = await Task.Run(() => Initlize());
            if (!isOk)
                return;

            KillOldProcess();

            _defaultBG = await ImgWallpaper.GetCurrentBG();


            bool isInt = int.TryParse(model.Dir, out int Pid);
            if (isInt)
            {
                process = Process.GetProcessById(Pid);
            }
            else
            {
                string name = Path.GetFileNameWithoutExtension(model.Dir);
                foreach (Process exe in Process.GetProcessesByName(name))
                {
                    try
                    {
                        if (exe.MainModule.FileName == model.Dir)
                        {
                            process = exe;
                            break;
                        }
                    }
                    catch (Exception)
                    {
                        continue;
                    }
                }
                if (process == null)
                {
                    var tempDir = model.Dir;
                    if (model.Dir.StartsWith("\\Wallpapers\\"))
                        tempDir = Services.AppService.ApptEntryDir + model.Dir;

                    ProcessStartInfo startInfo = new ProcessStartInfo(Path.Combine(tempDir, model.EnterPoint));
                    startInfo.WindowStyle = ProcessWindowStyle.Maximized;
                    double x = Screen.AllScreens[0].Bounds.Width;
                    double y = Screen.AllScreens[0].Bounds.Height;
                    startInfo.Arguments = $"{model.Args} -popupwindow -screen-height {y} -screen-width {x}";
                    //startInfo.Arguments = $" -popupwindow -screen-width {y1}";
                    process = Process.Start(startInfo);

                    //NativeWindowHandler windowHandler = new NativeWindowHandler();
                    //windowHandler.MaximizeWindow(process.Handle.ToInt32());

                    //process = Process.Start(path);
                }
            }
            cacheMainHandle = await TryGetMainWindowHandle(process);
            cacheParent = W32.GetParent(cacheMainHandle);
            W32.SetParent(cacheMainHandle, workerw);
        }

        private void KillOldProcess()
        {
            Task.Run(() =>
            {
                if (process != null)
                {
                    process.Kill();
                    process = null;
                }
            });
        }

        protected void KillProcess(string processName)
        {
            try
            {
                var process = Process.GetProcessesByName(processName);
                if (process != null)
                    process.ToList().ForEach(m => m.Kill());
            }
            catch (Exception ex)
            {
            }
        }

        private async Task<IntPtr> TryGetMainWindowHandle(Process process)
        {
            while (true)
            {
                IntPtr result = IntPtr.Zero;
                try
                {
                    result = process.MainWindowHandle;
                }
                catch (Exception ex)
                {
                    continue;
                }

                if (result != IntPtr.Zero)
                    return result;
                await Task.Delay(100);
            }
        }

        private bool Initlize()
        {
            IntPtr progman = W32.FindWindow("Progman", null);
            IntPtr result = IntPtr.Zero;
            W32.SendMessageTimeout(progman,
                                   0x052C,
                                   new IntPtr(0),
                                   IntPtr.Zero,
                                   W32.SendMessageTimeoutFlags.SMTO_NORMAL,
                                   1000,
                                   out result);
            workerw = IntPtr.Zero;
            var result1 = W32.EnumWindows(new W32.EnumWindowsProc((tophandle, topparamhandle) =>
              {
                  IntPtr p = W32.FindWindowEx(tophandle,
                                              IntPtr.Zero,
                                              "SHELLDLL_DefView",
                                              IntPtr.Zero);

                  if (p != IntPtr.Zero)
                  {
                      // Gets the WorkerW Window after the current one.
                      workerw = W32.FindWindowEx(IntPtr.Zero,
                                               tophandle,
                                               "WorkerW",
                                               IntPtr.Zero);
                  }

                  return true;
              }), IntPtr.Zero);
            return result1;
        }
    }
}
