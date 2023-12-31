using Newtonsoft.Json;
using NLog;
using System.Diagnostics;
using System.IO.Pipes;
using System.Text;

namespace WallpaperCore.Players;

public class MpvRequest
{
    [JsonProperty("command")]
    public object[]? Command { get; set; }
    [JsonProperty("request_id")]
    public string? RequestId { get; set; }
}

public class MpvPlayerSnapshot
{
    public string? IPCServerName { get; set; }
    public int? PId { get; set; }
    public string? ProcessName { get; set; }
}

/// <summary>
/// mpv播放器管理，管道通信
/// </summary>
public class MpvPlayer
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

    #region Options
    public bool AutoHwdec { get; set; } = true;//auto-safe 硬解,no 软解

    public string PanAndScan { get; set; } = "1.0";//0.0-1.0  铺满,防止视频黑边
    #endregion

    #endregion

    #region public
    static MpvPlayer()
    {
        string currentFolder = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        PlayerPath = Path.Combine(currentFolder, "Assets\\Player\\mpv.exe");
        _logger.Info("PlayerPath: " + PlayerPath);
    }
    public MpvPlayer(MpvPlayerSnapshot? snapshot = null)
    {
        if (snapshot != null)
        {
            IPCServerName = snapshot.IPCServerName;
            //检查旧进程是否还存在
            if (snapshot.PId != null)
            {
                try
                {
                    var runningProcesses = Process.GetProcesses();
                    if (runningProcesses.Any(p => p.Id == snapshot.PId.Value))
                    {
                        Process = Process.GetProcessById(snapshot.PId.Value);
                        ProcessLaunched = true;
                    }

                    if (Process == null || Process.HasExited || Process.ProcessName != snapshot.ProcessName)
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

    public static MpvPlayer? From(string path)
    {
        if (!File.Exists(path))
            return null;

        return new MpvPlayer();
    }

    public async Task<bool> LaunchAsync(string? playlist = null)
    {
        try
        {
            Process?.CloseMainWindow();
            Process?.Dispose();

            Process = new Process();
            _logger.Error($"LaunchAsync {PlayerPath}");
            Process.StartInfo.FileName = PlayerPath;

            StringBuilder args = new();

            if (playlist != null)
                args.Append($"--playlist={playlist} ");

            //允许休眠
            args.Append("--stop-screensaver=no ");

            //设置解码模式为自动，如果条件允许，MPV会启动硬件解码
            string hwdec = AutoHwdec ? "auto-safe" : "no";
            args.Append($"--hwdec={hwdec} ");

            //处理黑边
            args.Append($"--panscan={PanAndScan} ");

            //ipc
            args.Append($"--input-ipc-server={IPCServerName} ");

            //循环播放
            args.Append("--loop-file=inf ");

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

            Process.StartInfo.Arguments = args.ToString();
            //_process.StartInfo.UseShellExecute = false;
            //_process.StartInfo.CreateNoWindow = true;
            //_process.StartInfo.RedirectStandardInput = true;
            //_process.StartInfo.RedirectStandardOutput = true;
            //_process.StartInfo.RedirectStandardError = true;
            var res = Process.Start();
            if (!res)
                return res;

            //异步等待窗口句柄
            await Task.Run(() =>
            {
                while (Process.MainWindowHandle == IntPtr.Zero)
                {
                    Thread.Sleep(100);
                }
            });

            MainHandle = Process.MainWindowHandle;
            ProcessLaunched = true;
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
        //mpv 关闭视频
        SendMessage(IPCServerName, "stop");
    }

    public void SetVolume(int volume)
    {
        SendMessage(IPCServerName, "set_property", "volume", volume);
    }

    public MpvPlayerSnapshot GetSnapshot()
    {
        //缓存当前实力需要的数据
        return new()
        {
            IPCServerName = IPCServerName,
            PId = Process?.Id,
            ProcessName = Process?.ProcessName
        };
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
                _logger.Info("mpv response: " + response);
                Debug.WriteLine("mpv response: " + response);

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
