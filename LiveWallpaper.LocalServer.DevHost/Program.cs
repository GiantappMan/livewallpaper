using System;
using System.IO;
using System.Threading;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer;

namespace LiveWallpaper.LocalServer.DevHost
{
    /// <summary>
    /// 开发宿主：脱离 WPF Shell 独立启动 LocalServer，配合 dotnet watch 实现后端热重载
    /// </summary>
    internal class Program
    {
        private static void Main(string[] args)
        {
            int port = ParsePort(args);

            //Startup 用 PhysicalFileProvider 指向 entry 目录下的 wwwroot，目录不存在会直接抛异常
            Directory.CreateDirectory(Path.Combine(AppContext.BaseDirectory, "wwwroot"));

            //引擎初始化会创建 WinForms 窗体，和 Shell 一样需要一个带消息泵的 STA 线程
            var uiThread = new Thread(() =>
            {
                WallpaperApi.Initlize(System.Windows.Threading.Dispatcher.CurrentDispatcher);
                System.Windows.Threading.Dispatcher.Run();
            });
            uiThread.SetApartmentState(ApartmentState.STA);
            uiThread.IsBackground = true;
            uiThread.Start();

            Console.WriteLine($"LocalServer dev host listening on http://localhost:{port}/");
            ServerWrapper.Start(port);

            Thread.Sleep(Timeout.Infinite);
        }

        private static int ParsePort(string[] args)
        {
            for (int i = 0; i < args.Length - 1; i++)
            {
                if ((args[i] == "-p" || args[i] == "--port") && int.TryParse(args[i + 1], out int fromArgs))
                    return fromArgs;
            }

            if (int.TryParse(Environment.GetEnvironmentVariable("LIVEWALLPAPER_DEV_PORT"), out int fromEnv))
                return fromEnv;

            //与前端 store/local.js 的默认端口保持一致
            return 5001;
        }
    }
}
