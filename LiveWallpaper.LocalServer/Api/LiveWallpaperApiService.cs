using Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Models;
using LiveWallpaper.LocalServer.Utils;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Windows.Storage;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Exceptions;
using static LiveWallpaper.LocalServer.Utils.FileDownloader;

namespace LiveWallpaper.LocalServer.Api
{
    /// <summary>
    /// 客户端本地 API 的纯逻辑实现（原 LiveWallpaperHub 方法体抽取）。
    /// 传输层无关：LiveWallpaperHub（SignalR，DevHost/浏览器开发）与
    /// Shell 的 WebView2 WebMessage 桥（发布形态，无本地端口）共用同一份逻辑。
    /// 方法名/签名/返回值与原 Hub 完全一致，保证前端契约不变。
    /// </summary>
    public class LiveWallpaperApiService
    {
        readonly IEventPublisher _events;

        public LiveWallpaperApiService(IEventPublisher events)
        {
            _events = events;
        }

        public string GetClientVersion()
        {
            var version = Assembly.GetEntryAssembly()!.GetName().Version!;
            return version.ToString();
        }
        public async Task<BaseApiResult<List<WallpaperModel>>> GetWallpapers()
        {
            await AppManager.WaitInitialized();
            var result = await WallpaperApi.GetWallpapers();
            return result;
        }
        public async Task<BaseApiResult<WallpaperModel>> GetWallpaper(string path)
        {
            await AppManager.WaitInitialized();
            var result = await WallpaperApi.GetWallpaper(path);
            return result;
        }
        public async Task<BaseApiResult<List<string>>> GetThumbnails(string videoPath)
        {
            if (string.IsNullOrEmpty(videoPath))
                return BaseApiResult<List<string>>.ErrorState(ErrorType.Failed, "path cannot be null");
            try
            {
                //只能使用工具目录下的ffmpeg，有些用户全局变量有，但是会报错
                string? ffmpegDir = GetUwpRealPath(AppManager.FFmpegSaveDir);

                //本地调试又没有映射路径
                if (Directory.Exists(AppManager.FFmpegSaveDir))
                    FFmpeg.SetExecutablesPath(AppManager.FFmpegSaveDir);
                //传到store的，又映射了...
                else if (Directory.Exists(ffmpegDir))
                    FFmpeg.SetExecutablesPath(ffmpegDir);
                else
                    return BaseApiResult<List<string>>.ErrorState(ErrorType.NoFFmpeg);

                List<string> result = new();
                //最多截图四张截图
                var mediaInfo = await FFmpeg.GetMediaInfo(videoPath);
                var spanDuration = mediaInfo.Duration.TotalSeconds / 4;
                for (int i = 0; i < 4; i++)
                {
                    string name = videoPath.GetHashCode().ToString();
                    string distPath = Path.GetTempPath() + $"{name}_{i}.png";
                    if (!File.Exists(distPath))
                    {
                        IConversion conversion = await FFmpeg.Conversions.FromSnippet.Snapshot(videoPath, distPath, TimeSpan.FromSeconds(i * spanDuration));
                        _ = await conversion.Start();
                    }

                    distPath = distPath.Replace(@"\", @"\\");
                    //result.Add(WebUtility.UrlEncode(distPath));
                    result.Add(distPath);
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
        public async Task<BaseApiResult<WallpaperModel>> ShowWallpaper(string path, string targetScreen)
        {
            //只允许播放壁纸目录下已存在的壁纸文件，禁止执行外部传入的任意路径
            if (!SecurityGuard.IsPathUnderDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir, path))
                return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.NoPermission, "path is not allowed");

            if (AppManager.PlayerDownloader.IsBusy)
                return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.NoPlayer, null, null);

            var model = await WallpaperApi.ShowWallpaper(path, targetScreen);
            await AppManager.SaveCurrentWalpapers();
            return model;
        }
        public Dictionary<string, WallpaperModel?> GetRunningWallpapers()
        {
            return WallpaperApi.CurrentWalpapers;
        }
        public Task<BaseApiResult> CloseWallpaper(string[] screen)
        {
            screen ??= WallpaperApi.Screens;
            return WallpaperApi.CloseWallpaper(screen);
        }
        public async Task<BaseApiResult> ExploreFile(string path)
        {
            try
            {
                string? tmpPath = GetUwpRealPath(path);

                //uwp映射路径不存在，真实路径却存在
                if (!File.Exists(tmpPath) && !Directory.Exists(tmpPath) &&
                    (File.Exists(path) || Directory.Exists(path)))
                    tmpPath = path;

                await Task.Run(() => Process.Start("Explorer.exe", $" /select, {tmpPath}"));
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
            return BaseApiResult.SuccessState();
        }
        private static string? GetUwpRealPath(string? path)
        {
            try
            {
                if (path == null)
                    return null;
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

                //uwp 真实存储路径不一样
                //https://stackoverflow.com/questions/48849076/uwp-app-does-not-copy-file-to-appdata-folder
                if (path.Contains(appData))
                {
                    string realAppData = Path.Combine(ApplicationData.Current.LocalCacheFolder.Path, "Local");
                    path = path.Replace(appData, realAppData);
                }

                return path;
            }
            catch (Exception)
            {
                return path;
            }
        }
        public BaseApiResult SetupFFmpeg(string url)
        {
            if (AppManager.FFMpegDownloader.IsBusy)
                return BaseApiResult.BusyState();

            AppManager.FFMpegDownloader.ProgressEvent += FileDownloader_SetupFFmpegPrgoressEvent;
            return AppManager.FFMpegDownloader.SetupFile(url);
        }
        public Task<BaseApiResult> StopSetupFFmpeg()
        {
            return AppManager.FFMpegDownloader.StopSetupFile();
        }
        public Task<BaseApiResult> StopSetupPlayer()
        {
            return AppManager.PlayerDownloader.StopSetupFile();
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
                //重复调用
                //var result = await WallpaperApi.SetOptions(setting.Wallpaper);
                //成功设置后保存，防止有异常导致启动崩溃
                var result = await AppManager.SaveUserSetting(setting);
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
        public async Task<BaseApiResult<string>> GetDraftDir()
        {
            if (AppManager.RunningData == null)
                return BaseApiResult<string>.ErrorState(ErrorType.Uninitialized);

            string? lastDraftPath = AppManager.RunningData.LastDraftPath;
            if (!string.IsNullOrEmpty(lastDraftPath))
            {
                string projectPath = Path.Combine(lastDraftPath, "project.json");
                if (!File.Exists(projectPath) && Directory.Exists(lastDraftPath))
                {
                    await Task.Run(() =>
                    {
                        var files = Directory.GetFiles(lastDraftPath);
                        foreach (var file in files)
                        {
                            try
                            {
                                //删除老文件
                                File.Delete(file);
                            }
                            catch (Exception ex)
                            {
                                Debug.WriteLine(ex);
                                continue;
                            }
                        }
                    });
                    //返回上一次的临时目录，防止创建太多无用目录
                    return BaseApiResult<string>.SuccessState(lastDraftPath);
                }
            }

            var r = WallpaperApi.GetDraftDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir);
            AppManager.RunningData.LastDraftPath = r;
            await AppManager.SaveRunningData(AppManager.RunningData);

            return BaseApiResult<string>.SuccessState(r);
        }
        public async Task<BaseApiResult> UpdateProjectInfo(string destDir, WallpaperProjectInfo? info)
        {
            try
            {
                if (info == null)
                    return BaseApiResult.ErrorState(ErrorType.Failed);
                await WallpaperApi.UpdateProjectInfo(destDir, info);
                return BaseApiResult.SuccessState();
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
        }
        public async Task<BaseApiResult> UpdateWallpaperOption(string destDir, WallpaperOption option)
        {
            try
            {
                await WallpaperApi.UpdateWallpaperOption(destDir, option);
                return BaseApiResult.SuccessState();
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
        }
        public async Task<BaseApiResult<WallpaperOption>> GetWallpaperOption(string wallpaperDir)
        {
            try
            {
                var res = await WallpaperApi.GetWallpaperOption(wallpaperDir, new WallpaperOption());
                return BaseApiResult<WallpaperOption>.SuccessState(res);
            }
            catch (Exception ex)
            {
                return BaseApiResult<WallpaperOption>.ExceptionState(ex);
            }
        }
        //删除整个壁纸目录
        public async Task<BaseApiResult> DeleteWallpaper(string path)
        {
            string? dir = Path.GetDirectoryName(path);
            //不能删除非壁纸目录的文件
            if (!SecurityGuard.IsPathUnderDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir, dir))
                return BaseApiResult.ErrorState(ErrorType.NoPermission, "path is not allowed");
            return await WallpaperApi.DeleteWallpaper(path);
        }
        //删除特定文件
        public async Task<BaseApiResult> DeleteFiles(List<string> paths)
        {
            Exception? ex = null;
            foreach (var path in paths)
            {
                if (string.IsNullOrEmpty(path))
                    continue;

                try
                {
                    //不能删除非壁纸目录的文件
                    if (!SecurityGuard.IsPathUnderDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir, path))
                        continue;

                    await Task.Run(() =>
                    {
                        if (File.Exists(path))
                            File.Delete(path);
                    });
                }
                catch (Exception _ex)
                {
                    ex = _ex;
                }
            }

            if (ex == null)
                return BaseApiResult.SuccessState();
            else
                return BaseApiResult.ExceptionState(ex);
        }
        public async Task<BaseApiResult> MoveFile(string path, string dist, bool deleteSource)
        {
            if (string.IsNullOrEmpty(path))
                return BaseApiResult.ErrorState(ErrorType.Failed);

            if (!HasReadPermission(Path.GetDirectoryName(path)))
                return BaseApiResult.ErrorState(ErrorType.NoPermission);

            if (!HasWritePermission(Path.GetDirectoryName(dist)))
                return BaseApiResult.ErrorState(ErrorType.NoPermission);

            try
            {
                await Task.Run(() =>
                {
                    if (deleteSource)
                        File.Move(path, dist, true);
                    else
                        File.Copy(path, dist, true);
                });
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
            return BaseApiResult.SuccessState();
        }
        public Task<bool> OpenStoreReview()
        {
            return AppManager.OpenStoreReview();
        }

        //当前是否以UWP打包模式运行
        public Task<bool> IsUwp()
        {
            return Task.FromResult(AppManager.IsUwp);
        }

        public Task<BaseApiResult> StopDownloadWallpaper(string wallpaper)
        {
            if (_downloadingWallpapers.ContainsKey(wallpaper))
            {
                _downloadingWallpapers[wallpaper].Cancel(true);
            }
            return Task.FromResult(BaseApiResult.SuccessState());
        }

        readonly ConcurrentDictionary<string, CancellationTokenSource> _downloadingWallpapers = new();

        //兼容前端老版本
        public Task<BaseApiResult> DownloadWallpaper(string wallpaper, string cover, WallpaperProjectInfo? info)
        {
            return DownloadWallpaperToGroup(wallpaper, cover, info, null);
        }

        //下载壁纸
        public Task<BaseApiResult> DownloadWallpaperToGroup(string wallpaper, string cover, WallpaperProjectInfo? info, string? groupDir)
        {
            try
            {
                if (wallpaper == null)
                    return Task.FromResult(BaseApiResult.ErrorState(ErrorType.Failed));

                if (_downloadingWallpapers.ContainsKey(wallpaper))
                    return Task.FromResult(BaseApiResult.BusyState());

                //下载地址只允许公网http/https，防止被用来访问内网
                if (!SecurityGuard.IsSafeDownloadUrl(wallpaper) ||
                    (cover != null && !SecurityGuard.IsSafeDownloadUrl(cover)))
                    return Task.FromResult(BaseApiResult.ErrorState(ErrorType.Failed, "download url is not allowed"));

                string? destFolder = null;

                if (AppManager.UserSetting != null)
                {
                    if (info != null && info.ID != null)
                        destFolder = Path.Combine(AppManager.UserSetting.Wallpaper.WallpaperSaveDir, info.ID);
                    else
                        destFolder = WallpaperApi.GetDraftDir(AppManager.UserSetting.Wallpaper.WallpaperSaveDir);

                    //info.ID可能带..，落到壁纸目录外则拒绝
                    if (!SecurityGuard.IsPathUnderDir(AppManager.UserSetting.Wallpaper.WallpaperSaveDir, destFolder))
                        return Task.FromResult(BaseApiResult.ErrorState(ErrorType.NoPermission, "destFolder is not allowed"));
                }

                if (destFolder == null)
                    return Task.FromResult(BaseApiResult.ErrorState(ErrorType.Exception));

                //NetworkHelper.DownloadFileAsync不会创建目录，目录不存在会静默失败；这里主动创建，失败给明确错误
                try
                {
                    Directory.CreateDirectory(destFolder);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(ex);
                    return Task.FromResult(BaseApiResult.ErrorState(ErrorType.Failed, $"cannot create download dir: {destFolder}"));
                }

                info ??= new WallpaperProjectInfo();

                //URL末段为空时无法确定落盘文件名
                if (string.IsNullOrEmpty(Path.GetFileName(wallpaper)))
                    return Task.FromResult(BaseApiResult.ErrorState(ErrorType.Failed, "download url has no file name"));

                CancellationTokenSource cts = new();
                _downloadingWallpapers[wallpaper] = cts;
                _ = Task.Run(async () =>
                 {
                     RaiseLimiter _raiseLimiter = new();

                     var wpProgressInfo = new Progress<(float competed, float total)>((e) =>
                    {
                        _raiseLimiter.Execute(async () =>
                        {
                            //total未知(分块传输)时无法计算百分比，钳到0避免负数
                            float percent = e.total > 0 ? e.competed / e.total * 90 : 0;

                            //wallpaper/title供客户端按主文件URL归组事件（封面阶段与异常阶段path不是主文件URL）
                            await _events.PublishAsync("DownloadWallpaperProgressChanged", new { path = wallpaper, wallpaper, title = info?.Title, e.competed, e.total, percent, completed = false });
                        }, 1000);
                    });

                     var coverProgressInfo = new Progress<(float competed, float total)>((e) =>
                    {
                        _raiseLimiter.Execute(async () =>
                        {
                            //total未知时钳到90，完成事件由下载全部结束后的统一完成事件发送
                            var percent = e.total > 0 ? Math.Clamp(e.competed / e.total * 10 + 90, 0, 100) : 90;

                            await _events.PublishAsync("DownloadWallpaperProgressChanged", new { path = cover, wallpaper, title = info?.Title, e.competed, e.total, percent, completed = false, succeeded = true });
                        }, 1000);
                    });

                     info.File = Path.GetFileName(wallpaper);
                     string destWp = Path.Combine(destFolder, info.File);
                     try
                     {
                         await NetworkHelper.DownloadFileAsync(wallpaper, destWp, cts.Token, wpProgressInfo);
                         if (cover != null)
                         {
                             info.Preview = Path.GetFileName(cover);
                             string destCover = Path.Combine(destFolder, info.Preview);
                             await NetworkHelper.DownloadFileAsync(cover, destCover, cts.Token, coverProgressInfo);
                         }

                         //生成json
                         await UpdateProjectInfo(destFolder, info);

                         if (groupDir != null)
                         {
                             var wallpaper = await GetWallpaper(destFolder);
                             var group = await GetWallpaper(groupDir);
                             if (group != null && wallpaper != null)
                             {
                                 group.Data?.Info.GroupItems?.Insert(0, new GroupItemProjectInfo(wallpaper.Data?.Info));
                                 await UpdateProjectInfo(groupDir, group.Data?.Info);
                             }
                         }

                        //统一完成事件：封面不存在或长度未知时此前永远没有completed事件，客户端会一直等
                        await _events.PublishAsync("DownloadWallpaperProgressChanged", new { path = cover ?? wallpaper, wallpaper, title = info?.Title, percent = 100d, completed = true, succeeded = true });

                        //完成即记账，所有UI源共享同一份历史
                        await DownloadRecordManager.RecordAsync(new DownloadRecord
                        {
                            Url = wallpaper,
                            Title = info?.Title,
                            Succeeded = true,
                            Time = DateTime.Now,
                        });
                    }
                     catch (Exception ex)
                     {
                    _raiseLimiter.Execute(async () =>
                    {
                        var percent = 100;
                        //下载异常；path兜底为主文件URL防止无法归组，error供前端明确提示失败原因
                        await _events.PublishAsync("DownloadWallpaperProgressChanged", new { path = cover ?? wallpaper, wallpaper, title = info?.Title, percent, completed = true, succeeded = false, error = ex.Message });
                    }, 1000);

                        //取消与失败都记账；token已触发视为用户主动取消，与下载异常区分
                        bool cancelled = cts.IsCancellationRequested || ex is OperationCanceledException;
                        await DownloadRecordManager.RecordAsync(new DownloadRecord
                        {
                            Url = wallpaper,
                            Title = info?.Title,
                            Succeeded = false,
                            Cancelled = cancelled,
                            Error = ex.Message,
                            Time = DateTime.Now,
                        });

                        Debug.WriteLine(ex);
                    }
                     finally
                     {
                         _downloadingWallpapers.Remove(wallpaper, out _);
                     }
                 });
                return Task.FromResult(BaseApiResult.SuccessState());
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
                return Task.FromResult(BaseApiResult.ExceptionState(ex));
            }
        }

        #region download records
        //下载历史记账在服务端：线上站/本地页等多个UI源展示同一份数据，刷新重启后仍可见
        public async Task<BaseApiResult<List<DownloadRecord>>> GetDownloadRecords()
        {
            return BaseApiResult<List<DownloadRecord>>.SuccessState(await DownloadRecordManager.GetAsync());
        }

        public async Task<BaseApiResult> ClearDownloadRecords()
        {
            await DownloadRecordManager.ClearAsync();
            return BaseApiResult.SuccessState();
        }

        //迁移旧版浏览器localStorage里的历史记录（仅补缺不覆盖），成功后前端会删掉本地key
        public async Task<BaseApiResult> AddDownloadRecords(List<DownloadRecord> records)
        {
            await DownloadRecordManager.ImportAsync(records);
            return BaseApiResult.SuccessState();
        }
        #endregion

        #region private

        private async void FileDownloader_SetupFFmpegPrgoressEvent(object? sender, FileDownloader.ProgressArgs e)
        {
            await _events.PublishAsync("SetupFFmpegProgressChanged", new { e.Completed, e.Total, e.Percent, e.TypeStr, e.Successed });

            if (e.Type == ProgressArgs.ActionType.Completed)
            {
                AppManager.FFMpegDownloader.ProgressEvent -= FileDownloader_SetupFFmpegPrgoressEvent;
            }
        }
        private async void PlayerDownloader_ProgressEvent(object? sender, ProgressArgs e)
        {
            await _events.PublishAsync("SetupPlayerProgressChanged", new { e.Completed, e.Total, e.Percent, e.TypeStr, e.Successed });

            if (e.Type == ProgressArgs.ActionType.Completed)
            {
                AppManager.PlayerDownloader.ProgressEvent -= PlayerDownloader_ProgressEvent;
            }
        }
        private static bool HasReadPermission(string? dir)
        {
            if (string.IsNullOrEmpty(dir))
                return false;

            List<string?> allowDirs = new()
            {
                Path.GetTempPath(),
                AppManager.UserSetting?.Wallpaper.WallpaperSaveDir
            };

            return allowDirs.Any(item => SecurityGuard.IsPathUnderDir(item, dir));
        }
        private static bool HasWritePermission(string? dir)
        {
            //不能写入非壁纸目录
            return SecurityGuard.IsPathUnderDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir, dir);
        }
        #endregion
    }
}
