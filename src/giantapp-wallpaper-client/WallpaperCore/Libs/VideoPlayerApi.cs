using NLog;
using System.Diagnostics;

namespace WallpaperCore.Libs;

public class VideoPlayerApi : MpvApi
{
    #region filed
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    #endregion

    #region constructs
    static VideoPlayerApi()
    {
        //打算和mpv兼容
        string currentFolder = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        PlayerPath = Path.Combine(currentFolder, "Assets\\Players\\VideoPlayer\\LiveWallpaper3_VideoPlayer.exe");
        _logger.Info("PlayerPath: " + PlayerPath);
    }

    public VideoPlayerApi(string? ipcServerName = null, int? pId = null, string? processName = null) : base(ipcServerName, pId, processName)
    {
    }
    #endregion
}
