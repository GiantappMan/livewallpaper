using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
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

        public IActionResult UploadFiles(IFormCollection files)
        {
            return Json(files.Files.Count);
        }
    }
}
