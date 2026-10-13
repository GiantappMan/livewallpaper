using NLog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace Player.Shared;

public class IpcClient : IDisposable
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
    private readonly string _serverName;

    //诊断模式标记（bun dev:debug 写入的 dev-debug.flag）。本共享工程被多个 exe 包含、
    //无法引用 WallpaperCore.Libs.FreezeWatch，故独立判断同一个文件；改名需与 FreezeWatch 同步
    private static readonly bool DiagEnabled = File.Exists(Path.Combine(AppContext.BaseDirectory, "dev-debug.flag"));

    public IpcClient(string serverName)
    {
        _serverName = serverName;
    }

    public void Dispose()
    {
    }

    public IpcPayload? Send(IpcPayload ipcPayload)
    {
        string sendContent = "";
        //发送前先记录命令：若读响应被无限阻塞，日志最后一行就是卡住的命令
        Stopwatch? watch = DiagEnabled ? Stopwatch.StartNew() : null;
        if (watch != null)
            _logger.Debug($"[卡死诊断] IPC → {JsonSerializer.Serialize(ipcPayload)}");
        try
        {
            sendContent = JsonSerializer.Serialize(ipcPayload) + "\n";
            using NamedPipeClientStream pipeClient = new(_serverName);
            pipeClient.Connect(0); // 连接超时时间

            if (pipeClient.IsConnected)
            {
                byte[] commandBytes = Encoding.UTF8.GetBytes(sendContent);
                pipeClient.Write(commandBytes, 0, commandBytes.Length);

                // 读取响应
                byte[] buffer = new byte[4096];
                int bytesRead = pipeClient.Read(buffer, 0, buffer.Length);

                // 将字节数组转换为字符串
                string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                //减少打印
                //if (!sendContent.Contains("duration") && !sendContent.Contains("time-pos"))
                //{
                //_logger.Info(sendContent + "mpv response: " + response);
                Debug.WriteLine(sendContent + "mpv response: " + response);
                if (watch != null)
                    _logger.Debug($"[卡死诊断] IPC ← {watch.ElapsedMilliseconds}ms {response}");
                if (string.IsNullOrEmpty(response))
                {
                    if (watch != null)
                        _logger.Warn($"[卡死诊断] IPC 无响应（读返回空）");
                    return null;
                }
                var res = JsonSerializer.Deserialize<IpcPayload>(response);
                return res;
            }
            else
            {
                if (watch != null)
                    _logger.Warn($"[卡死诊断] IPC 连接失败 {_serverName}");
                _logger.Warn("Failed to connect to mpv.");
                return null;
            }
        }
        catch (Exception ex)
        {
            if (watch != null)
                _logger.Warn($"[卡死诊断] IPC 异常 {watch.ElapsedMilliseconds}ms：{ex.Message}");
            _logger.Warn(ex, sendContent + "Failed to get mpv info.");
            return null;
        }
    }
}
