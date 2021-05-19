using Giantapp.LiveWallpaper.Engine.Forms;
using Giantapp.LiveWallpaper.Engine.Utils;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using WinAPI.Extension;
using WinAPI.Helpers;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    //通过启用外部exe渲染
    public abstract class ExternalProcessRender : BaseRender
    {
        private static readonly ProcessJobTracker _pj = new();

        protected ExternalProcessRender(WallpaperType type, List<string> extension, bool mouseEvent = true) : base(type, extension, mouseEvent)
        {
        }
        public override void SetVolume(int v, string screen)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screen == m.Screen).FirstOrDefault();
            if (playingWallpaper != null)
                AudioHelper.SetVolume(playingWallpaper.PId, v);
        }

        public override int GetVolume(string screen)
        {
            var playingWallpaper = _currentWallpapers.Where(m => screen == m.Screen).FirstOrDefault();
            int result = AudioHelper.GetVolume(playingWallpaper.PId);
            return result;
        }
        protected override async Task InnerCloseWallpaperAsync(List<RenderInfo> wallpaperRenders, WallpaperModel nextWallpaper)
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
            List<RenderInfo> infos = new();
            List<Task> tmpTasks = new();

            ProcessStartInfo pInfo = await Task.Run(() => GetRenderExeInfo(wallpaper));
            if (pInfo == null)
                return BaseApiResult<List<RenderInfo>>.ErrorState(ErrorType.NoPlayer);

            foreach (var screenItem in screens)
            {
                if (ct.IsCancellationRequested)
                    break;
                var task = Task.Run(async () =>
                {
                    try
                    {
                        var processResult = await StartProcess(pInfo, ct);

                        //壁纸启动失败
                        if (processResult.HostHandle == IntPtr.Zero)
                            return;

                        var host = LiveWallpaperRenderForm.GetHost(screenItem);
                        host!.ShowWallpaper(processResult.HostHandle);

                        infos.Add(new RenderInfo(processResult)
                        {
                            Wallpaper = wallpaper,
                            Screen = screenItem
                        });
                    }
                    catch (OperationCanceledException)
                    {
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine(ex);
                    }
                }, ct);

                tmpTasks.Add(task);
            }
            await Task.WhenAll(tmpTasks);

            if (SupportMouseEvent && WallpaperApi.Options.ForwardMouseEvent && wallpaper.Option.EnableMouseEvent)
            {
                foreach (var item in infos)
                    await DesktopMouseEventReciver.AddHandle(item.ReceiveMouseEventHandle, item.Screen);
            }
            return BaseApiResult<List<RenderInfo>>.SuccessState(infos);
        }

        protected virtual ProcessStartInfo GetRenderExeInfo(WallpaperModel model)
        {
            return new ProcessStartInfo(model.RunningData.AbsolutePath);
        }

        protected override void InnerPause(RenderInfo renderInfo)
        {
            if (renderInfo.PId == 0)
                return;
            var p = Process.GetProcessById(renderInfo.PId);
            p.Suspend();
        }
        protected override void InnerResum(RenderInfo renderInfo)
        {
            if (renderInfo.PId == 0)
                return;
            var p = Process.GetProcessById(renderInfo.PId);
            p.Resume();
        }

        protected virtual Task<RenderProcess> StartProcess(ProcessStartInfo info, CancellationToken ct)
        {
            return Task.Run(() =>
            {
                Stopwatch sw = new();
                sw.Start();
                int timeout = 30 * 1000;

                info.WindowStyle = ProcessWindowStyle.Maximized;
                info.CreateNoWindow = true;
                Process targetProcess = Process.Start(info);

                while (targetProcess.MainWindowHandle == IntPtr.Zero)
                {
                    if (ct.IsCancellationRequested)
                        targetProcess.Kill();
                    ct.ThrowIfCancellationRequested();
                    Thread.Sleep(10);
                    int pid = targetProcess.Id;
                    targetProcess.Dispose();
                    //mainWindowHandle不会变，重新获取
                    targetProcess = Process.GetProcessById(pid);

                    if (sw.ElapsedMilliseconds > timeout)
                    {
                        sw.Stop();
                        break;
                    }
                }

                RenderProcess result = new()
                {
                    PId = targetProcess.Id,
                    HostHandle = targetProcess.MainWindowHandle,
                    ReceiveMouseEventHandle = targetProcess.MainWindowHandle
                };
                //壁纸引擎关闭后，关闭渲染进程
                _pj.AddProcess(targetProcess);
                targetProcess.Dispose();
                return result;
            });
        }
    }
}
