using System;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Utils
{
    internal class RaiseLimiter
    {
        Func<Task>? _nextTask;
        readonly SemaphoreSlim _slim = new(1, 1);

        private DateTime _timeoutTime;

        private bool _running = false;
        public RaiseLimiter()
        {
        }

        internal async void Execute(Func<Task> p, int interval)
        {
            _timeoutTime = DateTime.Now.AddMilliseconds(interval);
            await _slim.WaitAsync();
            _nextTask = p;
            _slim.Release();
            Run(interval);
        }

        //执行间隔
        private async void Run(int interval)
        {
            if (_running)
                return;

            _running = true;
            while (_running)
            {
                await _slim.WaitAsync();

                if (DateTime.Now > _timeoutTime)
                {
                    if (_nextTask != null)
                        await _nextTask();
                    _nextTask = null;
                    _running = false;
                    break;
                }

                if (_nextTask != null)
                    await _nextTask();
                _nextTask = null;

                _slim.Release();

                await Task.Delay(interval);
            };

            if (_slim.CurrentCount == 0)
                _slim.Release();
        }

        internal Task WaitExit()
        {
            return Task.Run(async () =>
            {
                while (_running)
                    await Task.Delay(1000);
            });
        }
    }
}