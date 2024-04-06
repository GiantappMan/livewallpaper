

using System.Diagnostics;

namespace WallpaperCore.Libs;

public interface IVideoApi
{
    bool ProcessLaunched { get; }
    IntPtr MainHandle { get; }
    string IPCServerName { get; }
    Process Process { get; }

    void ApplySetting(WallpaperSetting playSetting);
    double GetDuration();
    double GetTimePos();
    Task<bool> LaunchAsync(string playlistPath);
    object? LoadList(string playlistPath);
    void Pause();
    void Resume();
    void SetProgress(double progress);
    void SetVolume(uint volume);
    void Stop();
}
