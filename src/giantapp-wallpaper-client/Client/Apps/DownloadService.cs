﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Client.Apps;

public class DonwloadItem
{
    public string Id { get; set; } = string.Empty;
    public string Desc { get; set; } = string.Empty;
    public int Percent { get; set; }
    public double TotalBytes { get; set; }
    public double ReceivedBytes { get; set; }
    public bool IsDownloading { get; set; }
    public bool IsDownloadCompleted { get; set; }
    public bool IsCanceled { get; set; }
}

public class DonwloadStatus
{
    //Items
    public List<DonwloadItem> Items { get; set; } = new List<DonwloadItem>();
}
public class DownloadService
{
    private static readonly object semaphoreLock = new(); // 用于同步
    private static int maxParallel = 2; // 默认并发数
    private static SemaphoreSlim semaphore = new(maxParallel, maxParallel);
    public static int MaxParallel
    {
        get => maxParallel;
        set
        {
            lock (semaphoreLock)
            {
                if (value != maxParallel)
                {
                    maxParallel = value;
                    // 重新创建 SemaphoreSlim 实例以应用新的并发限制
                    semaphore = new SemaphoreSlim(maxParallel);
                }
            }
        }
    }
    public static event EventHandler? StatusChangedEvent;
    public static DonwloadStatus Status { get; private set; } = new DonwloadStatus();

    public static void Cancel(string id)
    {
        var item = Status.Items.FirstOrDefault(x => x.Id == id);
        if (item != null)
        {
            item.IsCanceled = true;
        }
    }

    public static async Task<bool> DownloadAsync(string url, string destPath, string id, string? desc, bool updateStatus = true)
    {
        var item = new DonwloadItem
        {
            Id = id,
            Desc = desc ?? string.Empty,
            IsDownloading = true,
            Percent = 0,
            ReceivedBytes = 0,
            TotalBytes = 0 // This will be updated once the download starts
        };

        if (updateStatus)
        {
            //清理已完成或已取消的状态
            Status.Items.RemoveAll(x => x.IsDownloadCompleted || x.IsCanceled);

            Status.Items.Add(item);
            StatusChangedEvent?.Invoke(null, EventArgs.Empty);
        }
        await semaphore.WaitAsync();
        try
        {
            using var httpClient = new HttpClient();
            var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? 0;
            item.TotalBytes = totalBytes;

            var destFolder = Path.GetDirectoryName(destPath);
            //判断文件夹不存在
            if (!Directory.Exists(destFolder))
            {
                Directory.CreateDirectory(destFolder);
            }

            using var contentStream = await response.Content.ReadAsStreamAsync();
            using var fileStream = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, true);
            var totalReadBytes = 0L;
            var buffer = new byte[8192];
            var isMoreToRead = true;

            do
            {
                var read = await contentStream.ReadAsync(buffer, 0, buffer.Length);
                if (read == 0)
                {
                    isMoreToRead = false;
                }
                else
                {
                    await fileStream.WriteAsync(buffer, 0, read);

                    totalReadBytes += read;
                    item.ReceivedBytes = totalReadBytes;
                    item.Percent = (int)((totalReadBytes / (double)totalBytes) * 100);
                    StatusChangedEvent?.Invoke(null, EventArgs.Empty);

                    if (item.IsCanceled) // Check if canceled
                    {
                        return false;
                    }
                }
            }
            while (isMoreToRead);
            item.IsDownloadCompleted = true;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine(ex);
            return false;
        }
        finally
        {
            item.IsDownloading = false;
            semaphore.Release();
        }

        StatusChangedEvent?.Invoke(null, EventArgs.Empty);
        return true;
    }
}
