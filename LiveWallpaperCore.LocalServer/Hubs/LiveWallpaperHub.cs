using LiveWallpaperCore.LocalServer.Models;
using LiveWallpaperCore.LocalServer.Models.AppStates;
using LiveWallpaperCore.LocalServer.Store;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Hubs
{
    public class LiveWallpaperHub : Hub
    {
        public Task<List<Wallpaper>> GetWallpapers()
        {
            return WallpaperStore.GetWallpapers();
        }
        public async Task<ResponseResult> ShowWallpaper(string path)
        {
            ResponseResult r;
            try
            {
                var result = await WallpaperStore.ShowWallpaper(path);
                r = new ResponseResult(result, null);
            }
            catch (Exception ex)
            {
                r = new ResponseResult(false, ex.ToString());
            }
            return r;
        }

        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        public async Task Test()
        {
            await Clients.All.SendAsync("ReceiveMessage", "tTest", "test2");
        }

        public string MethodOneSimpleParameterSimpleReturnValue(string p1)
        {
            Console.WriteLine($"'MethodOneSimpleParameterSimpleReturnValue' invoked. Parameter value: '{p1}");
            return p1;
        }
    }
}
