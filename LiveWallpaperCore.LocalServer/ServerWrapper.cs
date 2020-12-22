using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace LiveWallpaper.LocalServer
{
    public class ServerWrapper
    {
        public static async void Start(int port)
        {
            string url = $"http://*:{port}/";
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
