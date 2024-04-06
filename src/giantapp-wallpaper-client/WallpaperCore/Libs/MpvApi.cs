using Newtonsoft.Json;
using NLog;
using System.Diagnostics;
using System.IO.Pipes;
using System.Text;

namespace WallpaperCore.Libs;

public class MpvRequest
{
    [JsonProperty("command")]
    public object[]? Command { get; set; }
    [JsonProperty("request_id")]
    public string? RequestId { get; set; }
}

/// <summary>
/// mpv播放器管理，管道通信
/// </summary>
public class MpvApi : IVideoApi
{
    #region filed
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    #endregion

    #region public properties
    public IntPtr MainHandle { get; private set; }
    public string? IPCServerName { get; private set; }
    public Process? Process { get; private set; }
    public bool ProcessLaunched { get; private set; }
    public static string PlayerPath { get; set; } = string.Empty;
    public WallpaperSetting Setting { get; private set; } = new();
    public uint Volume { get; set; } = 0;

    #endregion

    #region constructs
    static MpvApi()
    {
        string currentFolder = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        PlayerPath = Path.Combine(currentFolder, "Assets\\Players\\Mpv\\mpv.exe");
        _logger.Info("PlayerPath: " + PlayerPath);
    }
    public MpvApi(string? ipcServerName = null, int? pId = null, string? processName = null)
    {
        if (ipcServerName != null)
        {
            IPCServerName = ipcServerName;
            //检查旧进程是否还存在
            if (pId != null)
            {
                try
                {
                    var runningProcesses = Process.GetProcesses();
                    if (runningProcesses.Any(p => p.Id == pId.Value))
                    {
                        Process = Process.GetProcessById(pId.Value);
                        ProcessLaunched = true;
                    }

                    if (Process == null || Process.HasExited || Process.ProcessName != processName)
                    {
                        ProcessLaunched = false;
                    }
                }
                catch (Exception ex)
                {
                    _logger.Warn(ex, "Failed to get mpv process.");
                    ProcessLaunched = false;
                }
            }
        }

        if (Process == null)
        {
            IPCServerName = $@"mpv{Guid.NewGuid()}";
        }
    }
    #endregion

    #region public
    public static MpvApi? From(string path)
    {
        if (!File.Exists(path))
            return null;

        return new MpvApi();
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
            string hwdec = Setting.HardwareDecoding ? "auto-safe" : "no";
            args.Append($"--hwdec={hwdec} ");

            string panscan = Setting.IsPanScan ? "1.0" : "0.0";
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

    public void Quit()
    {
        SendMessage(IPCServerName, "quit");
    }

    public string? GetPath()
    {
        return SendMessage(IPCServerName, "get_property", "path")?.ToString();
    }

    public object? LoadList(string playlist)
    {
        return SendMessage(IPCServerName, "loadlist", playlist, "replace");
    }

    public void LoadFile(string file)
    {
        if (Process == null)
            return;
        SendMessage(IPCServerName, "loadfile", file, "replace");
    }

    internal int GetPlayIndex()
    {
        var res = SendMessage(IPCServerName, "get_property", "playlist-pos");
        if (res == null)
            return 0;
        return Convert.ToInt32(res);
    }

    public void Pause()
    {
        SendMessage(IPCServerName, "set_property", "pause", true);
    }

    public void Resume()
    {
        SendMessage(IPCServerName, "set_property", "pause", false);
    }

    public void Stop()
    {
        //mpv 关闭视频 进程会退出
        SendMessage(IPCServerName, "stop");
        ProcessLaunched = false;
        //Pause();

        //加载空文件
        //SendMessage(IPCServerName, "loadfile", "");
    }

    public void SetVolume(uint volume)
    {
        Volume = volume;
        SendMessage(IPCServerName, "set_property", "volume", volume);
    }

    public void SetHwdec(bool enabled)
    {
        SendMessage(IPCServerName, "set_property", "hwdec", enabled ? "auto-safe" : "no");
    }

    //public void SetLoopPlaylist(bool enabled)
    //{
    //    SendMessage(IPCServerName, "set_property", "loop-playlist", enabled ? "inf" : "no");
    //}

    public void SetPanAndScan(bool enabled)
    {
        SendMessage(IPCServerName, "set_property", "panscan", enabled ? "1.0" : "0.0");
    }

    public void ApplySetting(WallpaperSetting setting)
    {
        Setting = setting;
        if (!ProcessLaunched)
            return;

        SetVolume(Volume);
        SetHwdec(setting.HardwareDecoding);
        SetPanAndScan(setting.IsPanScan);
    }

    //获取播放进度
    public double GetProgress()
    {
        var res = SendMessage(IPCServerName, "get_property", "percent-pos");
        if (res == null)
            return 0;
        return Convert.ToDouble(res);
    }

    //获取播放了多少秒
    public double GetTimePos()
    {
        var res = SendMessage(IPCServerName, "get_property", "time-pos");
        if (res == null)
            return 0;
        return Convert.ToDouble(res);
    }

    //获取播放总时长
    public double GetDuration()
    {
        var res = SendMessage(IPCServerName, "get_property", "duration");
        if (res == null)
            return 0;
        return Convert.ToDouble(res);
    }

    //设置播放进度
    public void SetProgress(double progress)
    {
        SendMessage(IPCServerName, "set_property", "percent-pos", progress);
    }

    #endregion

    #region private
    private object? SendMessage(string? serverName, params object[] command)
    {
        if (serverName == null)
            return null;

        try
        {
            if (Process == null || Process.HasExited)
            {
                ProcessLaunched = false;
                return null;
            }
        }
        catch (InvalidOperationException ex)
        {
            _logger.Warn(ex, "Failed to get mpv process.");
            ProcessLaunched = false;
            return null;
        }

        try
        {
            string id = Guid.NewGuid().ToString();
            using NamedPipeClientStream pipeClient = new(serverName);
            pipeClient.Connect(0); // 连接超时时间

            if (pipeClient.IsConnected)
            {
                // 发送命令
                var request = new MpvRequest
                {
                    Command = command,
                    RequestId = id
                };
                var sendContent = JsonConvert.SerializeObject(request) + "\n";
                byte[] commandBytes = Encoding.UTF8.GetBytes(sendContent);
                pipeClient.Write(commandBytes, 0, commandBytes.Length);

                // 读取响应
                byte[] buffer = new byte[4096];
                int bytesRead = pipeClient.Read(buffer, 0, buffer.Length);

                // 将字节数组转换为字符串
                string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                if (!sendContent.Contains("duration") && !sendContent.Contains("time-pos"))
                {
                    _logger.Info(sendContent + "mpv response: " + response);
                    Debug.WriteLine(sendContent + "mpv response: " + response);
                }
                //查找id匹配的结果
                var jobj = JsonConvert.DeserializeObject<dynamic>(response);
                if (jobj?.request_id == id)
                {
                    return jobj.data;
                }
            }
            else
            {
                _logger.Warn("Failed to connect to mpv.");
            }
        }
        catch (Exception ex)
        {
            _logger.Warn(ex, "Failed to get mpv info.");
        }
        return null;
    }

    #endregion
}
