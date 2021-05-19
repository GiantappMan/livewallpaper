using System;
using System.Diagnostics;

namespace Giantapp.LiveWallpaper.Engine.Utils
{
    /// <summary>
    /// 监控 explorer是否崩溃
    /// </summary>
    public static class ExplorerMonitor
    {
        public static Process ExploreProcess { get; private set; }
        public static bool Crashed { get; private set; }

        public static event EventHandler<bool> ExplorerChanged;

        static ExplorerMonitor()
        {
            ExploreProcess = GetExplorer();
            Crashed = ExploreProcess == null;
        }

        public static void Check()
        {
            //explorer 进程已死
            if (ExploreProcess == null || ExploreProcess.HasExited)
            {
                if (ExploreProcess != null && ExploreProcess.HasExited)
                    ExploreProcess = null;
                else
                    ExploreProcess = GetExplorer();

                bool nowCrashed = ExploreProcess == null;
                if (Crashed != nowCrashed)
                {
                    Crashed = nowCrashed;
                    ExplorerChanged?.Invoke(null, Crashed);
                }
            }
            //if (_lastTriggerTime != null)
            //{
            //    var workw = WallpaperHelper.GetWorkerW();
            //    if (workw != IntPtr.Zero)
            //    {
            //        ExplorerChanged?.Invoke(null, new EventArgs());
            //        _lastTriggerTime = null;
            //    }
            //}
        }

        private static Process GetExplorer()
        {
            var explorers = Process.GetProcessesByName("explorer");
            if (explorers.Length == 0)
            {
                return null;
            }

            return explorers[0];
        }
    }
}
