using System.IO.Pipes;
using NLog;
using System.Text.Json;
using System.Dynamic;
using System.Text;

namespace Player.Shared;

public class IpcServer : IDisposable
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private readonly string _ipcServerName;
    private NamedPipeServerStream? _pipeServer;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _listenerTask;

    public IpcServer(string ipcServerName)
    {
        _ipcServerName = ipcServerName;
    }

    //public event EventHandler<string>? ReceivedMessage;

    public Func<IpcPayload, IpcPayload>? ReceivedMessageFunc;

    public void Start()
    {
        _cancellationTokenSource = new CancellationTokenSource();
        _listenerTask = ListenForMessagesAsync(_cancellationTokenSource.Token);
    }

    private async Task ListenForMessagesAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                _logger.Info($"new NamedPipeServerStream: {_ipcServerName}");
                _pipeServer = new NamedPipeServerStream(_ipcServerName, PipeDirection.InOut, NamedPipeServerStream.MaxAllowedServerInstances, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                //_logger.Info($"WaitForConnectionAsync");

                // 等待客户端连接
                await _pipeServer.WaitForConnectionAsync(cancellationToken);

                // 使用异步任务处理客户端消息
                Task handleClientTask = HandleClientAsync(_pipeServer);
            }
            catch (OperationCanceledException)
            {
                // The task was cancelled, so we can exit the loop
                break;
            }
            catch (Exception ex)
            {
                // Handle any other exceptions that may occur
                _logger.Error($"Error in ListenForMessagesAsync: {ex.Message}");
            }
        }
    }

    private async Task HandleClientAsync(NamedPipeServerStream pipeServer)
    {
        try
        {
            while (pipeServer.IsConnected)
            {
                // 接收消息
                byte[] buffer = new byte[4096];
                int bytesRead = await pipeServer.ReadAsync(buffer, 0, buffer.Length);
                if (bytesRead == 0)
                {
                    // 如果客户端已经断开连接，则退出循环
                    break;
                }

                string message = Encoding.UTF8.GetString(buffer, 0, bytesRead);

                if (ReceivedMessageFunc != null)
                {
                    var data = JsonSerializer.Deserialize<IpcPayload>(message);
                    if (data == null)
                        continue;

                    var res = ReceivedMessageFunc.Invoke(data);

                    string json = JsonSerializer.Serialize(res);
                    byte[] responseBytes = Encoding.UTF8.GetBytes(json);

                    // 发送响应
                    await pipeServer.WriteAsync(responseBytes, 0, responseBytes.Length);
                    await pipeServer.FlushAsync();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.Error($"Error handling client connection: {ex.Message}");
        }
        finally
        {
            // 断开连接
            pipeServer.Disconnect();
            pipeServer.Dispose();
        }
    }

    public async Task Send(object msg)
    {
        if (_pipeServer == null)
            return;
        string json = JsonSerializer.Serialize(msg);
        byte[] responseBytes = Encoding.UTF8.GetBytes(json);
        await _pipeServer.WriteAsync(responseBytes, 0, responseBytes.Length);
        await _pipeServer.FlushAsync();
        _logger.Info("SendMessage:" + json);
    }

    public void Dispose()
    {
        //_logger.Info("IpcServer Dispose");
        _cancellationTokenSource?.Cancel();
        if (_cancellationTokenSource != null)
            Task.WhenAny(_listenerTask, Task.Delay(Timeout.Infinite, _cancellationTokenSource.Token)).Wait();
        _pipeServer?.Dispose();
        _cancellationTokenSource?.Dispose();
    }
}
