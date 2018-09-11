using DZY.DotNetUtil.Helpers;
using LiveWallpaperEngine.NativeWallpapers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LiveWallpaperEngine
{
    public static partial class WallpaperManager
    {
        public static string[] VideoExtensions { get; } = new string[] {
            ".mp4",
            };
        public static List<string> SupportedExtensions { get; } = new List<string>();
        static WallpaperManager()
        {
            SupportedExtensions.AddRange(VideoExtensions);
        }

        public static async void Initlize()
        {
            await Task.Run(() =>
            {
                //恢复桌面，以防上次崩溃x显示黑屏
                HandlerWallpaper.DesktopWallpaperAPI.Enable(true);
            });
        }

        /// <summary>
        /// 解析壁纸
        /// </summary>
        /// <param name="filePath">壁纸路径</param>
        /// <remarks>如果目录下没有project.json，则会生成默认对象</remarks>
        /// <returns></returns>
        public static async Task<Wallpaper> ResolveFromFile(string filePath)
        {
            Wallpaper result = new Wallpaper()
            {
                AbsolutePath = filePath
            };

            string dir = Path.GetDirectoryName(filePath);
            result.ProjectInfo = await GetProjectInfo(dir);
            if (result.ProjectInfo == null)
                result.ProjectInfo = new ProjectInfo(filePath);

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
            foreach (var item in Directory.EnumerateFiles(dir, "project.json", SearchOption.AllDirectories))
            {
                var info = JsonHelper.JsonDeserializeFromFileAsync<ProjectInfo>(item).Result;
                var result = new Wallpaper(info, item);
                yield return result;
            }
        }

        public static async Task CreateLocalPack(Wallpaper wallpaper, string destDir)
        {
            await Task.Run(() =>
            {
                var currentDir = Path.GetDirectoryName(wallpaper.AbsolutePath);
                string projectInfoPath = Path.Combine(currentDir, "project.json");
                if (File.Exists(projectInfoPath))
                {
                    //有详细信息，全拷
                    CopyFolder(new DirectoryInfo(currentDir), new DirectoryInfo(destDir));
                }
                else
                    CopyFileToDir(wallpaper.AbsolutePath, destDir);
            });

            string jsonPath = Path.Combine(destDir, "project.json");
            await JsonHelper.JsonSerializeAsync(wallpaper.ProjectInfo, jsonPath);
        }

        public static void CopyFileToDir(string path, string dir)
        {
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            FileInfo file = new FileInfo(path);
            string target = Path.Combine(dir, file.Name);
            file.CopyTo(target, true);
        }

        public static void CopyFolder(DirectoryInfo source, DirectoryInfo target)
        {
            Directory.CreateDirectory(target.FullName);

            // Copy each file into the new directory.
            foreach (FileInfo fi in source.GetFiles())
            {
                Console.WriteLine(@"Copying {0}\{1}", target.FullName, fi.Name);
                fi.CopyTo(Path.Combine(target.FullName, fi.Name), true);
            }

            // Copy each subdirectory using recursion.
            foreach (DirectoryInfo diSourceSubDir in source.GetDirectories())
            {
                DirectoryInfo nextTargetSubDir =
                    target.CreateSubdirectory(diSourceSubDir.Name);
                CopyFolder(diSourceSubDir, nextTargetSubDir);
            }
        }
    }
}
