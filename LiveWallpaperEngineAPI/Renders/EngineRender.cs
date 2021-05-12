using Giantapp.LiveWallpaper.Engine.Forms;
using Giantapp.LiveWallpaper.Engine.Utils;
using LiveWallpaperEngineRender;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using WinAPI.Helpers;
using Windows.Storage;

namespace Giantapp.LiveWallpaper.Engine.Renders
{
    /// <summary>
    /// 显示视频壁纸，后期可能会增加Web显示
    /// </summary>
    public class EngineRender : BaseRender
    {
        private static readonly ProcessJobTracker _pj = new();
        private static Process _renderProcess;
        private event EventHandler<RenderProtocol> ReceivedCommand;

        public static string PlayerFolderName { get; } = "LiveWallpaperEngineRender1.1";
        public EngineRender() : base(WallpaperType.Video,
            new List<string>() {
                ".mp4", ".flv", ".blv", ".avi", ".mov", ".gif", ".webm" }
            , false)
        {

        }
        public override void SetVolume(int v, string screen)
        {
            SendToRender(new RenderProtocol(new SetAudioPayload()
            {
                AudioScreen = screen,
                Volume = v
            })
            {
                Command = ProtocolDefinition.SetAudio
            });

            //var playingWallpaper = _currentWallpapers.Where(m => screen == m.Screen).FirstOrDefault();
            //if (playingWallpaper != null)
            //    AudioHelper.SetVolume(playingWallpaper.PId, v);
        }

        public override int GetVolume(string screen)
        {
            return 0;
            //var playingWallpaper = _currentWallpapers.Where(m => screen == m.Screen).FirstOrDefault();
            //int result = AudioHelper.GetVolume(playingWallpaper.PId);
            //return result;
        }
        protected override Task InnerCloseWallpaperAsync(List<RenderInfo> wallpaperRenders, WallpaperModel nextWallpaper)
        {
            //还要继续播放视频壁纸，不用关闭
            if (nextWallpaper != null && nextWallpaper.RunningData.Type == WallpaperType.Video)
            {
                return Task.CompletedTask;
            }

            //关闭壁纸
            SendToRender(new RenderProtocol(new StopVideoPayload()
            {
                Screen = wallpaperRenders.Select(m => m.Screen).ToArray(),
            })
            {
                Command = ProtocolDefinition.StopVideo
            });

            return Task.CompletedTask;
        }

        protected override async Task<BaseApiResult<List<RenderInfo>>> InnerShowWallpaper(WallpaperModel wallpaper, CancellationToken ct, params string[] screens)
        {
            ProcessStartInfo pInfo = await Task.Run(() => GetRenderProcessInfo(wallpaper));
            if (pInfo == null)
                return BaseApiResult<List<RenderInfo>>.ErrorState(ErrorType.NoPlayer);

            List<RenderInfo> infos = new();
            InitlizedPayload initlizedPayload = null;

            if (_renderProcess == null)
            {
                initlizedPayload = await StartProcess(pInfo, ct);
                //壁纸启动失败
                if (initlizedPayload == null)
                    return BaseApiResult<List<RenderInfo>>.ErrorState(ErrorType.Failed);

                //显示渲染容器
                foreach (var (screenItem, handle) in initlizedPayload.WindowHandles)
                {
                    if (ct.IsCancellationRequested)
                        break;

                    var host = LiveWallpaperRenderForm.GetHost(screenItem);
                    host!.ShowWallpaper(new IntPtr(handle));

                    infos.Add(new RenderInfo()
                    {
                        Wallpaper = wallpaper.Clone() as WallpaperModel,
                        Screen = screenItem
                    });
                }
            }
            else
            {
                foreach (var screenItem in screens)
                {
                    infos.Add(new RenderInfo()
                    {
                        Wallpaper = wallpaper.Clone() as WallpaperModel,
                        Screen = screenItem
                    });
                }
            }

            var screen = screens.Select(m =>
            {
                var exists = WallpaperApi.Options.ScreenOptions.FirstOrDefault(e => e.Screen == m);
                return new ScreenInfo(m, exists == null || exists.PanScan);
            }).ToArray();

            //显示壁纸
            SendToRender(new RenderProtocol(new PlayVideoPayload()
            {
                FilePath = wallpaper.RunningData.AbsolutePath,
                Screen = screen,
                HardwareDecoding = wallpaper.Option.HardwareDecoding,
                AudioScreen = WallpaperApi.Options.AudioScreen
            })
            {
                Command = ProtocolDefinition.PlayVideo
            });
            return BaseApiResult<List<RenderInfo>>.SuccessState(infos);
        }
        protected override void InnerPause(RenderInfo renderInfo)
        {
            SendToRender(new RenderProtocol(new PauseVideoPayload()
            {
                Screen = new string[] { renderInfo.Screen },
            })
            {
                Command = ProtocolDefinition.PauseVideo
            });
        }
        protected override void InnerResum(RenderInfo renderInfo)
        {
            SendToRender(new RenderProtocol(new ResumeVideoPayload()
            {
                Screen = new string[] { renderInfo.Screen },
            })
            {
                Command = ProtocolDefinition.ResumVideo
            });
        }
        private void Proc_OutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            Debug.WriteLine(e.Data);
            if (e.Data == null)
                return;
            var protocol = JsonSerializer.Deserialize<RenderProtocol>(e.Data);
            if (protocol != null)
                ReceivedCommand?.Invoke(this, protocol);
        }

