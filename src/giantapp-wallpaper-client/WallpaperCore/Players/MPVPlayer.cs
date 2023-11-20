using Newtonsoft.Json;
using NLog;
using System.Diagnostics;
using System.IO.Pipes;
using System.Text;

namespace WallpaperCore.Players;

public class MpvRequest
{
    [JsonProperty("command")]
    public string[]? Command { get; set; }
    [JsonProperty("request_id")]
    public string? RequestId { get; set; }
}

/// <summary>
/// mpv播放器管理，管道通信
/// </summary>
public class MpvPlayer
{
    #region filed
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private readonly string? _playerPath;
    #endregion

    #region public properties
    public IntPtr MainHandle { get; private set; }
    public string? IPCServerName { get; private set; }
    public Process? Process { get; private set; }
    #region Options

    public bool AutoHwdec { get; set; } = true;//auto 硬解,no 软解

    public string PanAndScan { get; set; } = "1.0";//0.0-1.0  铺满,防止视频黑边

    #endregion

    #endregion

    public MpvPlayer(string playerPath)
    {
        _playerPath = playerPath;
        IPCServerName = $@"mpv{Guid.NewGuid()}";
    }

    public static MpvPlayer? From(string path)
    {
        if (!File.Exists(path))
            return null;

        string fullpath = Path.GetFullPath(path);
        return new MpvPlayer(fullpath);
    }

    public async Task<bool> LaunchAsync(string? playList = null)
    {
        Process?.CloseMainWindow();
        Process?.Dispose();

        Process = new Process();
        Process.StartInfo.FileName = _playerPath;

        StringBuilder args = new();

        if (playList != null)
            args.Append($"--playlist={playList} ");

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
        return res;
    }


    public void Quit()
    {
        SendMessage(IPCServerName, "quit");
    }

    //public void Dispose()
    //{
    //    _process?.CloseMainWindow();
    //    _process?.WaitForExit();
    //    _process = null;
    //}

    public string? GetPath()
    {
        return SendMessage(IPCServerName, "get_property", "path")?.ToString();
    }

    public object? LoadList(string path)
    {
        return SendMessage(IPCServerName, "loadlist", path, "replace");
    }

    public void LoadFile(string file)
    {
        if (Process == null)
            return;
        SendMessage(IPCServerName, "loadfile", file, "replace");
    }
    #region private

    private object? SendMessage(string? serverName, params string[] command)
    {
        if (serverName == null)
            return null;

        if (Process == null || Process.HasExited)
        {
            Process = null;
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
