using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using LiveWallpaper.LocalServer.Hubs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
namespace LiveWallpaper.LocalServer
{
    public class Startup
    {
        readonly string AllowSpecificOrigins = "AllowSpecificOrigins";
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(options =>
            {
                List<string> urls = new() { "https://livewallpaper.giantapp.cn", "http://livewallpaper.giantapp.cn", $"http://localhost:{ServerWrapper.HostPort}", $"http://127.0.0.1:{ServerWrapper.HostPort}", "https://test-livewallpaper-5dbri89faad9b-1304209797.ap-shanghai.app.tcloudbase.com" };
#if DEBUG
                urls.Add("http://localhost:3000");
#endif
                options.AddPolicy(name: AllowSpecificOrigins,
                                  builder =>
                                  {
                                      builder
                                      .WithOrigins(urls.ToArray())
                                      .AllowAnyMethod()
                                      .AllowAnyHeader()
                                      .AllowCredentials();
                                  });
            });
            services.AddControllers();
            services.AddSignalR();
            services.AddSingleton<HubEventEmitter>();
            //services.AddSingleton<IHostedService, HubEventEmitter>(serviceProvider => serviceProvider.GetService<HubEventEmitter>());

            services.AddHostedService(serviceProvider => serviceProvider.GetService<HubEventEmitter>());
            //.AddJsonOptions(options =>
            //{
            //    // Use the default property (Pascal) casing.
            //    options.JsonSerializerOptions.PropertyNamingPolicy = null;
            //});
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            //app.UseHttpsRedirection();

            //手动指定路径，APP包装后启动路径不正确
            var apptEntryDir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
            var option = new FileServerOptions
            {
                FileProvider = new PhysicalFileProvider(Path.Combine(apptEntryDir, "wwwroot")),
            };
            option.StaticFileOptions.ServeUnknownFileTypes = true;
            app.UseFileServer(option);

            app.UseRouting();

            app.UseAuthorization();

            app.UseCors(AllowSpecificOrigins);

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                  name: "default",
                  pattern: "{controller=Home}/{action=Index}/{id?}");
                endpoints.MapHub<LiveWallpaperHub>("/livewallpaper");
            });
        }
    }
}