        private void Proc_Exited(object sender, EventArgs e)
        {
            _renderProcess = null;
        }

        protected virtual ProcessStartInfo GetRenderProcessInfo(WallpaperModel model)
        {
            string playerPath = Path.Combine(WallpaperApi.Options.ExternalPlayerFolder, $@"{PlayerFolderName}\LiveWallpaperEngineRender.exe");

            //测试发现，自己写的程序用假路径执行不了。mpv没问题
            playerPath = GetRealPath(playerPath);

            if (!File.Exists(playerPath))
                return null;

            FileInfo info = new(playerPath);
            if (info.Length == 0)
                return null;

            ProcessStartInfo r = new()
            {
                FileName = playerPath,
                Arguments = "--WindowLeft -10000  --WindowTop -10000",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            return r;
        }

        public static string GetRealPath(string path)
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

                //uwp 真实存储路径不一样
                //https://stackoverflow.com/questions/48849076/uwp-app-does-not-copy-file-to-appdata-folder
                if (path.Contains(appData))
                {
                    string realAppData = Path.Combine(ApplicationData.Current.LocalCacheFolder.Path, "Local");
                    path = path.Replace(appData, realAppData);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
                return null;
            }
            return path;
        }

        protected async Task<InitlizedPayload> StartProcess(ProcessStartInfo info, CancellationToken ct)
        {
            if (_renderProcess != null)
                return null;

            Stopwatch sw = new();
            sw.Start();
            int timeout = 30 * 1000;

            InitlizedPayload result = null;

            void EngineRender__receivedCommand(object sender, RenderProtocol e)
            {
                if (e.Command == ProtocolDefinition.Initlized)
                {
                    result = e.GetPayLoad<InitlizedPayload>();
                }
            }

            ReceivedCommand += EngineRender__receivedCommand;

            try
            {
                _renderProcess = new Process
                {
                    StartInfo = info,
                    EnableRaisingEvents = true
                };

                _renderProcess.Exited += Proc_Exited;
                _renderProcess.OutputDataReceived += Proc_OutputDataReceived;
                var res = _renderProcess.Start();
                _renderProcess.BeginOutputReadLine();

                _pj.AddProcess(_renderProcess);

                while (result == null)
                {
                    ct.ThrowIfCancellationRequested();
                    await Task.Delay(1000, ct);
                    if (sw.ElapsedMilliseconds > timeout)
                    {
                        sw.Stop();
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
            }

            ReceivedCommand -= EngineRender__receivedCommand;

            return result;
        }

        private static void SendToRender(RenderProtocol renderProtocol)
        {
            var json = JsonSerializer.Serialize(renderProtocol);
            _renderProcess?.StandardInput.WriteLine(json);
        }
    }
}
