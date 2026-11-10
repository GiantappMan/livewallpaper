using Giantapp.LiveWallpaper.Engine;
using LiveWallpaper.LocalServer.Api;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Controllers
{
    public class LiveWallpaperController : Controller
    {
        readonly TransferFileService _fileService;

        public LiveWallpaperController(TransferFileService fileService)
        {
            _fileService = fileService;
        }

        public IActionResult Version()
        {
            var version = Assembly.GetEntryAssembly()?.GetName().Version;
            return Content(version?.ToString() ?? string.Empty);
        }

        [RequestSizeLimit(long.MaxValue)]
        [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
        public async Task<BaseApiResult<string>> UploadFile(IFormCollection fc)
        {
            if (fc != null && fc.Files.Count > 0 && fc.Files[0].Length > 0)
            {
                var formFile = fc.Files[0];
                return await _fileService.SaveUploadFileAsync(formFile.OpenReadStream(), formFile.FileName, fc["distDir"]);
            }

            return await _fileService.SaveUploadFileAsync(null, null, fc?["distDir"]);
        }
    }
}
