using LiveWallpaperCore.LocalServer.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using System.Threading;
using System.Threading.Tasks;

namespace LiveWallpaperCore.LocalServer
{
    /// <summary>
    /// signalRhub 是立刻释放的，用这个类来发事件消息
    /// </summary>
    public class HubEventEmitter : IHostedService
    {
        IHubContext<LiveWallpaperHub> _hubContext;

        public HubEventEmitter(IHubContext<LiveWallpaperHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public IClientProxy GetClient(string connectionId)
        {
            return _hubContext.Clients.Client(connectionId);
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}