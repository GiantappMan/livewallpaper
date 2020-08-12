using Giantapp.LiveWallpaper.Engine;
using LiveWallpaperCore.LocalServer.Models;
using LiveWallpaperCore.LocalServer.Utils;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Localization.Internal;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Hubs
{
    public class LiveWallpaperHub : Hub
    {
        public async Task<BaseApiResult<List<WallpaperModel>>> GetWallpapers()
        {
            await AppManager.WaitInitialized();
            var result = await WallpaperApi.GetWallpapers(AppManager.UserSetting.General.WallpaperSaveDir);
            return result;
        }

        public Task<BaseApiResult> ShowWallpaper(string path)
        {
            return WallpaperApi.ShowWallpaper(new WallpaperModel() { Path = path });
        }

        public async Task<BaseApiResult> SetupPlayer(string path)
        {
            var raiseLimiter = new RaiseLimiter();

            string url = null;
            var wpType = WallpaperApi.GetWallpaperType(path);
            if (string.IsNullOrEmpty(url))
                url = WallpaperApi.PlayerUrls.FirstOrDefault(m => m.Type == wpType).DownloadUrl;

            void WallpaperManager_SetupPlayerProgressChangedEvent(object sender, ProgressChangedArgs e)
            {
                raiseLimiter.Execute(async () =>
                {
                    System.Diagnostics.Debug.WriteLine($"{e.ProgressPercentage} {e.ActionType}");
                    await Clients.All.SendAsync("SetupPlayerProgressChanged", e);
                }, 1000);
            }

            WallpaperApi.SetupPlayerProgressChangedEvent += WallpaperManager_SetupPlayerProgressChangedEvent;

            var setupResult = await WallpaperApi.SetupPlayer(wpType.Value, url);

            WallpaperApi.SetupPlayerProgressChangedEvent -= WallpaperManager_SetupPlayerProgressChangedEvent;
            await raiseLimiter.WaitExit();
            return setupResult;
        }

        public Task<BaseApiResult> StopSetupPlayer()
        {
            return WallpaperApi.StopSetupPlayer();
        }

        public async Task<BaseApiResult<UserSetting>> GetUserSetting()
        {
            await AppManager.WaitInitialized();
            return new BaseApiResult<UserSetting>()
            {
                Ok = true,
                Data = AppManager.UserSetting
            };
        }

        public async Task<BaseApiResult> SetUserSetting(UserSetting setting)
        {
            await AppManager.WaitInitialized();
            try
            {
                await AppManager.ApplyUserSetting(setting);
                var result = await WallpaperApi.SetOptions(setting.Wallpaper);
                //成功后才保存，防止有异常导致启动崩溃
                await AppManager.SaveUserSetting(setting);
                return result;
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
        }

        public async Task<BaseApiResult<RunningData>> GetRunningData()
        {
            await AppManager.WaitInitialized();
            return new BaseApiResult<RunningData>()
            {
                Ok = true,
                Data = AppManager.RunningData
            };
        }
    }
}
