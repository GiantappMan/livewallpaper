using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LiveWallpaper.Server.Models;

namespace LiveWallpaper.Server
{
    public interface IServer
    {
        Task InitlizeServer(string url);

        Task UploadWallpaper(Wallpaper wallpaper);

        Task<List<Wallpaper>> GetWallpapers();
    }
}
