using Common.Helpers;
using Giantapp.LiveWallpaper.Engine.Renders;
using Giantapp.LiveWallpaper.Engine.Utils;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Threading;
using static Giantapp.LiveWallpaper.Engine.ScreenOption;

namespace Giantapp.LiveWallpaper.Engine
{
    public static class WallpaperApi
    {
        #region field

        private static readonly ConcurrentDictionary<string, string> _busyMethods = new();
        private static System.Timers.Timer _timer;
        private static Dispatcher _uiDispatcher;
        private static CancellationTokenSource _ctsSetupPlayer = new();

        #endregion

        static WallpaperApi()
        {
            //怀疑某些系统用不了
            WallpaperHelper.DoSomeMagic();
        }

        #region property

        public static string[] Screens { get; private set; }
        public static LiveWallpaperOptions Options { get; private set; } = new LiveWallpaperOptions();

        //Dictionary<DeviceName，WallpaperModel>
        public static Dictionary<string, WallpaperModel> CurrentWalpapers { get; private set; } = new Dictionary<string, WallpaperModel>();

        public static bool Initialized { get; private set; }

        public static readonly List<(WallpaperType Type, string DownloadUrl)> PlayerUrls = new()
        {
#if MPV
            (WallpaperType.Video, "https://github.com/giant-app/LiveWallpaperEngine/releases/download/v2.0.4/mpv.7z"),
#else
            (WallpaperType.Video, "https://github.com/giant-app/LiveWallpaper/releases/download/2.2.83/LiveWallpaperEngineRender.7z"),
#endif
            (WallpaperType.Web, "https://github.com/giant-app/LiveWallpaperEngine/releases/download/v2.0.4/web.7z"),
        };

        public static event EventHandler<SetupPlayerProgressChangedArgs> SetupPlayerProgressChangedEvent;

        #endregion

        #region public

        public static void Initlize(Dispatcher dispatcher)
        {
            _uiDispatcher = dispatcher;
            if (!Initialized)
            {
                RenderManager.Renders.Add(new ExeRender());
#if MPV
                RenderManager.Renders.Add(new VideoRender());
#else
                RenderManager.Renders.Add(new EngineRender());
#endif
                RenderManager.Renders.Add(new WebRender());
                RenderManager.Renders.Add(new ImageRender());
                Screens = Screen.AllScreens.Select(m => m.DeviceName).ToArray();
            }
            Initialized = true;
        }

        public static async Task<BaseApiResult<WallpaperModel>> GetWallpaper(string path)
        {
            try
            {
                if (!EnterBusyState(nameof(GetWallpaper)))
                    return new BaseApiResult<WallpaperModel>() { Ok = false, Error = ErrorType.Busy };

                if (!File.Exists(path))
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.Failed);

                string projectDir = Path.GetDirectoryName(path);

                var wp = await CreateWallpaperModelFromDir(Path.GetDirectoryName(path));
                if (wp == null)
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.Failed);

