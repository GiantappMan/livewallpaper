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
    public static class WallpaperManager
    {
        public static string[] SupportedExtensions { get; } = new string[] {
            //video
            "mp4",
            //to do exe,html,image
            };

        public static async void Initlize()
        {
            await RestoreDefaultBG();
        }

        /// <summary>
        /// 解析壁纸
        /// </summary>
        /// <param name="filePath">壁纸路径</param>
        /// <remarks>如果目录下没有project.json，则会生成默认对象</remarks>
        /// <returns></returns>
        public static async Task<Wallpaper> ResolveFromFile(string filePath)
        {
            Wallpaper result = new Wallpaper
            {
                AbsolutePath = filePath
            };

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

        public static async Task RestoreDefaultBG()
        {
            var _defaultBG = await ImgWallpaper.GetCurrentBG();
            await ImgWallpaper.SetBG(_defaultBG);
        }

        public static Task Show(Wallpaper wallpaper)
        {
            return Task.CompletedTask;
        }
        //public static Task CreateLocalPack(Wallpaper wallpaper)
        //{
        //    var target = Path.Combine(Services.AppService.ApptEntryDir, "Wallpapers", wallpaper.ID);
        //    var destDir = Directory.CreateDirectory(target);
        //    var currentDir = Services.AppService.ApptEntryDir;

        //    var relativeDir = target.Replace(currentDir, "");

        //    wallpaper.Name = Name;

        //    switch (wallpaper.Type)
        //    {
        //        //case WallpaperType.Exe:
        //        //    if (relativeDir != wallpaper.PackInfo.Dir)
        //        //    {
        //        //        await Task.Run(() =>
        //        //        {
        //        //            CopyAll(new DirectoryInfo(wallpaper.PackInfo.Dir), destDir);
        //        //        });

        //        //    }
        //        //    break;
        //        //case WallpaperType.WEB:
        //        //    var htmlDir = Path.GetDirectoryName(wallpaper.PackInfo.Args);
        //        //    if (relativeDir != htmlDir)
        //        //    {
        //        //        await Task.Run(() =>
        //        //        {
        //        //            CopyAll(new DirectoryInfo(htmlDir), destDir);

        //        //            var fileExtension = Path.GetExtension(wallpaper.PackInfo.Args);
        //        //            string dest = Path.Combine(destDir.FullName, $"index{fileExtension}");
        //        //            var relativePath = dest.Replace(currentDir, "");

        //        //            wallpaper.PackInfo.Args = relativePath;
        //        //        });
        //        //    }
        //        //    break;
        //        case WallpaperType.Video:
        //            await Task.Run(() =>
        //            {
        //                var fileExtension = Path.GetExtension(wallpaper.PackInfo.Args);
        //                string dest = Path.Combine(destDir.FullName, $"index{fileExtension}");
        //                CopyFileToDir(wallpaper.PackInfo.Args, dest);
        //                var relativePath = dest.Replace(currentDir, "");

        //                wallpaper.PackInfo.Args = relativePath;
        //            });

        //            break;
        //    }

        //    wallpaper.PackInfo.Dir = relativeDir;
        //    //await ConfigHelper.SaveConfigAsync(wallpaper, Path.Combine(target, "config.json"));
        //}

        public static void CopyFileToDir(string path, string target)
        {
            FileInfo file = new FileInfo(path);
            file.CopyTo(target, true);
        }

        public static void CopyAll(DirectoryInfo source, DirectoryInfo target)
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
                CopyAll(diSourceSubDir, nextTargetSubDir);
            }
        }
    }
}
