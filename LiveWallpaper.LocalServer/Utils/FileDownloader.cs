using Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Utils
{
    public class FileDownloader
    {
        public class ProgressArgs
        {
            public enum ActionType
            {
                Download,
                Decompress,
                Completed
            }
            public float Completed { get; set; }
            public float Total { get; set; }
            public ActionType Type { get; set; }
            public string TypeStr { get; set; }
            public int Percent { get; set; }
            public bool Successed { get; set; }
        }

        bool isBusy;

        readonly RaiseLimiter _raiseLimiter = new RaiseLimiter();
        private CancellationTokenSource _cts = new CancellationTokenSource();

        public event EventHandler<ProgressArgs> PrgoressEvent;
        public string DistDir { get; internal set; }

        /// <summary>
        /// 下载并解压
        /// </summary>
        /// <param name="url"></param>
        /// <param name="distFolder"></param>
        /// <returns></returns>
        public BaseApiResult SetupFile(string url)
        {
            if (isBusy)
                return BaseApiResult.BusyState();

            _cts?.Cancel();
            _cts?.Dispose();
            _cts = new CancellationTokenSource();

            isBusy = true;
            _ = InnerSetupFile(url, _cts);
            return BaseApiResult.SuccessState();
        }
        public async Task<BaseApiResult> StopSetupFile()
        {
            _cts?.Cancel();
            _cts?.Dispose();
            _cts = null;
            while (isBusy)
            {
                await Task.Delay(1000);
            }

            return BaseApiResult.SuccessState();
        }

        void RaiseCallback(ProgressArgs arg)
        {
            _raiseLimiter.Execute(() =>
           {
               try
               {
                   //向所有客户端推送，刷新后也能显示
                   var percent = (int)(arg.Completed / arg.Total * 50);
                   if (arg.Type == ProgressArgs.ActionType.Decompress)
                       percent += 50;
                   else if (arg.Type == ProgressArgs.ActionType.Completed)
                       percent = 100;

                   arg.Percent = percent;
                   arg.TypeStr = arg.Type.ToString().ToLower();
                   PrgoressEvent?.Invoke(null, arg);
                   Debug.WriteLine($"{arg.Completed} {arg.Total} {arg.TypeStr}");
               }
               catch (Exception ex)
               {
                   Debug.WriteLine(ex);
               }
               return Task.CompletedTask;
           }, 1000);
        }
        public async Task InnerSetupFile(string url, CancellationTokenSource cts)
        {
            var progressInfo = new Progress<(float competed, float total)>((e) => RaiseCallback(new ProgressArgs()
            {
                Total = e.total,
                Completed = e.competed,
                Type = ProgressArgs.ActionType.Download
            }));
            var decompressProgress = new Progress<(float competed, float total)>((e) => RaiseCallback(new ProgressArgs()
            {
                Total = e.total,
                Completed = e.competed,
                Type = ProgressArgs.ActionType.Decompress
            }));

            bool hasError = false;
            try
            {
                string fileName = Path.GetFileName(url);
                await NetworkHelper.DownloadAndDecompression(url,
                     Path.Combine(DistDir, fileName),
                      DistDir,
                      true,
                      progressInfo,
                      decompressProgress,
                      cts.Token
                      );
            }
            catch (Exception ex)
            {
                hasError = true;
                Debug.WriteLine(ex);
            }
            finally
            {
                isBusy = false;
                RaiseCallback(new ProgressArgs()
                {
                    Total = 1,
                    Completed = 1,
                    Successed = !hasError,
                    Type = ProgressArgs.ActionType.Completed
                });
            }
        }
    }
}
