using System.Collections.Generic;
using System.Threading;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace LiveWallpaperCore.LocalServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WallpaperController : ControllerBase
    {
        [HttpGet]
        [Route(nameof(GetWallpapers))]
        public IEnumerable<string> GetWallpapers()
        {
            return new string[] { "value1", "value2" };
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

        [HttpPut("{id}")]
        [Route(nameof(ShowWallpaper))]
        public void ShowWallpaper(int id, [FromBody] string value)
        {
        }

        [HttpPut("{id}")]
        [Route(nameof(CloseWallpaper))]
        public void CloseWallpaper(int id, [FromBody] string value)
        {
        }

        [HttpDelete("{id}")]
        [Route(nameof(DeleteWallpaper))]
        public void DeleteWallpaper(int id)
        {
        }
    }
}
