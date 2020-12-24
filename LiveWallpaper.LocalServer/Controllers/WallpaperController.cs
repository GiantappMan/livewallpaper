using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using LiveWallpaperCore.LocalServer.Models;
using LiveWallpaperCore.LocalServer.Models.AppStates;
using LiveWallpaperCore.LocalServer.Store;
using Microsoft.AspNetCore.Mvc;
using Windows.Data.Xml.Dom;
using Windows.Foundation;
using Windows.UI.Notifications;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace LiveWallpaperCore.LocalServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WallpaperController : ControllerBase
    {
        //http://localhost:5001/api/wallpaper/getwallpapers
        [HttpGet]
        [Route(nameof(GetWallpapers))]
        public Task<List<Wallpaper>> GetWallpapers()
        {
            return WallpaperStore.GetWallpapers();
        }

        [HttpGet]
        [Route(nameof(GetState))]
        public object GetState()
        {
            return null;
        }

        [HttpGet]
        [Route(nameof(GetOptions))]
        public string GetOptions(int id)
        {
            return "value";
        }

        [HttpPost]
        [Route(nameof(SetOptions))]
        public void SetOptions([FromBody] string value)
        {
        }

        [HttpPut("ShowWallpaper/{path}")]
        public async Task<ResponseResult> ShowWallpaper(string path)
        {
            ResponseResult r;
            try
            {
                var result = await WallpaperStore.ShowWallpaper(path);
                r = new ResponseResult(result, null);
            }
            catch (System.Exception ex)
            {
                r = new ResponseResult(false, ex.ToString());
            }
            return r;
        }

        [HttpPut("CloseWallpaper/{id}")]
        public void CloseWallpaper(int id, [FromBody] string value)
        {
        }

        [HttpDelete("DeleteWallpaper/{id}")]
        public void DeleteWallpaper(int id)
        {
        }
    }
}
