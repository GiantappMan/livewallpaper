using Giantapp.LiveWallpaper.Engine;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Controllers
{
    public class LiveWallpaperController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        //https://serversideup.net/uploading-files-vuejs-axios/
        //https://docs.microsoft.com/zh-cn/aspnet/core/mvc/models/file-uploads?view=aspnetcore-5.0#file-upload-scenarios
        [RequestSizeLimit(10L * 1024L * 1024L * 1024L)]
        [RequestFormLimits(MultipartBodyLengthLimit = 10L * 1024L * 1024L * 1024L)]
        public async Task<WallpaperModel> CreateWallpaperDraft(IFormCollection fc)
        {
            if (fc.Files.Count > 0 && fc.Files[0].Length > 0)
            {
                var formFile = fc.Files[0];
                var info = new WallpaperProjectInfo()
                {
                    File = formFile.FileName
                };
                var targetDir = await WallpaperApi.CreateWallpaperDraft(AppManager.UserSetting.Wallpaper.WallpaperSaveDir, info);
                var distFile = Path.Combine(targetDir, formFile.FileName);
                using var stream = System.IO.File.Create(distFile);
                await formFile.CopyToAsync(stream);

                //new WallpaperModel()
                //{
                //    AbsolutePath = filePath,
                //    Info = info
                //};
                return WallpaperApi.CreateWallpaperModel(distFile);
            }
            return null;
        }
    }
}
