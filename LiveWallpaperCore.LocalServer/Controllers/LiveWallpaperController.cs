using Giantapp.LiveWallpaper.Engine;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Controllers
{
    public class LiveWallpaperController : Controller
    {
        public IActionResult Version()
        {
            var version = Assembly.GetExecutingAssembly().GetName().Version;
            return Content(version.ToString());
        }

        [RequestSizeLimit(10L * 1024L * 1024L * 1024L)]
        [RequestFormLimits(MultipartBodyLengthLimit = 10L * 1024L * 1024L * 1024L)]
        public async Task<WallpaperModel> CreateWallpaperDraft(IFormCollection fc)
        {
            if (fc != null && fc.Files.Count > 0 && fc.Files[0].Length > 0)
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

                var r = WallpaperApi.CreateWallpaperModel(distFile);
                if (string.IsNullOrEmpty(r.Info.Title))
                {
                    int lastIndex = r.Info.File.LastIndexOf(".");
                    r.Info.Title = r.Info.File.Remove(lastIndex);
                }

                return r;
            }
            return null;
        }

        [RequestSizeLimit(5 * 1024L * 1024L)]
        [RequestFormLimits(MultipartBodyLengthLimit = 5 * 1024L * 1024L)]
        public async Task<string> UploadTmpFile(IFormCollection fc)
        {
            if (fc != null && fc.Files.Count > 0 && fc.Files[0].Length > 0)
            {
                var formFile = fc.Files[0];
                string fileName = formFile.FileName;
                var distFile = Path.Combine(Path.GetTempPath(), fileName);
                using var stream = System.IO.File.Create(distFile);
                await formFile.CopyToAsync(stream);

                return distFile;
            }
            return null;
        }
    }
}
