using DZY.Util.Common.Helpers;
using Giantapp.LiveWallpaper.Engine;
using Giantapp.LiveWallpaper.Engine.Models;
using GiantappMvvm.Base;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LiveWallpaper.WallpaperManagers
{
    /// <summary>
    /// 表示一个壁纸
    /// </summary>
    public class Wallpaper : ObservableObj
    {
        public static string[] VideoExtensions { get; } = new string[] { "*.mp4;*.flv;*.blv;*.avi", "|All Files|*.*" };
        /// <summary>
        /// 壁纸的绝对路径
        /// </summary>
        public string AbsolutePath { get; set; }

        #region Muted

        /// <summary>
        /// The <see cref="Muted" /> property's name.
        /// </summary>
        public const string MutedPropertyName = "Muted";

        private bool _Muted = true;

        /// <summary>
        /// Muted
        /// </summary>
        public bool Muted
        {
            get { return _Muted; }

            set
            {
                if (_Muted == value) return;

                _Muted = value;
                NotifyOfPropertyChange(MutedPropertyName);
            }
        }

        #endregion

        #region AbsolutePreviewPath

        /// <summary>
        /// The <see cref="AbsolutePreviewPath" /> property's name.
        /// </summary>
        public const string AbsolutePreviewPathPropertyName = "AbsolutePreviewPath";

        private string _AbsolutePreviewPath;

        /// <summary>
        /// AbsolutePreviewPath
        /// </summary>
        public string AbsolutePreviewPath
        {
            get { return _AbsolutePreviewPath; }

            set
            {
                if (_AbsolutePreviewPath == value) return;

                _AbsolutePreviewPath = value;
                NotifyOfPropertyChange(AbsolutePreviewPathPropertyName);
            }
        }

        #endregion

        //public string ExeName { get; internal set; }
        //public string ExePath { get; internal set; }
        //public object ExeArgs { get; internal set; }

        public string Dir { get; private set; }

        public Wallpaper()
        {

        }

        public Wallpaper(ProjectInfo info, string dir)
        {
            Dir = dir;
            ProjectInfo = info;
        }

        #region ProjectInfo

        /// <summary>
        /// The <see cref="ProjectInfo" /> property's name.
        /// </summary>
        public const string ProjectInfoPropertyName = "ProjectInfo";

        private ProjectInfo _ProjectInfo;

        /// <summary>
        /// ProjectInfo
        /// </summary>
        public ProjectInfo ProjectInfo
        {
            get { return _ProjectInfo; }

            set
            {
                if (_ProjectInfo == value) return;

                _ProjectInfo = value;

                if (value != null)
                {
                    if (Dir == null)
                        Dir = Path.GetDirectoryName(AbsolutePath);

                    if (Dir != null)
                    {
                        AbsolutePath = Path.Combine(Dir, value.File);
                        //AbsolutePreviewPath = Path.Combine(_dir, value.Preview ?? "preview.jpg");
                        if (!string.IsNullOrEmpty(value.Preview))
                            AbsolutePreviewPath = Path.Combine(Dir, value.Preview);
                    }
                }
                else
                {
                    AbsolutePath = AbsolutePreviewPath = null;
                }

                NotifyOfPropertyChange(ProjectInfoPropertyName);
            }
        }

        #endregion

        public static WallpaperType GetType(Wallpaper w)
        {
            if (w == null || w.ProjectInfo == null)
                return WallpaperType.NotSupport;

            return GetType(w.ProjectInfo.Type);
        }

        public static WallpaperType GetType(string type)
        {
            bool ok = Enum.TryParse(type, true, out WallpaperType r);
            if (!ok)
                return WallpaperType.NotSupport;
            return r;
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
        public static string GetWallpaperType(string filePath)
        {
            var extenson = Path.GetExtension(filePath);
            bool isVideo = VideoExtensions.FirstOrDefault(m => m.ToLower() == extenson.ToLower()) != null;
            if (isVideo)
                return WallpaperType.Video.ToString().ToLower();
            return null;
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

        public static async Task<bool> Delete(Wallpaper wallpaper)
        {
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

        public static async Task EditLocakPack(Wallpaper wallpaper, string destDir)
        {
            await WallpaperManager.EditLocalPack(wallpaper.AbsolutePath, wallpaper.AbsolutePreviewPath, Convert(wallpaper.ProjectInfo), destDir);
        }

        public static async Task<Wallpaper> CreateLocalPack(Wallpaper wallpaper, string destDir)
        {
            var tmpResult = await WallpaperManager.CreateLocalPack(wallpaper.AbsolutePath, wallpaper.AbsolutePreviewPath, Convert(wallpaper.ProjectInfo), destDir);
            return new Wallpaper(Convert(tmpResult.Info), destDir);
        }

        private static ProjectInfo Convert(WallpaperInfo info)
        {
            if (info == null)
                return null;
            var result = new ProjectInfo()
            {
                Description = info.Description,
                File = info.File,
                Preview = info.Preview,
                Title = info.Title,
                Type = info.Type,
                Visibility = info.Visibility
            };
            if (info.Tags != null)
                result.Tags = info.Tags.Split(",").ToList();

            return result;
        }
        private static WallpaperInfo Convert(ProjectInfo info)
        {
            if (info == null)
                return null;
            var result = new WallpaperInfo()
            {
                Description = info.Description,
                File = info.File,
                Preview = info.Preview,
                Title = info.Title,
                Type = info.Type,
                Visibility = info.Visibility
            };
            if (info.Tags != null)
                info.Tags.ForEach(m => result.Tags += $"{m},");

            return result;
        }

        //public static Wallpaper CreateLocalPack(Wallpaper wallpaper, string destDir)
        //{
        //    var currentDir = Path.GetDirectoryName(wallpaper.AbsolutePath);
        //    string projectInfoPath = Path.Combine(currentDir, "project.json");

        //    if (File.Exists(projectInfoPath))
        //    {
        //        //有详细信息，全拷。兼容wallpaper engine
        //        CopyFolder(new DirectoryInfo(currentDir), new DirectoryInfo(destDir));
        //    }
        //    else
        //    {
        //        CopyFileToDir(wallpaper.AbsolutePath, destDir);
        //    }

        //    string preview = "preview.jpg";
        //    wallpaper.ProjectInfo.Preview = preview;
        //    CopyFileToDir(wallpaper.AbsolutePreviewPath, destDir, preview);


        //    string jsonPath = Path.Combine(destDir, "project.json");
        //    JsonHelper.JsonSerialize(wallpaper.ProjectInfo, jsonPath);

        //    Wallpaper result = new Wallpaper(wallpaper.ProjectInfo, destDir);
        //    return result;
        //}
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

