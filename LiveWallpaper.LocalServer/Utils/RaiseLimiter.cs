using Microsoft.AspNetCore.Hosting;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Utils
{
    internal class RaiseLimiter
    {
        Func<Task> _nextTask;

        private DateTime _timeoutTime;

        private bool _running = false;
        public RaiseLimiter()
        {
        }

        internal void Execute(Func<Task> p, int interval)
        {
            _timeoutTime = DateTime.Now.AddMilliseconds(interval);
            _nextTask = p;
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
                await Task.Delay(interval);
            };
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