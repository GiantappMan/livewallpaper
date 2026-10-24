using LiveWallpaper.LocalServer.Utils;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Controllers
{
    public class AssetsController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public async Task<ActionResult> Image(string localPath)
        {
            //只允许读取壁纸目录和临时目录（缩略图）下的图片，防止任意文件读取
            if (!SecurityGuard.IsPathUnderDir(AppManager.UserSetting?.Wallpaper.WallpaperSaveDir, localPath) &&
                !SecurityGuard.IsPathUnderDir(Path.GetTempPath(), localPath))
                return NotFound();

            if (!System.IO.File.Exists(localPath))
                return NotFound();

            for (int i = 0; i < 3; i++)
            {
                //可能文件正在访问，尝试x秒
                if (!IsFileReady(localPath))
                    await Task.Delay(2000);
            }

            var ext = Path.GetExtension(localPath).Replace(".", "");
            return base.File(new FileStream(localPath, FileMode.Open), $"image/{ext}");
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
    }
}
