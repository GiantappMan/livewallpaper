using NLog;
using System.Diagnostics;

namespace WallpaperCore.Libs;

public class VideoPlayerApi : IVideoApi
{
    #region filed
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    #endregion

    public static string PlayerPath { get; set; } = string.Empty;
    public bool ProcessLaunched => throw new NotImplementedException();

    public IntPtr MainHandle => throw new NotImplementedException();

    public string IPCServerName => throw new NotImplementedException();

    public Process Process => throw new NotImplementedException();

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
        throw new NotImplementedException();
    }

    public double GetDuration()
    {
        throw new NotImplementedException();
    }

    public double GetTimePos()
    {
        throw new NotImplementedException();
    }

    public Task<bool> LaunchAsync(string playlistPath)
    {
        throw new NotImplementedException();
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
        throw new NotImplementedException();
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
