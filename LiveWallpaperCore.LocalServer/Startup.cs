using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LiveWallpaperCore.LocalServer.Hubs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LiveWallpaperCore.LocalServer
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
                List<string> urls = new List<string>() { "https://livewallpaper.giantapp.cn" };
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

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseAuthorization();

            app.UseCors(AllowSpecificOrigins);

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHub<LiveWallpaperHub>("/livewallpaper");
            });
        }
    }
}
