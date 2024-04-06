using NLog;
using System;
using System.Diagnostics;
using System.Text;

namespace WallpaperCore.Libs;

public class VideoPlayerApi : IVideoApi
{
    #region filed
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    WallpaperSetting _setting  = new();
    #endregion

    public static string PlayerPath { get; set; } = string.Empty;
    public IntPtr MainHandle { get; private set; }
    public string? IPCServerName { get; private set; }
    public Process? Process { get; private set; }
    public bool ProcessLaunched { get; private set; }
    public uint Volume { get; set; } = 0;
    #region constructs
    static VideoPlayerApi()
    {
        string currentFolder = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        PlayerPath = Path.Combine(currentFolder, "Assets\\Players\\VideoPlayer\\GiantappVideoPlayer.exe");
        _logger.Info("PlayerPath: " + PlayerPath);
    }
    #endregion

    public void ApplySetting(WallpaperSetting playSetting)
    {
    }

    public double GetDuration()
    {
        throw new NotImplementedException();
    }

    public double GetTimePos()
    {
        throw new NotImplementedException();
    }

    public async Task<bool> LaunchAsync(string? playlist = null)
    {
        try
        {
            Process?.CloseMainWindow();
            Process?.Dispose();

            Process = new Process
            {
                EnableRaisingEvents = true
            };
            Process.Exited += (s, e) =>
            {
                ProcessLaunched = false;
            };
            _logger.Info($"LaunchAsync {PlayerPath}");
            Process.StartInfo.FileName = PlayerPath;

            StringBuilder args = new();

            if (playlist != null)
                args.Append($"--playlist={playlist} ");

            //允许休眠
            args.Append("--stop-screensaver=no ");

            //设置解码模式为自动，如果条件允许，MPV会启动硬件解码
            string hwdec = _setting.HardwareDecoding ? "auto-safe" : "no";
            args.Append($"--hwdec={hwdec} ");

            string panscan = _setting.IsPanScan ? "1.0" : "0.0";
            //处理黑边
            args.Append($"--panscan={panscan} ");

            //保持比例
            args.Append("--keepaspect=yes ");

            //ipc
            args.Append($"--input-ipc-server={IPCServerName} ");

            //循环播放
            //args.Append("--loop-file=inf ");

            //列表循环播放
            args.Append("--loop-playlist=inf ");

            //最小化
            args.Append("--window-minimized=yes ");

            //允许屏保
            args.Append("--stop-screensaver=no ");

            //关闭logo显示
            args.Append("--no-osc ");

            //初始坐标
            args.Append("--geometry=-10000:-10000 ");

            //消除边框
            args.Append("--no-border ");

            //音量
            args.Append($"--volume={Volume} ");

            ////日志写到配置目录
            //args.Append("--log-file=D:\\mpv.log ");

            ////保持打开
            //args.Append("--keep-open=yes ");

            //禁用快捷键
            args.Append("--no-input-default-bindings ");

            Process.StartInfo.Arguments = args.ToString();
            var res = Process.Start();
            if (!res)
                return res;

            ProcessLaunched = true;
            //异步等待窗口句柄
            await Task.Run(async () =>
            {
                while (ProcessLaunched && Process.MainWindowHandle == IntPtr.Zero)
                {
                    //Thread.Sleep(100);
                    await Task.Delay(100);
                }
            });

            if (ProcessLaunched)
                MainHandle = Process.MainWindowHandle;
            return res;
        }
        catch (Exception ex)
        {
            ProcessLaunched = false;
            _logger.Error(ex, "Failed to launch mpv.");
            return false;
        }
    }

    public object? LoadList(string playlistPath)
    {
        throw new NotImplementedException();
    }

    public void Pause()
    {
        throw new NotImplementedException();
    }

    public void Resume()
    {
    }

    public void SetProgress(double progress)
    {
        throw new NotImplementedException();
    }

    public void SetVolume(uint volume)
    {
        throw new NotImplementedException();
    }

    public void Stop()
    {
        throw new NotImplementedException();
    }
}
