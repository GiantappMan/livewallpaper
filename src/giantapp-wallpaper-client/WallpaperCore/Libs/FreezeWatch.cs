using NLog;
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;

namespace WallpaperCore.Libs;

/// <summary>
/// 卡死诊断打点：exe 同目录存在 dev-debug.flag（bun dev:debug 写入）时启用，否则零开销。
/// 用法：using (FreezeWatch.Scope("Api.GetWallpapers")) { ... }
/// 与 Client 的 UiFreezeMonitor 配合：看门狗发现 UI 线程冻结时，
/// 把这里登记的"在途操作"写进日志，用于定位卡死在哪个调用上。
/// 日志在 %LocalAppData%\LiveWallpaper3\logs\log.txt
/// </summary>
public static class FreezeWatch
{
    static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    //超过该耗时（毫秒）在日志里告警
    internal const int SlowThresholdMs = 1000;

    //注意：Player.Shared（IpcClient）无法引用本工程，那边独立判断同一个标记文件，改名需同步
    public static readonly bool Enabled = File.Exists(Path.Combine(AppContext.BaseDirectory, "dev-debug.flag"));

    static readonly ConcurrentDictionary<Op, byte> _inFlight = new();
    static volatile Op? _uiThreadOp;
    static volatile int _uiThreadId = -1;

    //UiFreezeMonitor 启动时告知 UI 线程 id，Scope 据此判断是否阻塞的是 UI 线程
    public static void SetUiThreadId(int threadId) => _uiThreadId = threadId;

    public static IDisposable Scope(string op)
    {
        if (!Enabled)
            return NullScope.Instance;
        return new Op(op);
    }

    //看门狗检测到冻结时调用：列出所有在途操作（含已执行时长）
    public static string DescribeInFlight()
    {
        var sb = new StringBuilder();
        foreach (var item in _inFlight.Keys)
        {
            sb.Append($"\n  - {item.Name} 已执行 {Ms(item.StartTimestamp)}ms");
            if (item == _uiThreadOp)
                sb.Append("（UI 线程）");
        }
        return sb.Length == 0 ? "（无在途打点操作）" : sb.ToString();
    }

    static long Ms(long startTimestamp) => (long)((Stopwatch.GetTimestamp() - startTimestamp) * 1000.0 / Stopwatch.Frequency);

    sealed class Op : IDisposable
    {
        public readonly string Name;
        public readonly long StartTimestamp;

        public Op(string name)
        {
            Name = name;
            StartTimestamp = Stopwatch.GetTimestamp();
            bool onUiThread = Thread.CurrentThread.ManagedThreadId == _uiThreadId;
            if (onUiThread)
                _uiThreadOp = this;
            _inFlight.TryAdd(this, 0);
            _logger.Debug($"[卡死诊断] → {name}");
        }

        public void Dispose()
        {
            _inFlight.TryRemove(this, out _);
            if (_uiThreadOp == this)
                _uiThreadOp = null;
            long ms = Ms(StartTimestamp);
            if (ms >= SlowThresholdMs)
                _logger.Warn($"[卡死诊断] ← {Name} 耗时 {ms}ms（超过 {SlowThresholdMs}ms）");
            else
                _logger.Debug($"[卡死诊断] ← {Name} 耗时 {ms}ms");
        }
    }

    sealed class NullScope : IDisposable
    {
        public static readonly NullScope Instance = new NullScope();
        public void Dispose() { }
    }
}
