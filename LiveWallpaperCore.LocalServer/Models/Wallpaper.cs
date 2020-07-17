using DZY.Util.Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer.Models
{
    public class Wallpaper
    {
        [Obsolete]
        public string Path { get; set; }
        public ProjectInfo Info { get; set; }
        public string Dir { get; set; }

        [Obsolete]
        internal static IEnumerable<Wallpaper> GetWallpapers(string dir)
        {
            DirectoryInfo dirInfo = new DirectoryInfo(dir);

            //test E:\SteamLibrary\steamapps\workshop\content\431960
            //foreach (var item in Directory.EnumerateFiles(dir, "project.json", SearchOption.AllDirectories))
            foreach (var item in dirInfo.EnumerateFiles("project.json", SearchOption.AllDirectories).OrderByDescending(m => m.CreationTime))
            {
                var info = JsonHelper.JsonDeserializeFromFileAsync<ProjectInfo>(item.FullName).Result;
                //var saveDir = Path.GetDirectoryName(item.FullName);
                var result = new Wallpaper()
                {
                    Info = info,
                };
                yield return result;
            }
        }
    }
}
