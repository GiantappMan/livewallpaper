using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using WinAPI;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    //本想单进程渲染多屏幕，但是发现声音不可控。故改为单进程只渲染一个屏幕
    public class WebRender : ExternalProcessRender
    {
        //每次升级就修改这个文件名
        public static string PlayerFolderName { get; } = "web0";
        public WebRender() : base(WallpaperType.Web, new List<string>() { ".html", ".htm" })
        {

        }

        protected override ProcessStartInfo? GetRenderExeInfo(WallpaperModel model)
        {
            string? path = model.RunningData.AbsolutePath;
            if (WallpaperApi.Options.ExternalPlayerFolder == null)
                return null;

            //文档：https://mpv.io/manual/stable/
            string playerPath = Path.Combine(WallpaperApi.Options.ExternalPlayerFolder, $@"{PlayerFolderName}\LiveWallpaperEngineWebRender.exe");
            if (!File.Exists(playerPath))
                return null;

            var r = new ProcessStartInfo(playerPath)
            {
                Arguments = $"\"{path}\" --position=-10000,-10000",
                UseShellExecute = false
            };
            return r;
        }

        protected override async Task<RenderProcess> StartProcess(ProcessStartInfo info, CancellationToken ct)
        {
            var result = await base.StartProcess(info, ct);
            return await Task.Run(() =>
             {
                 var p = Process.GetProcessById(result.PId);
                 string title = p.MainWindowTitle;

                 var index = title.IndexOf("cef=");

                 while (index < 0)
                 {
                     p?.Dispose();
                     p = Process.GetProcessById(result.PId);

                     title = p.MainWindowTitle;
                     index = title.IndexOf("cef=");
                     Thread.Sleep(10);
                 }
                 p?.Dispose();
                 string handleStr = title[(index + 4)..];

                 var cefHandle = new IntPtr(int.Parse(handleStr));
                 var handle = User32Wrapper.FindWindowEx(cefHandle, IntPtr.Zero, "Chrome_WidgetWin_0", IntPtr.Zero);

                 result.ReceiveMouseEventHandle = handle;
                 return result;
             });
        }
    }
}
