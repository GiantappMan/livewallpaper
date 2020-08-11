using Giantapp.LiveWallpaper.Engine;
using LiveWallpaperCore.LocalServer.Models;
using LiveWallpaperCore.LocalServer.Models.AppStates;
using LiveWallpaperCore.LocalServer.Store;
using LiveWallpaperCore.LocalServer.Utils;
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

        public Task<BaseApiResult> ShowWallpaper(string path)
        {
            return WallpaperStore.ShowWallpaper(path);
        }

        public async Task<BaseApiResult> SetupPlayer(string path)
        {
            var raiseLimiter = new RaiseLimiter();
            var result = await WallpaperStore.SetupPlayer(path, null, (p) =>
            {
                raiseLimiter.Execute(async () =>
                 {
                     System.Diagnostics.Debug.WriteLine($"{p.ProgressPercentage} {p.ActionType}");
                     await Clients.All.SendAsync("SetupPlayerProgressChanged", p);
                 }, 1000);
            });

            await raiseLimiter.WaitExit();
            return result;
        }

        public async Task<BaseApiResult> StopSetupPlayer()
        {
            WallpaperStore.StopSetupPlayer();
            throw new NotImplementedException();
        }

        public async Task<BaseApiResult> GetOptions()
        {
            throw new NotImplementedException();
        }

        public async Task<BaseApiResult> SetOptions()
        {
            throw new NotImplementedException();

        }

        public async Task<BaseApiResult> GetAppStatus()
        {
            throw new NotImplementedException();

        }
    }
}
