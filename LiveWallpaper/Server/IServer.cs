using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Server
{
    public interface IServer
    {
        Task InitlizeServer(string url);

        Task<List<TagServerObj>> GetTags();
        Task<List<SortServerObj>> GetSorts();
        Task<List<WallpaperServerObj>> GetWallpapers(int tag, int sort, int page);
    }
}
