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
        public async Task<IActionResult> UploadWallpaper(IFormCollection files)
        {
            foreach (var formFile in files)
            {
                //    //if (formFile.Value.Length > 0)
                //    //{
                //    //    var filePath = Path.GetTempFileName();

                //    //    using (var stream = System.IO.File.Create(filePath))
                //    //    {
                //    //        await formFile.CopyToAsync(stream);
                //    //    }
                //    //}
            }
            return null;

            //return Json(files.Files.Count);
        }

        public async Task<IActionResult> Post(List<IFormFile> files)
        {
            long size = files.Sum(f => f.Length);


            // Process uploaded files
            // Don't rely on or trust the FileName property without validation.

            return Ok(new { count = files.Count, size });
        }
    }
}
