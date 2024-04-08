using System.IO.Pipes;
using System.IO;
using NLog;
using System.Text.Json;
using System.Dynamic;

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
        _pipeServer = new NamedPipeServerStream(_ipcServerName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
        _cancellationTokenSource = new CancellationTokenSource();
        _listenerTask = ListenForMessagesAsync(_cancellationTokenSource.Token);
    }

    private async Task ListenForMessagesAsync(CancellationToken cancellationToken)
    {
        if (_pipeServer == null)
            return;

        var streamReader = new StreamReader(_pipeServer);
        var streamWriter = new StreamWriter(_pipeServer);
        await _pipeServer.WaitForConnectionAsync(cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                if (_pipeServer == null)
                    break;

                var message = await streamReader.ReadLineAsync();
                dynamic? tmp = JsonSerializer.Deserialize<ExpandoObject>(message);
                ReceivedMessage?.Invoke(this, message);

                dynamic res = new ExpandoObject();
                res.request_id = tmp?.request_id;
                res.data = "tmp";
                string json = JsonSerializer.Serialize(res);
                await streamWriter.WriteLineAsync(json);
                await streamWriter.FlushAsync();
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

        // 断开连接, 等待下一个客户端连接
        _pipeServer?.Disconnect();
        _logger.Info("_pipeServer Disconnnect");
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
