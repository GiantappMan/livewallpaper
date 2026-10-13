using NLog;
using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Threading;
using WallpaperCore.Libs;

namespace Client.Libs;

/// <summary>
/// UI 线程冻结看门狗：仅诊断模式（dev-debug.flag 存在，bun dev:debug）时启用。
/// UI 线程每 200ms 跳一次心跳（DispatcherTimer 在消息循环卡住时自然停跳），
/// 后台线程发现心跳停滞超过阈值就记录冻结开始/持续/恢复，
/// 并附上 FreezeWatch 登记的在途操作，用于定位卡死在哪个调用上。
/// 日志在 %LocalAppData%\LiveWallpaper3\logs\log.txt
/// </summary>
internal static class UiFreezeMonitor
{
    static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    const int HeartbeatIntervalMs = 200;
    const int FreezeThresholdMs = 2000;
    const int PollIntervalMs = 500;
    //持续冻结期间每隔多久重复记录一次现场
    const int RepeatReportMs = 5000;

    static DispatcherTimer? _heartbeat;
    static long _lastBeatTimestamp;

    internal static void Start()
    {
        if (!FreezeWatch.Enabled)
            return;

        //Start 由 OnStartup 在 UI 线程调用
        FreezeWatch.SetUiThreadId(Environment.CurrentManagedThreadId);
        _logger.Info("[卡死诊断] UI 冻结看门狗已启动");

        _lastBeatTimestamp = Stopwatch.GetTimestamp();
        _heartbeat = new DispatcherTimer(DispatcherPriority.Normal)
        {
            Interval = TimeSpan.FromMilliseconds(HeartbeatIntervalMs)
        };
        _heartbeat.Tick += (_, _) => Volatile.Write(ref _lastBeatTimestamp, Stopwatch.GetTimestamp());
        _heartbeat.Start();

        _ = Task.Run(MonitorLoop);
    }

    static async Task MonitorLoop()
    {
        bool frozen = false;
        long freezeStartTimestamp = 0;
        long lastReportTimestamp = 0;
        while (true)
        {
            await Task.Delay(PollIntervalMs);
            long lagMs = Ms(Volatile.Read(ref _lastBeatTimestamp));
            if (lagMs >= FreezeThresholdMs)
            {
                if (!frozen)
                {
                    frozen = true;
                    freezeStartTimestamp = Stopwatch.GetTimestamp();
                    lastReportTimestamp = freezeStartTimestamp;
                    _logger.Warn($"[卡死诊断] UI 线程已无响应 {lagMs}ms，疑似卡死。在途操作：{FreezeWatch.DescribeInFlight()}");
                }
                else if (Ms(lastReportTimestamp) >= RepeatReportMs)
                {
                    //持续冻结期间定期记录现场，期间在途操作可能变化
                    lastReportTimestamp = Stopwatch.GetTimestamp();
                    _logger.Warn($"[卡死诊断] UI 线程持续无响应 {lagMs}ms。在途操作：{FreezeWatch.DescribeInFlight()}");
                }
            }
            else if (frozen)
            {
                frozen = false;
                long totalMs = Ms(freezeStartTimestamp) + FreezeThresholdMs;
                _logger.Warn($"[卡死诊断] UI 线程恢复响应，本次冻结约 {totalMs}ms");
            }
        }
    }

    static long Ms(long startTimestamp) => (long)((Stopwatch.GetTimestamp() - startTimestamp) * 1000.0 / Stopwatch.Frequency);
}
