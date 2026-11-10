using LiveWallpaper.LocalServer.Api;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Controllers
{
    public class AssetsController : Controller
    {
        readonly TransferFileService _fileService;

        public AssetsController(TransferFileService fileService)
        {
            _fileService = fileService;
        }

        public IActionResult Index()
        {
            return View();
        }

        public async Task<ActionResult> Image(string localPath)
        {
            var result = await _fileService.GetImageAsync(localPath);
            if (result == null)
                return NotFound();

            return base.File(result.Content, result.ContentType);
        }
    }
}
