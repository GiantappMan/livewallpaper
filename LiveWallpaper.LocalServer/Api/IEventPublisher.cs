using LiveWallpaper.LocalServer.Hubs;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace LiveWallpaper.LocalServer.Api
{
    /// <summary>
    /// 服务端主动推送事件的抽象（下载/FFmpeg/播放器进度等）。
    /// Shell 桥接走 WebView2 WebMessage 广播，DevHost/浏览器开发走 SignalR。
    /// </summary>
    public interface IEventPublisher
    {
        Task PublishAsync(string eventName, object payload);
    }

    /// <summary>
    /// SignalR 实现：广播给所有 Hub 连接（等价于原 HubEventEmitter.AllClient().SendAsync）
    /// </summary>
    public class SignalREventPublisher : IEventPublisher
    {
        readonly HubEventEmitter _hubEventEmitter;

        public SignalREventPublisher(HubEventEmitter hubEventEmitter)
        {
            _hubEventEmitter = hubEventEmitter;
        }

        public Task PublishAsync(string eventName, object payload)
        {
            return _hubEventEmitter.AllClient().SendAsync(eventName, payload);
        }
    }
}
