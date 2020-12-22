using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xabe.FFmpeg;

namespace LiveWallpaper.LocalServer.Controllers
{
    public class AssetsController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public ActionResult Image(string localPath)
        {
            if (!System.IO.File.Exists(localPath))
                return NotFound();

            var ext = Path.GetExtension(localPath).Replace(".", "");
            return base.File(new FileStream(localPath, FileMode.Open), $"image/{ext}");
        }
    }
}
