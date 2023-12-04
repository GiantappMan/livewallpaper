using System;
using System.Threading;
using System.Threading.Tasks;

namespace Client.Libs;

public class Debouncer
{
    public static Debouncer Shared { get; } = new();

    private CancellationTokenSource _cts = new();
    private Action? _action;
    private readonly object _lock = new();

    /// <summary>
    /// 函数防抖
    /// </summary>
    /// <param name="action">需要执行的<see cref="Action"/></param>
    /// <param name="delay">时间间隔/毫秒</param>
    public async void Delay(Action action, int delay)
    {
        lock (_lock)
        {
            _action = action;
            _cts.Cancel();  // 取消上一个动作
            _cts = new CancellationTokenSource();  // 创建新的取消标记
        }

        try
        {
            await Task.Delay(delay, _cts.Token);  // 等待延迟或取消
            lock (_lock)
            {
                _action();  // 执行动作
            }
        }
        catch (TaskCanceledException)
        {
            // 如果任务被取消，则不执行任何操作
        }
    }
}

