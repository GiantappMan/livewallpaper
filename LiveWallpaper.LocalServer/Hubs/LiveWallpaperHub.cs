using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Api;
using LiveWallpaper.LocalServer.Models;
using LiveWallpaper.LocalServer.Utils;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;
using static LiveWallpaper.LocalServer.Utils.FileDownloader;

namespace LiveWallpaper.LocalServer.Hubs
{
    /// <summary>
    /// SignalR 传输层（DevHost/浏览器前端开发用）。
    /// 业务逻辑已抽取到 <see cref="LiveWallpaperApiService"/>，
    /// Shell 的 WebView2 WebMessage 桥与这里共用同一份实现。
    /// </summary>
    public class LiveWallpaperHub : Hub
    {
        readonly LiveWallpaperApiService _api;
        public LiveWallpaperHub(LiveWallpaperApiService api)
        {
            _api = api;
        }
        public string GetClientVersion()
        {
            return _api.GetClientVersion();
        }
        public Task<BaseApiResult<List<WallpaperModel>>> GetWallpapers()
        {
            return _api.GetWallpapers();
        }
        public Task<BaseApiResult<WallpaperModel>> GetWallpaper(string path)
        {
            return _api.GetWallpaper(path);
        }
        public Task<BaseApiResult<List<string>>> GetThumbnails(string videoPath)
        {
            return _api.GetThumbnails(videoPath);
        }
        public Task<BaseApiResult<WallpaperModel>> ShowWallpaper(string path, string targetScreen)
        {
            return _api.ShowWallpaper(path, targetScreen);
        }
        public Dictionary<string, WallpaperModel?> GetRunningWallpapers()
        {
            return _api.GetRunningWallpapers();
        }
        public Task<BaseApiResult> CloseWallpaper(string[] screen)
        {
            return _api.CloseWallpaper(screen);
        }
        public Task<BaseApiResult> ExploreFile(string path)
        {
            return _api.ExploreFile(path);
        }
        public BaseApiResult SetupFFmpeg(string url)
        {
            return _api.SetupFFmpeg(url);
        }
        public Task<BaseApiResult> StopSetupFFmpeg()
        {
            return _api.StopSetupFFmpeg();
        }
        public Task<BaseApiResult> StopSetupPlayer()
        {
            return _api.StopSetupPlayer();
        }
        public Task<BaseApiResult<UserSetting>> GetUserSetting()
        {
            return _api.GetUserSetting();
        }
        public Task<BaseApiResult> SetUserSetting(UserSetting setting)
        {
            return _api.SetUserSetting(setting);
        }
        public Task<BaseApiResult<RunningData>> GetRunningData()
        {
            return _api.GetRunningData();
        }
        public Task<BaseApiResult<string>> GetDraftDir()
        {
            return _api.GetDraftDir();
        }
        public Task<BaseApiResult> UpdateProjectInfo(string destDir, WallpaperProjectInfo? info)
        {
            return _api.UpdateProjectInfo(destDir, info);
        }
        public Task<BaseApiResult> UpdateWallpaperOption(string destDir, WallpaperOption option)
        {
            return _api.UpdateWallpaperOption(destDir, option);
        }
        public Task<BaseApiResult<WallpaperOption>> GetWallpaperOption(string wallpaperDir)
        {
            return _api.GetWallpaperOption(wallpaperDir);
        }
        //删除整个壁纸目录
        public Task<BaseApiResult> DeleteWallpaper(string path)
        {
            return _api.DeleteWallpaper(path);
        }
        //删除特定文件
        public Task<BaseApiResult> DeleteFiles(List<string> paths)
        {
            return _api.DeleteFiles(paths);
        }
        public Task<BaseApiResult> MoveFile(string path, string dist, bool deleteSource)
        {
            return _api.MoveFile(path, dist, deleteSource);
        }
        public Task<bool> OpenStoreReview()
        {
            return _api.OpenStoreReview();
        }

        //当前是否以UWP打包模式运行
        public Task<bool> IsUwp()
        {
            return _api.IsUwp();
        }

        public Task<BaseApiResult> StopDownloadWallpaper(string wallpaper)
        {
            return _api.StopDownloadWallpaper(wallpaper);
        }

        //兼容前端老版本
        public Task<BaseApiResult> DownloadWallpaper(string wallpaper, string cover, WallpaperProjectInfo? info)
        {
            return _api.DownloadWallpaper(wallpaper, cover, info);
        }

        //下载壁纸
        public Task<BaseApiResult> DownloadWallpaperToGroup(string wallpaper, string cover, WallpaperProjectInfo? info, string? groupDir)
        {
            return _api.DownloadWallpaperToGroup(wallpaper, cover, info, groupDir);
        }

        #region download records
        //下载历史记账在服务端：线上站/本地页等多个UI源展示同一份数据，刷新重启后仍可见
        public Task<BaseApiResult<List<DownloadRecord>>> GetDownloadRecords()
        {
            return _api.GetDownloadRecords();
        }

        public Task<BaseApiResult> ClearDownloadRecords()
        {
            return _api.ClearDownloadRecords();
        }

        //迁移旧版浏览器localStorage里的历史记录（仅补缺不覆盖），成功后前端会删掉本地key
        public Task<BaseApiResult> AddDownloadRecords(List<DownloadRecord> records)
        {
            return _api.AddDownloadRecords(records);
        }
        #endregion
    }
}
