using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Controllers
{
    public class AssetsController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public ActionResult Image(string localPath)
        {
            var ext = Path.GetExtension(localPath).Replace(".", "");
            if (!System.IO.File.Exists(localPath))
                return null;
            return base.File(new FileStream(localPath, FileMode.Open), $"image/{ext}");
        }
    }
}
