using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Models
{
    public class ProjectInfo
    {
        public string Description { get; set; }
        public string Title { get; set; }
        public string File { get; set; }
        public string Preview { get; set; }
        public string Type { get; set; }
        public string Visibility { get; set; }
        public List<string> Tags { get; set; }
    }
}
