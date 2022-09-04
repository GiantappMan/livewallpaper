using Common.Helpers;
using Giantapp.LiveWallpaper.Engine.Forms;
using Giantapp.LiveWallpaper.Engine.Renders;
using Giantapp.LiveWallpaper.Engine.Renders.GroupRenders;
using Giantapp.LiveWallpaper.Engine.Utils;
using Microsoft.Win32;
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

        private static readonly ConcurrentDictionary<string, string?> _busyMethods = new();
        private static System.Timers.Timer? _timer;
        private static Dispatcher? _uiDispatcher;
        private static CancellationTokenSource _ctsSetupPlayer = new();

        #endregion

        static WallpaperApi()
        {
            //怀疑某些系统用不了
            WallpaperHelper.DoSomeMagic();
            SystemEvents.SessionSwitch += SystemEvents_SessionSwitch;
            SystemEvents.DisplaySettingsChanged += SystemEvents_DisplaySettingsChanged;
        }

        #region property
        public static Action<string>? Log { get; set; }
        public static string[] Screens { get; private set; } = Array.Empty<string>();
        public static LiveWallpaperOptions Options { get; private set; } = new LiveWallpaperOptions();

        //Dictionary<DeviceName，WallpaperModel>
        public static Dictionary<string, WallpaperModel?> CurrentWalpapers { get; private set; } = new();

        public static bool Initialized { get; private set; }

        public static List<WallpaperModel>? CacheWallpapers { get; private set; }
        public static string? WallpaperDir { get; set; }

        public static readonly List<(WallpaperType Type, string DownloadUrl)> PlayerUrls = new()
        {
#if MPV
            (WallpaperType.Video, "https://github.com/giant-app/LiveWallpaperEngine/releases/download/v2.0.4/mpv.7z"),
#else
            (WallpaperType.Video, "https://github.com/giant-app/LiveWallpaper/releases/download/2.2.83/LiveWallpaperEngineRender.7z"),
#endif
            (WallpaperType.Web, "https://github.com/giant-app/LiveWallpaperEngine/releases/download/v2.0.4/web.7z"),
        };

        public static event EventHandler<SetupPlayerProgressChangedArgs>? SetupPlayerProgressChangedEvent;

        #endregion

        #region public

        public static void Initlize(Dispatcher dispatcher)
        {
            _uiDispatcher = dispatcher;
            if (!Initialized)
            {
                RenderManager.Renders.Add(new ExeRender());
                //#if MPV
                RenderManager.Renders.Add(new VideoRender());
                //#else
                //RenderManager.Renders.Add(new EngineRender());
                //#endif
                RenderManager.Renders.Add(new WebRender());
                RenderManager.Renders.Add(new ImageRender());
                RenderManager.Renders.Add(new GroupRender());
                Screens = Screen.AllScreens.Select(m => m.DeviceName).ToArray();

                //初始化winform主窗口
                LiveWallpaperRenderForm.GetHost(Screen.PrimaryScreen.DeviceName);
            }

            Initialized = true;
        }

        public static async Task<BaseApiResult<WallpaperModel>> GetWallpaper(string dir)
        {
            try
            {
                if (!EnterBusyState(nameof(GetWallpaper)))
                    return new BaseApiResult<WallpaperModel>() { Ok = false, Error = ErrorType.Busy };

                if (!Directory.Exists(dir))
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.Failed);

                var wp = await CreateWallpaperModelFromDir(dir);
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

        public static async Task<BaseApiResult<List<WallpaperModel>>> GetWallpapers()
        {
            try
            {
                if (WallpaperDir == null)
                    return BaseApiResult<List<WallpaperModel>>.ErrorState(ErrorType.Uninitialized);

                if (!EnterBusyState(nameof(GetWallpapers)))
                    return new BaseApiResult<List<WallpaperModel>>() { Ok = false, Error = ErrorType.Busy };

                DirectoryInfo dirInfo = new(WallpaperDir);
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
                    try
                    {
                        //获取列表不读取option，以加快速度
                        var wp = await CreateWallpaperModelFromDir(Path.GetDirectoryName(item.FullName), false);
                        if (wp == null)
                            continue;
                        result.Add(wp);
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine(ex);
                        continue;
                    }
                }

                CacheWallpapers = result;
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
                if (wp.Value != null && wp.Value.RunningData.AbsolutePath == absolutePath)
                {
                    //当前要删除的壁纸
                    await CloseWallpaper(wp.Key);
                }
            }

            string? dir = Path.GetDirectoryName(absolutePath);
            Exception? tmpEx = null;
            if (dir != null)
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
        public static string? GetDraftDir(string? parentDir)
        {
            if (parentDir == null)
                return null;
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
            string groupLaunchFile = "index.group";
            string groupPath = Path.Combine(destDir, groupLaunchFile);
            if (info.Type == WallpaperInfoType.Group)
            {
                info.File = groupLaunchFile;
                await JsonHelper.JsonSerializeAsync(info.Title, groupPath);
            }

            string jsonPath = Path.Combine(destDir, "project.json");
            await JsonHelper.JsonSerializeAsync(info, jsonPath);
        }

        public static WallpaperType? GetWallpaperType(string wallpaper)
        {
            var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper));
            return currentRender?.SupportType;
        }

        public static async Task<BaseApiResult<WallpaperModel>> ShowWallpaper(string? wallpaperPath, params string[] screens)
        {
            if (wallpaperPath == null)
                return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.Failed);
            var wpModel = await CreateWallpaperModelFromDir(Path.GetDirectoryName(wallpaperPath));
            //json为空，或者json和文件路径不一致
            if (wpModel == null || wpModel.RunningData.AbsolutePath != wallpaperPath)
                wpModel = new WallpaperModel()
                {
                    RunningData = new WallpaperRunningData()
                    {
                        AbsolutePath = wallpaperPath
                    }
                };
            var res = await ShowWallpaper(wpModel, screens);
            GC.Collect();
            return res;
        }

        public static async Task<WallpaperOption?> GetWallpaperOption(string? dir, WallpaperOption? defaultValue = null)
        {
            if (dir == null)
                return new WallpaperOption();
            defaultValue ??= new WallpaperOption();
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
            async Task SaveData(WallpaperOption _option, string _wallpaperDir)
            {
                //更新缓存
                if (CacheWallpapers != null)
                {
                    var exist = CacheWallpapers.FirstOrDefault(m => m.RunningData.Dir == _wallpaperDir);
                    if (exist != null)
                        exist.Option = _option;
                }

                string optionPath = Path.Combine(_wallpaperDir, "option.json");
                await JsonHelper.JsonSerializeAsync(_option, optionPath);
            }

            await SaveData(option, wallpaperDir);
            var runningWPs = CurrentWalpapers.Where(m => m.Value != null && m.Value.RunningData.Dir == wallpaperDir).ToList();
            //修改的是当前运行壁纸的参数
            if (runningWPs.Count > 0)
            {
                string[] screens = runningWPs.Select(m => m.Key).ToArray();
                //是当前壁纸，重新应用生效
                if (runningWPs[0].Value != null)
                    await ShowWallpaper(runningWPs[0].Value!.RunningData.AbsolutePath, screens);
            }
            else
            {
                var runningGroups = CurrentWalpapers.Where(m => m.Value != null && m.Value.RunningData.Type == WallpaperType.Group);
                foreach (var groupItem in runningGroups)
                {
                    var existGroupItem = groupItem.Value?.Info.GroupItems?.FirstOrDefault(m => wallpaperDir == m.LocalID);
                    if (existGroupItem != null && existGroupItem.LocalID != null)
                    {
                        await SaveData(option, existGroupItem.LocalID);
                        ApplyAudioSource();
                        return;
                    }
                }
            }
        }

        public static async Task<WallpaperModel?> CreateWallpaperModelFromDir(string? dir, bool readOption = true)
        {
            if (dir == null)
                return null;

            string projectFile = Path.Combine(dir, "project.json");
            if (!File.Exists(projectFile))
                return null;

            WallpaperProjectInfo? info = await ReadJsonObj<WallpaperProjectInfo>(projectFile, null);
            if (info == null || info.File == null)
                return null;

            string? wallpaperPath = null;
            if (info.File != null)
                wallpaperPath = Path.Combine(dir, info.File);

            if (string.IsNullOrEmpty(info.LocalID))
                info.LocalID = dir; //不用文件名是防止一些分组 .json格式会导致路由请求出错

            var res = new WallpaperModel
            {
                Info = info
            };

            if (readOption)
                res.Option = await GetWallpaperOption(dir, new WallpaperOption()) ?? new WallpaperOption();
            else
                res.Option = new WallpaperOption();

            res.RunningData.AbsolutePath = wallpaperPath;
            res.RunningData.Dir = dir;
            var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaperPath));
            res.RunningData.Type = currentRender?.SupportType;

            return res;
        }

        public static async Task Dispose()
        {
            // 图片壁纸不关闭，可以不开客户端使用
            await CloseWallpaperEx(WallpaperType.Image, Screens);

            //还原系统壁纸
            WallpaperHelper.EnableSystemWallpaper(true);
        }

        public static async Task<BaseApiResult<WallpaperModel>> ShowWallpaper(WallpaperModel wallpaper, params string[] screens)
        {
            if (!Initialized)
                return new BaseApiResult<WallpaperModel>() { Ok = false, Message = "You need to initialize the SDK first", Error = ErrorType.Uninitialized };

            try
            {
                if (IsBusyState(nameof(SetupPlayer)))
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.NoPlayer, null, wallpaper);

                if (!EnterBusyState(nameof(ShowWallpaper)))
                    return BaseApiResult<WallpaperModel>.ErrorState(ErrorType.Busy, null, wallpaper);

                Debug.WriteLine("ShowWallpaper {0} {1}", wallpaper.RunningData.AbsolutePath, string.Join("", screens));

                screens = screens.Where(m => m != null).ToArray();
                if (screens.Length == 0)
                    screens = Screens;

                IRender? currentRender;
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
                        existWallpaper.RunningData.Type != WallpaperType.Group &&
                    WallpaperOption.EqualExceptVolume(existWallpaper.Option, wallpaper.Option))
                    {
                        if (existWallpaper.Option.Volume != wallpaper.Option.Volume)
                        {
                            //仅更新声音
                            existWallpaper.Option = wallpaper.Option;
                            ApplyAudioSource();
                        }
                        continue;
                    }


                    //关闭其他类型的壁纸
                    await CloseWallpaperEx(currentRender!.SupportType, screenItem);

                    needPlayScreens.Add(screenItem);
                }

                var showResult = await currentRender!.ShowWallpaper(wallpaper, needPlayScreens.ToArray());
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

        private static async Task<WallpaperModel?> GetNextWallpaperFromGroup(WallpaperModel groupWallpaper)
        {
            if (groupWallpaper.Option.LastWallpaperIndex == null)
                groupWallpaper.Option.LastWallpaperIndex = 0;
            else if (groupWallpaper.Option.LastWallpaperIndex >= groupWallpaper.Info.GroupItems?.Count - 1)
                groupWallpaper.Option.LastWallpaperIndex = 0;
            else
                groupWallpaper.Option.LastWallpaperIndex += 1;

            var info = groupWallpaper.Info.GroupItems?[groupWallpaper.Option.LastWallpaperIndex.Value];

            WallpaperModel? result = await GetModelFromCache(info?.LocalID);
            return result;
        }

        internal static async Task<WallpaperModel?> GetModelFromCache(string? LocalID)
        {
            if (LocalID == null)
                return null;

            if (CacheWallpapers == null)
                await GetWallpapers();

            var result = CacheWallpapers?.FirstOrDefault(m => m.Info.LocalID?.ToLower().Trim() == LocalID.ToLower().Trim());
            if (result == null)
                return null;
            result = await CreateWallpaperModelFromDir(result.RunningData.Dir);
            return result;
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
                if (tmpCloseScreen.Count > 0)
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

                    //StartTimer(options.AutoRestartWhenExplorerCrash || enableMaximized);
                    StartTimer(true);//始终开启，否则分组会失灵

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

        public static BaseApiResult SetupPlayer(WallpaperType type, string url, Action<BaseApiResult?>? callback = null)
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

        public static async Task DownloadFileAsync(string uri, string distFile, CancellationToken cancellationToken, Action<long, long>? progressCallback = null)
        {
            using HttpClient client = new();
            Debug.WriteLine($"download {uri}");
            using HttpResponseMessage response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);

            await Task.Run(() =>
            {
                var dir = Path.GetDirectoryName(distFile);
                if (dir != null && !Directory.Exists(dir))
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

        #endregion

        #region private

        //internal static void UIInvoke(Action a)
        //{
        //    a();
        //    //_uiDispatcher.Invoke(a);
        //}
        internal static void InvokeIfRequired(Action a)
        {
            if (Application.OpenForms.Count == 0)
            {
                a();
                return;
            }

            var mainForm = Application.OpenForms[0];
            if (mainForm.InvokeRequired)
                mainForm.Invoke(a);
            else
                a();
        }

        private static async Task<BaseApiResult?> InnertSetupPlayer(WallpaperType type, string url)
        {
            BaseApiResult? result = null;
            SetupPlayerProgressChangedArgs.Type currentType = SetupPlayerProgressChangedArgs.Type.Downloading;
            try
            {
                _ctsSetupPlayer?.Cancel();
                _ctsSetupPlayer?.Dispose();
                _ctsSetupPlayer = new CancellationTokenSource();

                currentType = SetupPlayerProgressChangedArgs.Type.Downloading;
                string? downloadFile = await DownloadPlayer(url, _ctsSetupPlayer.Token);
                if (downloadFile == null)
                    return result;
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

        private static async Task<T?> ReadJsonObj<T>(string path, T? defaultVlaue = default) where T : class
        {
            T? res = null;
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
                res ??= defaultVlaue;
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

        private static void Pause(PausedReason reason, params string[] screens)
        {
            foreach (var screenItem in screens)
            {
                if (CurrentWalpapers.ContainsKey(screenItem))
                {
                    var wallpaper = CurrentWalpapers[screenItem];
                    if (wallpaper == null)
                        continue;

                    if (!wallpaper.RunningData.IsPaused)
                    {
                        wallpaper.RunningData.IsPaused = true;
                        //应该暂停不更新这个值
                        wallpaper.RunningData.PausedReason = reason;
                    }
                    var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                    currentRender?.Pause(screens);
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
                    if (wallpaper == null)
                        continue;

                    wallpaper.RunningData.IsPaused = false;
                    wallpaper.RunningData.PausedReason = PausedReason.None;
                    var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                    currentRender?.Resume(screens);
                }
            }
        }

        private static async Task UnpackPlayer(WallpaperType type, string zipFile, CancellationToken token)
        {
            void ArchiveFile_UnzipProgressChanged(object? sender, SevenZipUnzipProgressArgs e)
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
                string? distFolder = null;
                switch (type)
                {
                    case WallpaperType.Web:
                        distFolder = WebRender.PlayerFolderName;
                        break;
                    case WallpaperType.Video:
                        //#if MPV
                        //                        distFolder = VideoRender.PlayerFolderName;
                        //#else
                        //                        distFolder = EngineRender.PlayerFolderName;
                        //#endif
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

        private static async Task<string?> DownloadPlayer(string url, CancellationToken token)
        {
            if (Options.ExternalPlayerFolder == null)
                return null;

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

        private static async void ApplyAudioSource()
        {
            //设置音源
            foreach (var screen in Screens)
            {
                if (CurrentWalpapers.ContainsKey(screen))
                {
                    var wallpaper = CurrentWalpapers[screen];
                    if (wallpaper == null)
                        continue;

                    if (wallpaper.Info.Type == WallpaperInfoType.Group)
                    {
                        if (wallpaper.Option.LastWallpaperIndex == null)
                            continue;
                        //是分组就生效当前播放的壁纸
                        var playingItem = wallpaper.Info.GroupItems?[wallpaper.Option.LastWallpaperIndex.Value];
                        var existWP = CacheWallpapers?.FirstOrDefault(m => m.Info.ID != null && m.Info.ID == playingItem?.ID || m.Info.LocalID == playingItem?.LocalID);
                        if (existWP != null)
                        {
                            wallpaper = existWP;
                            wallpaper.Option ??= await GetWallpaperOption(wallpaper.RunningData.Dir) ?? new();
                        }
                    }

                    var currentRender = RenderManager.GetRender(wallpaper);
                    if (Options != null)
                        currentRender?.SetVolume(screen == Options.AudioScreen ? wallpaper.Option.Volume : 0, screen);
                }
            }
        }

        private static async Task InnerCloseWallpaper(params string[] screens)
        {
            foreach (var m in RenderManager.Renders)
            {
                await m.CloseWallpaperAsync(null, screens);
            }
        }

        private static void StartTimer(bool enable)
        {
            if (enable)
            {
                _timer ??= new System.Timers.Timer(1000);

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

        private static async void Timer_Elapsed(object? sender, System.Timers.ElapsedEventArgs e)
        {
            _timer?.Stop();

            //if (e.SignalTime.Second == 0)
            //{//分组一分钟检查一次              
            foreach (var item in CurrentWalpapers.ToList())
            {
                var screen = item.Key;
                var wallpaper = item.Value;
                if (wallpaper?.Info.Type == WallpaperInfoType.Group && wallpaper.Option.WallpaperChangeTime <= DateTime.Now)
                {
                    // 有可能多款屏幕使用同一个分组
                    var tmpScreens = CurrentWalpapers.Where(m => m.Value != null && m.Value.RunningData.Dir == wallpaper.RunningData.Dir).Select(m => m.Key).ToArray();
                    await ShowWallpaper(wallpaper, tmpScreens);
                }
            }
            //}
            try
            {
                //ExplorerMonitor.Check();
                MaximizedMonitor.Check();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("check ex:", ex);
            }
            _timer?.Start();
        }

        private static async void ExplorerMonitor_ExpolrerCreated(object? sender, bool crashed)
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
        private static async void MaximizedMonitor_AppMaximized(object? sender, AppMaximizedEvent e)
        {
            if (e.MaximizedScreens == null)
                return;
            await HandleWindowMaximized(e.MaximizedScreens);
        }

        private static void SystemEvents_SessionSwitch(object sender, SessionSwitchEventArgs e)
        {
            try
            {
                Debug.WriteLine(e.Reason);
                switch (e.Reason)
                {
                    case SessionSwitchReason.SessionUnlock:
                        var screensPausedBySessionLock = CurrentWalpapers.Where(m => m.Value != null &&
                        m.Value.RunningData.IsPaused &&
                        m.Value.RunningData.PausedReason == PausedReason.SessionLock)
                            .Select(m => m.Key).ToArray();
                        Resume(screensPausedBySessionLock);
                        break;
                    case SessionSwitchReason.SessionLock:
                        Pause(PausedReason.SessionLock, Screens);
                        break;
                }
            }
            catch (Exception ex)
            {
                Log?.Invoke($"SystemEvents_SessionSwitch ex:{ex.Message}");
            }
        }

        private static void SystemEvents_DisplaySettingsChanged(object? sender, EventArgs e)
        {
            WallpaperHelper.UpdateScreenResolution();
        }
        private static async Task HandleWindowMaximized(List<Screen> screens)
        {
            var maximizedScreens = screens.Select((m, i) => m.DeviceName).ToList();
            bool anyScreenMaximized = maximizedScreens.Count > 0;
            foreach (var item in Options.ScreenOptions)
            {
                if (item.Screen == null)
                    continue;
                string currentScreen = item.Screen;
                bool currentScreenMaximized = maximizedScreens.Contains(currentScreen) || Options.AppMaximizedEffectAllScreen && anyScreenMaximized;

                if (!CurrentWalpapers.ContainsKey(currentScreen))
                    continue;

                var wallpaper = CurrentWalpapers[currentScreen];
                switch (item.WhenAppMaximized)
                {
                    case ActionWhenMaximized.Pause:
                        if (currentScreenMaximized)
                            Pause(PausedReason.ScreenMaximized, currentScreen);
                        else
                            Resume(currentScreen);
                        break;
                    case ActionWhenMaximized.Stop:
                        if (currentScreenMaximized)
                        {
                            await InnerCloseWallpaper(currentScreen);
                            if (wallpaper != null)
                                wallpaper.RunningData.IsStopedTemporary = true;
                        }
                        else if (CurrentWalpapers.ContainsKey(currentScreen) && wallpaper != null)
                        {
                            //_ = ShowWallpaper(CurrentWalpapers[currentScreen], currentScreen);                                
                            var currentRender = RenderManager.GetRenderByExtension(Path.GetExtension(wallpaper.RunningData.AbsolutePath));
                            if (currentRender != null)
                                await currentRender.ShowWallpaper(wallpaper, currentScreen);
                        }
                        break;
                    case ActionWhenMaximized.Play:
                        if (wallpaper != null)
                            wallpaper.RunningData.IsStopedTemporary = false;
                        break;
                }
            }
        }
        #endregion
    }
}
