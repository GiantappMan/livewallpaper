using NLog;
using System;
using System.Diagnostics;
using System.Text;

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
        PlayerPath = Path.Combine(currentFolder, "Assets\\Players\\VideoPlayer\\GiantappVideoPlayer.exe");
        _logger.Info("PlayerPath: " + PlayerPath);
    }
    #endregion
}
