using Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Models;
using LiveWallpaper.LocalServer.Utils;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;
using Xabe.FFmpeg.Exceptions;
using static LiveWallpaper.LocalServer.Utils.FileDownloader;

namespace LiveWallpaper.LocalServer.Hubs
{
    public class LiveWallpaperHub : Hub
    {
        readonly HubEventEmitter _hubEventEmitter;

        //string _lastConnectionId;
        private RaiseLimiter _lastSetupPlayerRaiseLimiter = new RaiseLimiter();

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
                //FFmpeg.SetExecutablesPath(AppManager.FFmpegSaveDir);
                List<string> result = new List<string>();
                //最多截图四张截图
                for (int i = 1; i < 5; i++)
                {
                    string name = videoPath.GetHashCode().ToString();
                    int seconds = i * i + 5;
                    string distPath = Path.GetTempPath() + $"{name}_{seconds}.png";
                    if (!File.Exists(distPath))
                    {
                        var mediaInfo = await FFmpeg.GetMediaInfo(videoPath);
                        //秒超过总长度
                        if (seconds > mediaInfo.Duration.TotalSeconds)
                            break;
                        IConversion conversion = await FFmpeg.Conversions.FromSnippet.Snapshot(videoPath, distPath, TimeSpan.FromSeconds(seconds));
                        _ = await conversion.Start();
                    }

                    result.Add(WebUtility.UrlEncode(distPath));
                }

                return BaseApiResult<List<string>>.SuccessState(result);
            }
            catch (FFmpegNotFoundException)
            {
                return BaseApiResult<List<string>>.ErrorState(ErrorType.NoFFmpeg);
            }
            catch (Exception ex)
            {
                return BaseApiResult<List<string>>.ExceptionState(ex);
            }
        }

        public Task<BaseApiResult<WallpaperModel>> ShowWallpaper(string path)
        {
            return WallpaperApi.ShowWallpaper(path);
        }

        public async Task<BaseApiResult> DeleteWallpaper(string path)
        {
            string dir = Path.GetDirectoryName(path);
            //不能删除非壁纸目录的文件
            if (!dir.Contains(AppManager.UserSetting.Wallpaper.WallpaperSaveDir))
                return BaseApiResult.ErrorState(ErrorType.Failed);
            return await WallpaperApi.DeleteWallpaper(path);
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

        public BaseApiResult SetupFFmpeg(string url)
        {
            AppManager.FFMpegDownloader.PrgoressEvent += FileDownloader_SetupFFmpegPrgoressEvent;
            return AppManager.FFMpegDownloader.SetupFile(url);
        }

        private async void FileDownloader_SetupFFmpegPrgoressEvent(object sender, FileDownloader.ProgressArgs e)
        {
            var client = _hubEventEmitter.AllClient();

            await client.SendAsync("SetupFFmpegProgressChanged", new { e.Completed, e.Total, e.Percent, e.TypeStr, e.Successed });

            if (e.Type == ProgressArgs.ActionType.Completed)
            {
                AppManager.FFMpegDownloader.PrgoressEvent -= FileDownloader_SetupFFmpegPrgoressEvent;
            }
        }

        public Task<BaseApiResult> StopSetupFFmpeg()
        {
            return AppManager.FFMpegDownloader.StopSetupFile();

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