                return new BaseApiResult<WallpaperModel>() { Data = wp, Ok = true };
            }
            catch (Exception ex)
            {
                return new BaseApiResult<WallpaperModel>() { Ok = false, Error = ErrorType.Exception, Message = ex.Message };
            }
            finally
            {
                QuitBusyState(nameof(GetWallpaper));
            }
        }

        public static async Task<BaseApiResult<List<WallpaperModel>>> GetWallpapers(string dir)
        {
            try
            {
                if (!EnterBusyState(nameof(GetWallpapers)))
                    return new BaseApiResult<List<WallpaperModel>>() { Ok = false, Error = ErrorType.Busy };

                DirectoryInfo dirInfo = new(dir);
                if (!dirInfo.Exists)
                    return new BaseApiResult<List<WallpaperModel>>()
                    {
                        Ok = true
                    };

                List<WallpaperModel> result = new();
                //test E:\SteamLibrary\steamapps\workshop\content\431960
                //foreach (var item in Directory.EnumerateFiles(dir, "project.json", SearchOption.AllDirectories))
                var files = await Task.Run(() => dirInfo.GetFiles("project.json", SearchOption.AllDirectories).OrderByDescending(m => m.CreationTime));
                foreach (var item in files)
                {
                    //获取列表不读取option，以加快速度
                    var wp = await CreateWallpaperModelFromDir(Path.GetDirectoryName(item.FullName), false);
                    result.Add(wp);
                }

                return new BaseApiResult<List<WallpaperModel>>() { Data = result, Ok = true };
            }
            catch (Exception ex)
            {
                return new BaseApiResult<List<WallpaperModel>>() { Ok = false, Error = ErrorType.Exception, Message = ex.Message };
            }
            finally
            {
                QuitBusyState(nameof(GetWallpapers));
            }
        }

        public static async Task<BaseApiResult> DeleteWallpaper(string absolutePath)
        {
            foreach (var wp in CurrentWalpapers)
            {
                if (wp.Value.RunningData.AbsolutePath == absolutePath)
                {
                    //当前要删除的壁纸
                    await CloseWallpaper(wp.Key);
                }
            }

            string dir = Path.GetDirectoryName(absolutePath);
            Exception tmpEx = null;
            for (int i = 0; i < 3; i++)
            {
                await Task.Delay(1000);
                try
                {
                    //尝试删除3次 
                    Directory.Delete(dir, true);
                    return BaseApiResult.SuccessState();
                }
                catch (Exception ex)
                {
                    tmpEx = ex;
                }
            }

            if (tmpEx != null)
                return BaseApiResult.ExceptionState(tmpEx);

            return BaseApiResult.ErrorState(ErrorType.Failed);
        }

        /// <summary>
        /// 获取一个草稿目录
        /// </summary>
        /// <param name="parentDir"></param>
        /// <returns></returns>
        public static string GetDraftDir(string parentDir)
        {
            string destDir = Path.Combine(parentDir, Guid.NewGuid().ToString());
            return destDir;
        }

        /// <summary>
        /// 更新工程信息
        /// </summary>
        /// <param name="destDir"></param>
        /// <param name="info"></param>
        /// <returns></returns>
        public static async Task UpdateProjectInfo(string destDir, WallpaperProjectInfo info)
        {
            string jsonPath = Path.Combine(destDir, "project.json");
            await JsonHelper.JsonSerializeAsync(info, jsonPath);
        }

        public static WallpaperType GetWallpaperType(string wallpaper)
        {
            var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper));
            return currentRender.SupportType;
        }

        public static async Task<BaseApiResult<WallpaperModel>> ShowWallpaper(string wallpaperPath, params string[] screens)
        {
            var wpModel = await CreateWallpaperModelFromDir(Path.GetDirectoryName(wallpaperPath));
            if (wpModel == null)
                wpModel = new WallpaperModel()
                {
                    RunningData = new WallpaperRunningData()
                    {
                        AbsolutePath = wallpaperPath
                    }
                };
            var res = await ShowWallpaper(wpModel, screens);
            return res;
        }

        public static async Task<WallpaperOption> GetWallpaperOption(string dir, WallpaperOption defaultValue = null)
        {
            string optionPath = Path.Combine(dir, "option.json");
            var result = await ReadJsonObj(optionPath, defaultValue);
            return result;
        }

        /// <summary>
        /// 更新一个壁纸的参数
        /// </summary>
        /// <param name="wallpaperDir"></param>
        /// <param name="option"></param>
        /// <returns></returns>
        public static async Task UpdateWallpaperOption(string wallpaperDir, WallpaperOption option)
        {
            string optionPath = Path.Combine(wallpaperDir, "option.json");
            await JsonHelper.JsonSerializeAsync(option, optionPath);
        }

        public static async Task<WallpaperModel> CreateWallpaperModelFromDir(string dir, bool readOption = true)
        {
            string projectFile = Path.Combine(dir, "project.json");
            if (!File.Exists(projectFile))
                return null;

            WallpaperProjectInfo info = await ReadJsonObj<WallpaperProjectInfo>(projectFile, null);
            if (info == null)
                return null;

            string wallpaperPath = Path.Combine(dir, info.File);
            if (string.IsNullOrEmpty(info.LocalID))
                info.LocalID = wallpaperPath;

            var res = new WallpaperModel
            {
                Info = info
            };

            if (readOption)
                res.Option = await GetWallpaperOption(dir, new WallpaperOption());
            else
                res.Option = null;

            res.RunningData.AbsolutePath = wallpaperPath;
            res.RunningData.Dir = dir;
            var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaperPath));
            res.RunningData.Type = currentRender?.SupportType;

            return res;
        }

        public static async Task<BaseApiResult<WallpaperModel>> ShowWallpaper(WallpaperModel wallpaper, params string[] screens)
        {
            if (!Initialized)
                return new BaseApiResult<WallpaperModel>() { Ok = false, Message = "You need to initialize the SDK first", Error = ErrorType.Uninitialized };

            try
            {
                if (!EnterBusyState(nameof(ShowWallpaper)))
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.Busy, null, wallpaper);

                if (IsBusyState(nameof(SetupPlayer)))
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.NoPlayer, null, wallpaper);

                Debug.WriteLine("ShowWallpaper {0} {1}", wallpaper.RunningData.AbsolutePath, string.Join("", screens));

                screens = screens.Where(m => m != null).ToArray();
                if (screens.Length == 0)
                    screens = Screens;

                IRender currentRender;
                if (wallpaper.RunningData.Type == null)
                {
                    currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                    if (currentRender == null)
                        return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.NoRender, "This wallpaper type is not supported", wallpaper);

                    wallpaper.RunningData.Type = currentRender.SupportType;
                }
                else
                    currentRender = RenderManager.GetRender(wallpaper.RunningData.Type.Value);

                if (currentRender == null)
                    if (wallpaper.RunningData.Type == null)
                        throw new ArgumentException("Unsupported wallpaper type");

                List<string> needPlayScreens = new();

                foreach (var screenItem in screens)
                {
                    //设备现有屏幕名称，不包含输入的屏幕
                    if (!Screens.Contains(screenItem))
                        continue;
                    //当前屏幕没有壁纸
                    if (!CurrentWalpapers.ContainsKey(screenItem))
                        CurrentWalpapers.Add(screenItem, null);

                    var existWallpaper = CurrentWalpapers[screenItem];

                    //壁纸 路径并且参数相同，直接过滤
                    if (existWallpaper != null &&
                        existWallpaper.RunningData.AbsolutePath == wallpaper.RunningData.AbsolutePath &&
                        existWallpaper.Option == wallpaper.Option)
                        continue;

                    //关闭其他类型的壁纸
                    await CloseWallpaperEx(currentRender.SupportType, screenItem);

                    needPlayScreens.Add(screenItem);
                }

                var showResult = await currentRender.ShowWallpaper(wallpaper, needPlayScreens.ToArray());
                if (!showResult.Ok)
                {
                    return BaseApiResult<WallpaperModel>.ErrorState(showResult.Error, showResult.Message, wallpaper);
                }

                foreach (var item in needPlayScreens)
                {
                    CurrentWalpapers[item] = wallpaper;
                }

                ApplyAudioSource();

                MaximizedMonitor.Check();
                if (MaximizedMonitor.MaximizedScreens.Count > 0)
                {
                    //窗口已经最大化，处理暂停等操作
                    await HandleWindowMaximized(MaximizedMonitor.MaximizedScreens);
                }

                return BaseApiResult<WallpaperModel>.SuccessState(wallpaper);
            }
            catch (Exception ex)
            {
                return BaseApiResult<WallpaperModel>.ExceptionState(ex);
            }
            finally
            {
                QuitBusyState(nameof(ShowWallpaper));
            }
        }
        public static Task<BaseApiResult> CloseWallpaper(params string[] screens)
        {
            return CloseWallpaperEx(null, screens);
        }
        public static async Task<BaseApiResult> CloseWallpaperEx(WallpaperType? excludeType = null, params string[] screens)
        {
            try
            {
                if (!EnterBusyState(nameof(CloseWallpaper)))
                    return BaseApiResult.BusyState();

                List<string> tmpCloseScreen = new();
                foreach (var screenItem in screens)
                {
                    if (CurrentWalpapers.ContainsKey(screenItem))
                    {
                        var currentWallpaper = CurrentWalpapers[screenItem];
                        bool isExcluded = excludeType != null && currentWallpaper != null && currentWallpaper.RunningData.Type == excludeType;
                        CurrentWalpapers.Remove(screenItem);

                        if (isExcluded)
                            continue;
                        tmpCloseScreen.Add(screenItem);
                    }
                }
                await InnerCloseWallpaper(tmpCloseScreen.ToArray());
                return new BaseApiResult() { Ok = true };
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
            finally
            {
                QuitBusyState(nameof(CloseWallpaper));
            }
        }

        public static Task<BaseApiResult> SetOptions(LiveWallpaperOptions options)
        {
            return Task.Run(() =>
            {
                try
                {
                    if (!EnterBusyState(nameof(SetOptions)))
                        return BaseApiResult.BusyState();

                    Options = options;

                    ExplorerMonitor.ExplorerChanged -= ExplorerMonitor_ExpolrerCreated;
                    MaximizedMonitor.AppMaximized -= MaximizedMonitor_AppMaximized;

                    //if (options.AutoRestartWhenExplorerCrash == true)
                    ExplorerMonitor.ExplorerChanged += ExplorerMonitor_ExpolrerCreated;

                    bool enableMaximized = options.ScreenOptions.ToList().Exists(m => m.WhenAppMaximized != ActionWhenMaximized.Play);
                    if (enableMaximized)
                        MaximizedMonitor.AppMaximized += MaximizedMonitor_AppMaximized;

                    StartTimer(options.AutoRestartWhenExplorerCrash || enableMaximized);

                    ApplyAudioSource();
                    return new BaseApiResult() { Ok = true };
                }
                catch (Exception ex)
                {
                    return BaseApiResult.ExceptionState(ex);
                }
                finally
                {
                    QuitBusyState(nameof(SetOptions));
                }
            });
        }

        public static BaseApiResult SetupPlayer(WallpaperType type, string url, Action<BaseApiResult> callback = null)
        {
            if (!EnterBusyState(nameof(SetupPlayer)))
                return BaseApiResult.BusyState();

            _ = InnertSetupPlayer(type, url).ContinueWith(m => callback?.Invoke(m.Result));

            return BaseApiResult.SuccessState();
        }

        public static async Task<BaseApiResult> StopSetupPlayer()
        {
            try
            {
                if (!EnterBusyState(nameof(StopSetupPlayer)))
                    return BaseApiResult.BusyState();

                _ctsSetupPlayer?.Cancel();

                while (IsBusyState(nameof(SetupPlayer)))
                {
                    await Task.Delay(1000);
                }
                return BaseApiResult.SuccessState();
            }
            catch (Exception ex)
            {
                return BaseApiResult.ExceptionState(ex);
            }
            finally
            {
                QuitBusyState(nameof(StopSetupPlayer));
            }
        }

        #endregion

        #region private

        internal static void UIInvoke(Action a)
        {
            _uiDispatcher.Invoke(a);
        }

        private static async Task<BaseApiResult> InnertSetupPlayer(WallpaperType type, string url)
        {
            BaseApiResult result = null;
            SetupPlayerProgressChangedArgs.Type currentType = SetupPlayerProgressChangedArgs.Type.Downloading;
            try
            {
                _ctsSetupPlayer?.Cancel();
                _ctsSetupPlayer?.Dispose();
                _ctsSetupPlayer = new CancellationTokenSource();

                currentType = SetupPlayerProgressChangedArgs.Type.Downloading;
                string downloadFile = await DownloadPlayer(url, _ctsSetupPlayer.Token);
                currentType = SetupPlayerProgressChangedArgs.Type.Unpacking;
                await UnpackPlayer(type, downloadFile, _ctsSetupPlayer.Token);

                currentType = SetupPlayerProgressChangedArgs.Type.Completed;
                result = BaseApiResult.SuccessState();
            }
            catch (OperationCanceledException)
            {
                result = BaseApiResult.ErrorState(ErrorType.Canceled);
            }
            catch (Exception ex)
            {
                result = BaseApiResult.ExceptionState(ex);
            }
            finally
            {
                SetupPlayerProgressChangedEvent?.Invoke(null, new SetupPlayerProgressChangedArgs()
                {
                    AllCompleted = true,
                    Path = url,
                    ProgressPercentage = 1,
                    ActionType = currentType,
                    Result = result
                });

                QuitBusyState(nameof(SetupPlayer));
            }
            return result;
        }
        private static async Task<T> ReadJsonObj<T>(string path, T defaultVlaue = default) where T : class
        {
            T res = null;
            try
            {
                if (File.Exists(path))
                {
                    using FileStream fs = File.OpenRead(path);
                    res = await JsonSerializer.DeserializeAsync<T>(fs, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true });
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
            }
            finally
            {
                if (res == null)
                    res = defaultVlaue;
            }
            return res;
        }
        //离开busy状态
        private static void QuitBusyState(string method)
        {
            if (!IsBusyState(method))
                return;

            _busyMethods.TryRemove(method, out _);
        }
        private static bool IsBusyState(string method)
        {
            if (_busyMethods.ContainsKey(method))
                return true;
            return false;
        }
        //进入busy状态，失败返回false
        private static bool EnterBusyState(string method)
        {
            if (IsBusyState(method))
                return false;

            var r = _busyMethods.TryAdd(method, null);
            return r;
        }
        private static void Pause(params string[] screens)
        {
            foreach (var screenItem in screens)
            {
                if (CurrentWalpapers.ContainsKey(screenItem))
                {
                    var wallpaper = CurrentWalpapers[screenItem];
                    wallpaper.RunningData.IsPaused = true;
                    var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                    currentRender.Pause(screens);
                }
            }
        }
        private static void Resume(params string[] screens)
        {
            foreach (var screenItem in screens)
            {
                if (CurrentWalpapers.ContainsKey(screenItem))
                {
                    var wallpaper = CurrentWalpapers[screenItem];
                    wallpaper.RunningData.IsPaused = false;
                    var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                    currentRender.Resume(screens);
                }
            }
        }
        private static async Task UnpackPlayer(WallpaperType type, string zipFile, CancellationToken token)
        {
            void ArchiveFile_UnzipProgressChanged(object sender, SevenZipUnzipProgressArgs e)
            {
                SetupPlayerProgressChangedEvent?.Invoke(null, new SetupPlayerProgressChangedArgs()
                {
                    ActionCompleted = false,
                    Path = zipFile,
                    ProgressPercentage = e.Progress,
                    ActionType = SetupPlayerProgressChangedArgs.Type.Unpacking
                });
            }

            if (File.Exists(zipFile))
            {
                string distFolder = null;
                switch (type)
                {
                    case WallpaperType.Web:
                        distFolder = WebRender.PlayerFolderName;
                        break;
                    case WallpaperType.Video:
#if MPV
                        distFolder = VideoRender.PlayerFolderName;
#else
                        distFolder = EngineRender.PlayerFolderName;
#endif
                        break;
                }
                SevenZip archiveFile = new(zipFile);
                archiveFile.UnzipProgressChanged += ArchiveFile_UnzipProgressChanged;
                string dist = $@"{Options.ExternalPlayerFolder}\{distFolder}";

                try
                {
                    await Task.Run(() => archiveFile.Extract(dist, token), token);
                    SetupPlayerProgressChangedEvent?.Invoke(null, new SetupPlayerProgressChangedArgs()
                    {
                        ActionCompleted = true,
                        Path = zipFile,
                        ProgressPercentage = 1,
                        ActionType = SetupPlayerProgressChangedArgs.Type.Unpacking
                    });
                }
                catch (Exception)
                {
                    throw;
                }
                finally
                {
                    archiveFile.UnzipProgressChanged -= ArchiveFile_UnzipProgressChanged;
                }
            }
        }
        private static async Task<string> DownloadPlayer(string url, CancellationToken token)
        {
            string fileName = Path.GetFileName(url);
            string downloadFile = Path.Combine(Options.ExternalPlayerFolder, fileName); //$"{type}.7z"
            Debug.WriteLine("destpath:", downloadFile);
            if (File.Exists(downloadFile) && await SevenZip.CanOpenAsync(downloadFile))
                return downloadFile;

            try
            {
                await DownloadFileAsync(url, downloadFile, token, (c, t) =>
                {
                    var args = new SetupPlayerProgressChangedArgs()
                    {
                        ActionCompleted = false,
                        Path = url,
                        ProgressPercentage = (float)c / t,
                        ActionType = SetupPlayerProgressChangedArgs.Type.Downloading
                    };
                    SetupPlayerProgressChangedEvent?.Invoke(null, args);
                });

                SetupPlayerProgressChangedEvent?.Invoke(null, new SetupPlayerProgressChangedArgs()
                {
                    ActionCompleted = true,
                    Path = url,
                    ProgressPercentage = 1,
                    ActionType = SetupPlayerProgressChangedArgs.Type.Downloading
                });

                return downloadFile;
            }
            catch (Exception)
            {
                throw;
            }
        }
        public static async Task DownloadFileAsync(string uri, string distFile, CancellationToken cancellationToken, Action<long, long> progressCallback = null)
        {
            using HttpClient client = new();
            Debug.WriteLine($"download {uri}");
            using HttpResponseMessage response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);

            await Task.Run(() =>
            {
                var dir = Path.GetDirectoryName(distFile);
                if (!Directory.Exists(dir))
                    Directory.CreateDirectory(dir);
            });

            using FileStream distFileStream = new(distFile, FileMode.OpenOrCreate, FileAccess.Write);
            if (progressCallback != null)
            {
                long length = response.Content.Headers.ContentLength ?? -1;
                await using Stream stream = await response.Content.ReadAsStreamAsync().ConfigureAwait(false);
                byte[] buffer = new byte[4096];
                int read;
                int totalRead = 0;
                while ((read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false)) > 0)
                {
                    await distFileStream.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
                    totalRead += read;
                    progressCallback(totalRead, length);
                }
                Debug.Assert(totalRead == length || length == -1);
            }
            else
            {
                await response.Content.CopyToAsync(distFileStream).ConfigureAwait(false);
            }
        }
        private static void ApplyAudioSource()
        {
            //设置音源
            foreach (var screen in Screens)
            {
                if (CurrentWalpapers.ContainsKey(screen))
                {
                    var wallpaper = CurrentWalpapers[screen];
                    var currentRender = RenderManager.GetRender(wallpaper);
                    currentRender?.SetVolume(screen == Options.AudioScreen ? 100 : 0, screen);
                }
            }
        }
        private static async Task InnerCloseWallpaper(params string[] screens)
        {
            foreach (var m in RenderManager.Renders)
            {
                await m.CloseWallpaperAsync(screens);
            }
        }
        private static void StartTimer(bool enable)
        {
            if (enable)
            {
                if (_timer == null)
                    _timer = new System.Timers.Timer(1000);

                _timer.Elapsed -= Timer_Elapsed;
                _timer.Elapsed += Timer_Elapsed;
                _timer.Start();
            }
            else
            {
                if (_timer != null)
                {
                    _timer.Elapsed -= Timer_Elapsed;
                    _timer.Stop();
                    _timer = null;
                }
            }
        }
        #endregion

        #region callback

        private static void Timer_Elapsed(object sender, System.Timers.ElapsedEventArgs e)
        {
            _timer?.Stop();
            ExplorerMonitor.Check();
            MaximizedMonitor.Check();
            _timer?.Start();
        }

        private static async void ExplorerMonitor_ExpolrerCreated(object sender, bool crashed)
        {
            if (crashed)
            {
                await CloseWallpaper(Screens);
            }
            else
            {
                //重启
                Application.Restart();
            }
        }
        private static async void MaximizedMonitor_AppMaximized(object sender, AppMaximizedEvent e)
        {
            await HandleWindowMaximized(e.MaximizedScreens);
        }

        private static async Task HandleWindowMaximized(List<Screen> screens)
        {
            var maximizedScreens = screens.Select((m, i) => m.DeviceName).ToList();
            bool anyScreenMaximized = maximizedScreens.Count > 0;
            foreach (var item in Options.ScreenOptions)
            {
                string currentScreen = item.Screen;
                bool currentScreenMaximized = maximizedScreens.Contains(currentScreen) || Options.AppMaximizedEffectAllScreen && anyScreenMaximized;

                if (!CurrentWalpapers.ContainsKey(currentScreen))
                    continue;

                switch (item.WhenAppMaximized)
                {
                    case ActionWhenMaximized.Pause:
                        if (currentScreenMaximized)
                            Pause(currentScreen);
                        else
                            Resume(currentScreen);
                        break;
                    case ActionWhenMaximized.Stop:
                        if (currentScreenMaximized)
                        {
                            await InnerCloseWallpaper(currentScreen);
                            CurrentWalpapers[currentScreen].RunningData.IsStopedTemporary = true;
                        }
                        else if (CurrentWalpapers.ContainsKey(currentScreen))
                        {
                            //_ = ShowWallpaper(CurrentWalpapers[currentScreen], currentScreen);

                            var wallpaper = CurrentWalpapers[currentScreen];
                            var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                            await currentRender.ShowWallpaper(wallpaper, currentScreen);
                        }
                        break;
                    case ActionWhenMaximized.Play:
                        CurrentWalpapers[currentScreen].RunningData.IsStopedTemporary = false;
                        break;
                }
            }
        }
        #endregion
    }
}
