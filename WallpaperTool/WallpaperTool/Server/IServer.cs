using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WallpaperTool.Server.Models;

namespace WallpaperTool.Server
{
    public interface IServer
    {
        Task InitlizeServer(string url);

        Task UploadWallpaper(Wallpaper wallpaper);

        Task<List<Wallpaper>> GetWallpapers();
    }
}
