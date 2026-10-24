using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace LiveWallpaper.LocalServer
{
    public class ServerWrapper
    {
        public static int HostPort { get; private set; }
        public static async void Start(int port)
        {
            HostPort = port;
            //只监听本机环回地址（IPv4+IPv6），管理接口不允许局域网访问（GHSA-7x4r-5364-6hwf）
            string url = $"http://127.0.0.1:{port};http://[::1]:{port}";
            await AppManager.Initialize(port);
            CreateHostBuilder(new string[] { $"--urls={url}" }).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
