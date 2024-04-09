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

    public event EventHandler<string>? ReceivedMessage;

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
                _logger.Info($"WaitForConnectionAsync");
                await _pipeServer.WaitForConnectionAsync(cancellationToken);
                _logger.Info($"WaitForConnectionAsync1");

                while (true)
                {
                    if (_pipeServer == null)
                        break;

                    // 接收消息
                    byte[] buffer = new byte[256];
                    int bytesRead = await _pipeServer.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) // 如果没有读取到数据，表示客户端已经断开连接
                        break;

                    string message = Encoding.UTF8.GetString(buffer, 0, bytesRead);

                    dynamic? tmp = JsonSerializer.Deserialize<ExpandoObject>(message);
                    ReceivedMessage?.Invoke(this, message);
                    //dynamic res = new ExpandoObject();
                    //res.request_id = tmp?.request_id;
                    //res.data = "5";
                    //string json = JsonSerializer.Serialize(res);
                    //byte[] responseBytes = Encoding.UTF8.GetBytes(json);
                    //await _pipeServer.WriteAsync(responseBytes, 0, responseBytes.Length);
                    //await _pipeServer.FlushAsync();
                }
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
            finally
            {
                // 断开连接, 等待下一个客户端连接
                if (_pipeServer != null && _pipeServer.IsConnected)
                    _pipeServer.Disconnect();
                _pipeServer?.Dispose();
                _pipeServer = null;
                _logger.Info("_pipeServer Disconnnect");
            }
        }
    }

    public void Dispose()
    {
        _logger.Info("IpcServer Dispose");
        _cancellationTokenSource?.Cancel();
        if (_cancellationTokenSource != null)
            Task.WhenAny(_listenerTask, Task.Delay(Timeout.Infinite, _cancellationTokenSource.Token)).Wait();
        _pipeServer?.Dispose();
        _cancellationTokenSource?.Dispose();
    }
}
