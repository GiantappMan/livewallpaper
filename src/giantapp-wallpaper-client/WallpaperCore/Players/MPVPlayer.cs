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
        //IPCServerName = $@"\\.\pipe\mpv{Guid.NewGuid()}";
        IPCServerName = $@"\\.\pipe\tmp\mpv-socket";
        
    }

    public static MPVPlayer? From(string path)
    {
        if (!File.Exists(path))
            return null;

        string fullpath = Path.GetFullPath(path);
        return new MPVPlayer(fullpath);
    }

    public async Task<bool> Launch(string? playList = null)
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

        //icp
        args.Append($"--input-ipc-server={IPCServerName} ");

        _process.StartInfo.Arguments = args.ToString();
        //process.StartInfo.UseShellExecute = false;
        //process.StartInfo.CreateNoWindow = true;
        //process.StartInfo.RedirectStandardInput = true;
        //process.StartInfo.RedirectStandardOutput = true;
        //process.StartInfo.RedirectStandardError = true;
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

    public void GetInfo()
    {
        try
        {
            string command = "{\"command\": [\"get_property\", \"path\"]}";
            using NamedPipeClientStream pipeClient = new(".", IPCServerName, PipeDirection.InOut);
            pipeClient.Connect(10); // 连接超时时间

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
                Console.WriteLine("mpv response: " + response);
            }
            else
            {
                Console.WriteLine("Failed to connect to mpv.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }

        Console.ReadLine();
    }
}
