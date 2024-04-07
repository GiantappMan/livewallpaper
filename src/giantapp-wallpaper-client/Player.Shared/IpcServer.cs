using System.IO.Pipes;
using System.IO;

namespace Player.Shared;

public class IpcServer : IDisposable
{
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

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await _pipeServer.WaitForConnectionAsync(cancellationToken);

                using (var streamReader = new StreamReader(_pipeServer))
                {
                    var message = await streamReader.ReadLineAsync();
                    ReceivedMessage?.Invoke(this, message);
                }

                _pipeServer.Disconnect();
            }
            catch (OperationCanceledException)
            {
                // The task was cancelled, so we can exit the loop
                break;
            }
            catch (Exception ex)
            {
                // Handle any other exceptions that may occur
                Console.WriteLine($"Error in ListenForMessagesAsync: {ex.Message}");
            }
        }
    }

    public void Dispose()
    {
        _cancellationTokenSource?.Cancel();
        if (_cancellationTokenSource != null)
            Task.WhenAny(_listenerTask, Task.Delay(Timeout.Infinite, _cancellationTokenSource.Token)).Wait();
        _pipeServer?.Dispose();
        _cancellationTokenSource?.Dispose();
    }
}
