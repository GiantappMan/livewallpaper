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
        HubEventEmitter _hubEventEmitter;
        string _lastConnectionId;
        RaiseLimiter _lastSetupPlayerRaiseLimiter = new RaiseLimiter();

        public LiveWallpaperHub(HubEventEmitter hubEventEmitter)
        {
            _hubEventEmitter = hubEventEmitter;
        }

        public async Task<BaseApiResult<List<WallpaperModel>>> GetWallpapers()
        {
            await AppManager.WaitInitialized();
            var result = await WallpaperApi.GetWallpapers(AppManager.UserSetting.Wallpaper.WallpaperSaveDir);
            return result;
        }

        public Task<BaseApiResult> ShowWallpaper(string path)
        {
            return WallpaperApi.ShowWallpaper(new WallpaperModel() { Path = path });
        }

        public BaseApiResult SetupPlayer(string path)
        {
            string url = null;
            var wpType = WallpaperApi.GetWallpaperType(path);
            if (string.IsNullOrEmpty(url))
                url = WallpaperApi.PlayerUrls.FirstOrDefault(m => m.Type == wpType).DownloadUrl;

            void WallpaperManager_SetupPlayerProgressChangedEvent(object sender, SetupPlayerProgressChangedArgs e)
            {
                _lastSetupPlayerRaiseLimiter.Execute(async () =>
                {
                    try
                    {
                        System.Diagnostics.Debug.WriteLine($"{e.ProgressPercentage} {e.ActionType}");
                        var client = _hubEventEmitter.GetClient(_lastConnectionId);
                        await client.SendAsync("SetupPlayerProgressChanged", e);
                    }
                    catch (Exception ex)
                    {

                    }
                }, 1000);
            }

            var result = WallpaperApi.SetupPlayer(wpType.Value, url, (async _ =>
            {
                //设置完成
                await _lastSetupPlayerRaiseLimiter.WaitExit();
                WallpaperApi.SetupPlayerProgressChangedEvent -= WallpaperManager_SetupPlayerProgressChangedEvent;
            }));

            if (result.Ok)
            {
                //开始成功
                _lastSetupPlayerRaiseLimiter = new RaiseLimiter();
                WallpaperApi.SetupPlayerProgressChangedEvent += WallpaperManager_SetupPlayerProgressChangedEvent;
                _lastConnectionId = Context.ConnectionId;
            }

            return result;
        }

        public Task<BaseApiResult> StopSetupPlayer()
        {
            return WallpaperApi.StopSetupPlayer();
        }

        public async Task<BaseApiResult<UserSetting>> GetUserSetting()
        {
            await AppManager.WaitInitialized();
            await AppManager.LoadUserSetting();
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
                var result = await WallpaperApi.SetOptions(setting.Wallpaper);
                //成功设置后保存，防止有异常导致启动崩溃
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
