using System.Diagnostics;
using System.IO.Pipes;
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

    #region Options

    public bool AutoHwdec { get; set; } = true;//auto 硬解,no 软解

    public string PanAndScan { get; set; } = "1.0";//0.0-1.0  铺满,防止视频黑边

    #endregion
    #endregion

    public MPVPlayer(string playerPath)
    {
        _playerPath = playerPath;
    }

    public static MPVPlayer? From(string path)
    {
        if (!File.Exists(path))
            return null;

        string fullpath = Path.GetFullPath(path);
        return new MPVPlayer(fullpath);
    }

    public async Task<IntPtr?> Launch(string? playList = null)
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

        _process.StartInfo.Arguments = args.ToString();
        //process.StartInfo.UseShellExecute = false;
        //process.StartInfo.CreateNoWindow = true;
        //process.StartInfo.RedirectStandardInput = true;
        //process.StartInfo.RedirectStandardOutput = true;
        //process.StartInfo.RedirectStandardError = true;
        var res = _process.Start();
        if (!res)
            return null;

        //异步等待窗口句柄
        await Task.Run(() =>
        {
            while (_process.MainWindowHandle == IntPtr.Zero)
            {
                Thread.Sleep(100);
            }
        });

        MainHandle = _process.MainWindowHandle;
        return MainHandle;
    }

    public void Dispose()
    {
        _process?.CloseMainWindow();
        _process?.WaitForExit();
        _process = null;
    }
}
