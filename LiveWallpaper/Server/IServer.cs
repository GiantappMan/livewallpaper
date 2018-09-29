using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaper.Server
{
    public interface IServer
    {
        Task InitlizeServer(string url);
    }
}
