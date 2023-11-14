using NLog;
using System.Diagnostics;
using System.IO.Pipes;
using System.Net.Sockets;
using System.Text;

namespace WallpaperCore.Players;

/// <summary>
/// mpv播放器管理，管道通信
/// </summary>
public class MPVPlayer
{
    private static Logger _logger = LogManager.GetCurrentClassLogger();
    private string? _playerPath;
    private Process? _process;

    #region public properties
    public IntPtr MainHandle { get; private set; }
    public string? IPCServerName { get; private set; }

    #region Options

    public bool AutoHwdec { get; set; } = true;//auto 硬解,no 软解

    public string PanAndScan { get; set; } = "1.0";//0.0-1.0  铺满,防止视频黑边

    #endregion

    #endregion

    public MPVPlayer(string playerPath)
    {
        _playerPath = playerPath;
        IPCServerName = $@"mpv{Guid.NewGuid()}";
    }

    public static MPVPlayer? From(string path)
    {
        if (!File.Exists(path))
            return null;

        string fullpath = Path.GetFullPath(path);
        return new MPVPlayer(fullpath);
    }

    public async Task<bool> LaunchAsync(string? playList = null)
    {
        Dispose();
        _process = new Process();
        _process.StartInfo.FileName = _playerPath;

        StringBuilder args = new();

        if (playList != null)
            args.Append($"--playlist={playList} ");

        //允许休眠
        args.Append("--stop-screensaver=no ");

        //设置解码模式为自动，如果条件允许，MPV会启动硬件解码
        string hwdec = AutoHwdec ? "auto" : "no";
        args.Append($"--hwdec={hwdec} ");

        //处理黑边
        args.Append($"--panscan={PanAndScan} ");

        //ipc
        args.Append($"--input-ipc-server={IPCServerName} ");

        _process.StartInfo.Arguments = args.ToString();
        //_process.StartInfo.UseShellExecute = false;
        //_process.StartInfo.CreateNoWindow = true;
        //_process.StartInfo.RedirectStandardInput = true;
        //_process.StartInfo.RedirectStandardOutput = true;
        //_process.StartInfo.RedirectStandardError = true;
        var res = _process.Start();
        if (!res)
            return res;

        //异步等待窗口句柄
        await Task.Run(() =>
        {
            while (_process.MainWindowHandle == IntPtr.Zero)
            {
                Thread.Sleep(100);
            }
        });

        MainHandle = _process.MainWindowHandle;
        return res;
    }

    public void Dispose()
    {
        _process?.CloseMainWindow();
        _process?.WaitForExit();
        _process = null;
    }

    public string? GetInfo()
    {
        var res = SendMessage(IPCServerName, "[\"get_property\", \"path\"]");
        return res;
        try
        {
            string command = "{\"command\": [\"get_property\", \"path\"],\"request_id\":\"test\"}" + "\n";
            using NamedPipeClientStream pipeClient = new(IPCServerName);
            pipeClient.Connect(0); // 连接超时时间

            if (pipeClient.IsConnected)
            {
                // 发送命令
                byte[] commandBytes = Encoding.UTF8.GetBytes(command);
                pipeClient.Write(commandBytes, 0, commandBytes.Length);

                // 读取响应
                byte[] buffer = new byte[4096];
                int bytesRead = pipeClient.Read(buffer, 0, buffer.Length);

                // 将字节数组转换为字符串
                string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                _logger.Info("mpv response: " + response);
                return response;
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

    #region private

    private static string? SendMessage(string? serverName, string command)
    {
        if (serverName == null)
            return null;

        try
        {
            string id = Guid.NewGuid().ToString();
            string sendContent = $@"{{""command"": {command},""request_id"":""{id}""}}" + "\n";
            //sendContent = "{\"command\": [\"get_property\", \"path\"],\"request_id\":\"test\"}" + "\n";
            using NamedPipeClientStream pipeClient = new(serverName);
            pipeClient.Connect(0); // 连接超时时间

            if (pipeClient.IsConnected)
            {
                // 发送命令
                byte[] commandBytes = Encoding.UTF8.GetBytes(sendContent);
                pipeClient.Write(commandBytes, 0, commandBytes.Length);

                // 读取响应
                byte[] buffer = new byte[4096];
                int bytesRead = pipeClient.Read(buffer, 0, buffer.Length);

                // 将字节数组转换为字符串
                string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                _logger.Info("mpv response: " + response);
                return response;
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
