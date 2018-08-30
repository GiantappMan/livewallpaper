using DZY.DotNetUtil.Helpers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngine
{
    public static class WallpaperManager
    {
        public static string[] SupportedExtensions { get; } = new string[] {
            //video
            "mp4",
            //to do exe,html,image
            };
        /// <summary>
        /// 解析壁纸
        /// </summary>
        /// <param name="filePath">壁纸路径</param>
        /// <remarks>如果目录下没有project.json，则会生成默认对象</remarks>
        /// <returns></returns>
        public static async Task<Wallpaper> ResolveFromFile(string filePath)
        {
            Wallpaper result = new Wallpaper();
            result.AbsolutePath = filePath;

            string dir = Path.GetDirectoryName(filePath);
            result.ProjectInfo = await GetProjectInfo(dir);
            return result;
        }

        public static async Task<ProjectInfo> GetProjectInfo(string dirPath)
        {
            string file = Path.Combine(dirPath, "project.json");
            var info = await JsonHelper.JsonDeserializeFromFileAsync<ProjectInfo>(file);
            return info;
        }

        public static IEnumerable<Wallpaper> GetWallpapers(string dir)
        {
            //test E:\SteamLibrary\steamapps\workshop\content\431960
            foreach (var item in Directory.EnumerateFiles(dir, ""))
                yield return new Wallpaper();
        }
    }
}
