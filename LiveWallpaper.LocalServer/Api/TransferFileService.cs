using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Utils;
using System;
using System.IO;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Api
{
    /// <summary>
    /// 本地文件传输服务：图片读取（原 AssetsController.Image 逻辑）与文件上传保存（原 LiveWallpaperController.UploadFile 逻辑）。
    /// SignalR/HTTP Controller（DevHost）与 Shell 的 WebView2 原生拦截共用。
    /// </summary>
    public class TransferFileService
    {
        #region image

        /// <summary>
        /// 读取本地图片（仅限壁纸目录和临时目录），返回内容流与 Content-Type；不允许/不存在返回 null
        /// </summary>
        public async Task<ImageResult?> GetImageAsync(string? localPath)
        {
            //只允许读取壁纸目录和临时目录（缩略图）下的图片，防止任意文件读取
            if (!SecurityGuard.IsPathUnderDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir, localPath) &&
                !SecurityGuard.IsPathUnderDir(Path.GetTempPath(), localPath))
                return null;

            if (!File.Exists(localPath))
                return null;

            for (int i = 0; i < 3; i++)
            {
                //可能文件正在访问，尝试x秒
                if (!IsFileReady(localPath))
                    await Task.Delay(2000);
            }

            var ext = Path.GetExtension(localPath).Replace(".", "");
            return new ImageResult(new FileStream(localPath, FileMode.Open), $"image/{ext}");
        }

        public static bool IsFileReady(string filename)
        {
            try
            {
                using Stream stream = new FileStream(filename, FileMode.Open);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public class ImageResult
        {
            public Stream Content { get; }
            public string ContentType { get; }

            public ImageResult(Stream content, string contentType)
            {
                Content = content;
                ContentType = contentType;
            }
        }

        #endregion

        #region upload

        /// <summary>
        /// 保存上传的文件（只能写入壁纸目录；禁止可执行扩展名；规范化后严格校验防止..\跳出）
        /// </summary>
        /// <param name="content">文件内容流</param>
        /// <param name="rawFileName">原始文件名（可带路径部分，会截取末段）</param>
        /// <param name="distDir">目标目录</param>
        public async Task<BaseApiResult<string>> SaveUploadFileAsync(Stream? content, string? rawFileName, string? distDir)
        {
            if (string.IsNullOrEmpty(distDir))
                return BaseApiResult<string>.ErrorState(ErrorType.Failed, "distPath can not be empty");

            //只能写入壁纸目录，规范化后严格校验，防止..\跳出和同前缀目录名绕过
            string? saveDir = AppManager.UserSetting?.Wallpaper.WallpaperSaveDir;
            if (string.IsNullOrEmpty(saveDir) || !SecurityGuard.IsPathUnderDir(saveDir, distDir))
                return BaseApiResult<string>.ErrorState(ErrorType.NoPermission, "distDir is not allowed");

            try
            {
                if (content != null)
                {
                    //去掉路径部分，只保留文件名
                    string fileName = Path.GetFileName(rawFileName) ?? string.Empty;
                    if (string.IsNullOrEmpty(fileName))
                        return BaseApiResult<string>.ErrorState(ErrorType.Failed, "fileName is invalid");

                    //禁止通过网络上传可执行文件
                    if (SecurityGuard.IsBlockedFileExtension(fileName))
                        return BaseApiResult<string>.ErrorState(ErrorType.Failed, $"file type not allowed:{Path.GetExtension(fileName)}");

                    string normalizedDir = SecurityGuard.NormalizePath(distDir)!;
                    string distPath = Path.Combine(normalizedDir, fileName);

                    //拼接后再次校验
                    if (!SecurityGuard.IsPathUnderDir(saveDir, distPath))
                        return BaseApiResult<string>.ErrorState(ErrorType.NoPermission, "distPath is not allowed");

                    if (!Directory.Exists(normalizedDir))
                        Directory.CreateDirectory(normalizedDir);

                    using var stream = File.Create(distPath);
                    await content.CopyToAsync(stream);

                    return BaseApiResult<string>.SuccessState(distPath);
                }

                return BaseApiResult<string>.ErrorState(ErrorType.Failed);
            }
            catch (Exception ex)
            {
                return BaseApiResult<string>.ExceptionState(ex);
            }
        }

        #endregion
    }
}
