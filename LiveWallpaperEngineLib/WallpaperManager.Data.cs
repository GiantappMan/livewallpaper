using Caliburn.Micro;
using DZY.DotNetUtil.Helpers;
using LiveWallpaperEngine;
//using LiveWallpaperEngineLib.NativeWallpapers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace LiveWallpaperEngineLib
{
    public static partial class WallpaperManager
    {
        public static List<string> SupportedExtensions { get; } = new List<string>();
        static WallpaperManager()
        {
            SupportedExtensions.AddRange(VideoExtensions);
            InitUI();
        }

        public static void Initlize()
        {
            ////恢复桌面，以防上次崩溃x显示黑屏
            //HandlerWallpaper.DesktopWallpaperAPI.Enable(true);
        }

        /// <summary>
        /// 解析壁纸
        /// </summary>
        /// <param name="filePath">壁纸路径</param>
        /// <remarks>如果目录下没有project.json，则会生成默认对象</remarks>
        /// <returns></returns>
        public static Wallpaper ResolveFromFile(string filePath)
        {
            Wallpaper result = new Wallpaper()
            {
                AbsolutePath = filePath
            };

            string dir = Path.GetDirectoryName(filePath);
            result.ProjectInfo = GetProjectInfo(dir);
            if (result.ProjectInfo == null)
                result.ProjectInfo = new ProjectInfo(filePath);

            return result;
        }

        public static ProjectInfo GetProjectInfo(string dirPath)
        {
            string file = Path.Combine(dirPath, "project.json");
            var info = JsonHelper.JsonDeserializeFromFile<ProjectInfo>(file);
            return info;
        }

        public static IEnumerable<Wallpaper> GetWallpapers(string dir)
        {
            DirectoryInfo dirInfo = new DirectoryInfo(dir);

            //test E:\SteamLibrary\steamapps\workshop\content\431960
            //foreach (var item in Directory.EnumerateFiles(dir, "project.json", SearchOption.AllDirectories))
            foreach (var item in dirInfo.EnumerateFiles("project.json", SearchOption.AllDirectories).OrderByDescending(m => m.CreationTime))
            {
                var info = JsonHelper.JsonDeserializeFromFileAsync<ProjectInfo>(item.FullName).Result;
                var saveDir = Path.GetDirectoryName(item.FullName);
                var result = new Wallpaper(info, saveDir);
                yield return result;
            }
        }

        public static Wallpaper CreateLocalPack(Wallpaper wallpaper, string destDir)
        {
            var currentDir = Path.GetDirectoryName(wallpaper.AbsolutePath);
            string projectInfoPath = Path.Combine(currentDir, "project.json");

            if (File.Exists(projectInfoPath))
            {
                //有详细信息，全拷。兼容wallpaper engine
                CopyFolder(new DirectoryInfo(currentDir), new DirectoryInfo(destDir));
            }
            else
            {
                CopyFileToDir(wallpaper.AbsolutePath, destDir);
            }

            string preview = "preview.jpg";
            wallpaper.ProjectInfo.Preview = preview;
            CopyFileToDir(wallpaper.AbsolutePreviewPath, destDir, preview);


            string jsonPath = Path.Combine(destDir, "project.json");
            JsonHelper.JsonSerialize(wallpaper.ProjectInfo, jsonPath);

            Wallpaper result = new Wallpaper(wallpaper.ProjectInfo, destDir);
            return result;
        }

        public static async Task<bool> Delete(Wallpaper wallpaper)
        {
            string renderWallpaper = null;
            if (_videoRender != null)
                Execute.OnUIThread(() =>
                {
                    renderWallpaper = _videoRender.CurrentPath;
                });

            if (renderWallpaper != null &&
                renderWallpaper == wallpaper.AbsolutePath)
                Close();
            string dir = Path.GetDirectoryName(wallpaper.AbsolutePath);
            for (int i = 0; i < 3; i++)
            {
                await Task.Delay(1000);
                try
                {
                    //尝试删除3次 
                    Directory.Delete(dir, true);
                    return true;
                }
                catch (Exception)
                {
                }
            }
            return false;
        }

        public static void CopyFileToDir(string path, string dir, string targetFileName = null)
        {
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            if (!File.Exists(path))
                return;

            FileInfo file = new FileInfo(path);
            if (string.IsNullOrEmpty(targetFileName))
            {
                targetFileName = file.Name;
            }

            string target = Path.Combine(dir, targetFileName);
            if (path == target)
                return;

            file.CopyTo(target, true);
        }

        public static void CopyFolder(DirectoryInfo source, DirectoryInfo target)
        {
            Directory.CreateDirectory(target.FullName);

            foreach (FileInfo fi in source.GetFiles())
            {
                fi.CopyTo(Path.Combine(target.FullName, fi.Name), true);
            }

            foreach (DirectoryInfo diSourceSubDir in source.GetDirectories())
            {
                DirectoryInfo nextTargetSubDir =
                    target.CreateSubdirectory(diSourceSubDir.Name);
                CopyFolder(diSourceSubDir, nextTargetSubDir);
            }
        }
    }
}
