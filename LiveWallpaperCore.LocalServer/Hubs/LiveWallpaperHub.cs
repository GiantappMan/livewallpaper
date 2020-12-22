using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Models;
using LiveWallpaper.LocalServer.Utils;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Xabe.FFmpeg;

namespace LiveWallpaper.LocalServer.Hubs
{
    public class LiveWallpaperHub : Hub
    {
        HubEventEmitter _hubEventEmitter;
        //string _lastConnectionId;
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
        public async Task<BaseApiResult<List<string>>> GetThumbnails(string videoPath)
        {
            try
            {
                List<string> result = new List<string>();

                for (int i = 0; i < 5; i++)
                {
                    string path = System.IO.Path.GetTempFileName() + ".png";
                    IConversion conversion = await FFmpeg.Conversions.FromSnippet.Snapshot(videoPath, path, TimeSpan.FromSeconds(i * 2));
                    IConversionResult r = await conversion.Start();
                    result.Add(path);
                }

                return BaseApiResult<List<string>>.SuccessState(result);
            }
            catch (Exception error)
            {
                return BaseApiResult<List<string>>.ExceptionState(error);
            }
        }

        public Task<BaseApiResult<WallpaperModel>> ShowWallpaper(string path)
        {
            return WallpaperApi.ShowWallpaper(path);
        }

        public Task<BaseApiResult> DeleteWallpaper(string path)
        {
            return WallpaperApi.DeleteWallpaper(path);
        }

        public async Task<BaseApiResult> ExploreFile(string path)
        {
            try
            {
                await Task.Run(() => Process.Start("Explorer.exe", $" /select, {path}"));
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
            return BaseApiResult.SuccessState();
        }

        public BaseApiResult SetupPlayerByPath(string wallpaperPath, string customDownloadUrl)
        {
            var wpType = WallpaperApi.GetWallpaperType(wallpaperPath);
            return SetupPlayer(wpType, customDownloadUrl);
        }
        public BaseApiResult SetupPlayer(WallpaperType wpType, string customDownloadUrl)
        {
            string url = customDownloadUrl;
            if (string.IsNullOrEmpty(url))
                url = WallpaperApi.PlayerUrls.FirstOrDefault(m => m.Type == wpType).DownloadUrl;

            void WallpaperManager_SetupPlayerProgressChangedEvent(object sender, SetupPlayerProgressChangedArgs e)
            {
                _lastSetupPlayerRaiseLimiter.Execute(async () =>
                {
                    try
                    {
                        System.Diagnostics.Debug.WriteLine($"{e.ProgressPercentage} {e.ActionType}");
                        //向所有客户端推送，刷新后也能显示
                        var client = _hubEventEmitter.AllClient();
                        await client.SendAsync("SetupPlayerProgressChanged", e);
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine(ex);
                    }
                }, 1000);
            }

            _lastSetupPlayerRaiseLimiter = new RaiseLimiter();
            WallpaperApi.SetupPlayerProgressChangedEvent -= WallpaperManager_SetupPlayerProgressChangedEvent;
            WallpaperApi.SetupPlayerProgressChangedEvent += WallpaperManager_SetupPlayerProgressChangedEvent;
            var result = WallpaperApi.SetupPlayer(wpType, url, (async _ =>
            {
                //设置完成
                await _lastSetupPlayerRaiseLimiter.WaitExit();
                WallpaperApi.SetupPlayerProgressChangedEvent -= WallpaperManager_SetupPlayerProgressChangedEvent;
            }));

            if (result.Ok)
            {
                //开始成功
                //_lastSetupPlayerRaiseLimiter = new RaiseLimiter();
                //WallpaperApi.SetupPlayerProgressChangedEvent += WallpaperManager_SetupPlayerProgressChangedEvent;
                //_lastConnectionId = Context.ConnectionId;
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
