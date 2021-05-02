using Giantapp.LiveWallpaper.Engine.Forms;
using Giantapp.LiveWallpaper.Engine.Utils;
using LiveWallpaperEngineRender;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using WinAPI.Helpers;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    /// <summary>
    /// 显示视频壁纸，后期可能会增加Web显示
    /// </summary>
    public class EngineRender : BaseRender
    {
        private static readonly ProcessJobTracker _pj = new ProcessJobTracker();
        private static Process _renderProcess;
        private event EventHandler<RenderProtocol> _receivedCommand;

        public static string PlayerFolderName { get; } = "LiveWallpaperEngineRender1";
        public EngineRender() : base(WallpaperType.Video,
            new List<string>() {
                ".mp4", ".flv", ".blv", ".avi", ".mov", ".gif", ".webm" }
            , false)
        {

        }

        protected override async Task InnerCloseWallpaperAsync(List<RenderInfo> wallpaperRenders, bool closeBeforeOpening)
        {
            //不论是否临时关闭，都需要关闭进程重启进程
            foreach (var render in wallpaperRenders)
            {
                try
                {
                    var p = Process.GetProcessById(render.PId);
                    p.Kill();
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"InnerCloseWallpaper ex:{ex}");
                }
                finally
                {
                    if (SupportMouseEvent)
                        await DesktopMouseEventReciver.RemoveHandle(render.ReceiveMouseEventHandle);
                }
            }
        }

        protected override async Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel wallpaper, CancellationToken ct, params string[] screens)
        {
            ProcessStartInfo pInfo = await Task.Run(() => GetRenderExeInfo(wallpaper));
            if (pInfo == null)
                return BaseApiResult<List<RenderInfo>>.ErrorState(ErrorType.NoPlayer);

            List<RenderInfo> infos = new();
            InitlizedPayload initlizedPayload = null;
            //List<Task> tmpTasks = new();

            if (_renderProcess == null)
            {
                initlizedPayload = await StartProcess(pInfo, ct);
                //壁纸启动失败
                if (initlizedPayload == null)
                    return BaseApiResult<List<RenderInfo>>.ErrorState(ErrorType.Failed);

                //显示渲染容器
                foreach (var (screenItem, handle) in initlizedPayload.WindowHandles)
                {
                    if (ct.IsCancellationRequested)
                        break;

                    //var task = Task.Run(() =>
                    //{
                    var host = LiveWallpaperRenderForm.GetHost(screenItem);
                    host!.ShowWallpaper(new IntPtr(handle));

                    infos.Add(new RenderInfo()
                    {
                        Wallpaper = wallpaper,
                        Screen = screenItem
                    });
                }
            }


            //return Task.CompletedTask;
            //}, ct);

            //tmpTasks.Add(task);

            //await Task.WhenAll(tmpTasks);
            // todo 
            //if (SupportMouseEvent && WallpaperApi.Options.ForwardMouseEvent && wallpaper.Option.EnableMouseEvent)
            //{
            //    foreach (var item in infos)
            //        await DesktopMouseEventReciver.AddHandle(item.ReceiveMouseEventHandle, item.Screen);
            //}

            //显示壁纸
            SendToRender(new RenderProtocol(new PlayVideoPayload()
            {
                FilePath = wallpaper.RunningData.AbsolutePath,
                Screen = screens,
            })
            {
                Command = ProtocolDefinition.PlayVideo
            });
            return BaseApiResult<List<RenderInfo>>.SuccessState(infos);
        }

        private void Proc_OutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            Debug.WriteLine(e.Data);
            if (e.Data == null)
                return;
            var protocol = JsonSerializer.Deserialize<RenderProtocol>(e.Data);
            if (protocol != null)
                _receivedCommand?.Invoke(this, protocol);

            //switch (protocol.Command)
            //{
            //    case ProtocolDefinition.Initlized:
            //        var payload = protocol.GetPayLoad<InitlizedPayload>();
            //        break;
            //}
        }

        private void Proc_Exited(object sender, EventArgs e)
        {
            _renderProcess = null;
        }

        protected virtual ProcessStartInfo GetRenderExeInfo(WallpaperModel model)
        {
            string playerPath = Path.Combine(WallpaperApi.Options.ExternalPlayerFolder, $@"{PlayerFolderName}\LiveWallpaperEngineRender.exe");
            if (!File.Exists(playerPath))
                return null;

            FileInfo info = new(playerPath);
            if (info.Length == 0)
                return null;

            ProcessStartInfo r = new()
            {
                FileName = playerPath,
                Arguments = "--WindowLeft -10000  --WindowTop -10000",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            return r;
        }

        protected async Task<InitlizedPayload> StartProcess(ProcessStartInfo info, CancellationToken ct)
        {
            if (_renderProcess != null)
                return null;

            Stopwatch sw = new Stopwatch();
            sw.Start();
            int timeout = 30 * 1000;

            //info.WindowStyle = ProcessWindowStyle.Maximized;
            //info.CreateNoWindow = true;

            InitlizedPayload result = null;

            EventHandler<RenderProtocol> EngineRender__receivedCommand = (object sender, RenderProtocol e) =>
            {
                if (e.Command == ProtocolDefinition.Initlized)
                {
                    result = e.GetPayLoad<InitlizedPayload>();
                }
            };

            _receivedCommand += EngineRender__receivedCommand;

            try
            {
                _renderProcess = new Process
                {
                    StartInfo = info,
                    EnableRaisingEvents = true
                };

                _renderProcess.Exited += Proc_Exited;
                _renderProcess.OutputDataReceived += Proc_OutputDataReceived;
                _renderProcess.Start();
                _renderProcess.BeginOutputReadLine();

                _pj.AddProcess(_renderProcess);

                while (result == null)
                {
                    ct.ThrowIfCancellationRequested();
                    await Task.Delay(1000, ct);
                    if (sw.ElapsedMilliseconds > timeout)
                    {
                        sw.Stop();
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
            }

            _receivedCommand -= EngineRender__receivedCommand;

            return result;

            //Process targetProcess = Process.Start(info);



            //RenderProcess result = new RenderProcess()
            //{
            //    PId = targetProcess.Id,
            //    HostHandle = targetProcess.MainWindowHandle,
            //    ReceiveMouseEventHandle = targetProcess.MainWindowHandle
            //};
            ////壁纸引擎关闭后，关闭渲染进程
            //_pj.AddProcess(targetProcess);
            //targetProcess.Dispose();
            //return result;
        }

        private void SendToRender(RenderProtocol renderProtocol)
        {
            var json = JsonSerializer.Serialize(renderProtocol);
            _renderProcess.StandardInput.WriteLine(json);
        }
    }
}
