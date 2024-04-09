using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace Player.Shared;

public class IpcClient : IDisposable
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private readonly string _serverName;

    public IpcClient(string serverName)
    {
        this._serverName = serverName;
    }

    public void Dispose()
    {
    }

    public IpcPayload? Send(IpcPayload ipcPayload)
    {
        try
        {
            using NamedPipeClientStream pipeClient = new(_serverName);
            pipeClient.Connect(); // 连接超时时间

            if (pipeClient.IsConnected)
            {
                var sendContent = JsonSerializer.Serialize(ipcPayload) + "\n";
                byte[] commandBytes = Encoding.UTF8.GetBytes(sendContent);
                pipeClient.Write(commandBytes, 0, commandBytes.Length);

                // 读取响应
                byte[] buffer = new byte[4096];
                int bytesRead = pipeClient.Read(buffer, 0, buffer.Length);

                // 将字节数组转换为字符串
                string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                if (!sendContent.Contains("duration") && !sendContent.Contains("time-pos"))
                {
                    _logger.Info(sendContent + "mpv response: " + response);
                    Debug.WriteLine(sendContent + "mpv response: " + response);
                }
                var res = JsonSerializer.Deserialize<IpcPayload>(response);
                return res;
            }
            else
            {
                _logger.Warn("Failed to connect to mpv.");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.Warn(ex, "Failed to get mpv info.");
            return null;
        }
    }
}
