using Client.Libs;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using WallpaperCore.Libs;

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

//下载完成的历史记录，持久化到配置文件夹
public class DownloadRecord
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public double TotalBytes { get; set; }
    public DateTime Time { get; set; }
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

    private const string HistoryConfigKey = "DownloadHistory";
    private const int MaxHistoryCount = 200;
    private static readonly object _historyLock = new();

    public static List<DownloadRecord> GetHistory()
    {
        lock (_historyLock)
        {
            return Configer.Get<List<DownloadRecord>>(HistoryConfigKey) ?? new List<DownloadRecord>();
        }
    }

    public static void AddHistory(DownloadRecord record)
    {
        lock (_historyLock)
        {
            var list = GetHistory();
            //相同的任务只保留一条
            list.RemoveAll(x => x.Id == record.Id);
            list.Insert(0, record);
            if (list.Count > MaxHistoryCount)
                list.RemoveRange(MaxHistoryCount, list.Count - MaxHistoryCount);
            Configer.Set(HistoryConfigKey, list, out _, true);
        }
    }

    public static void ClearHistory()
    {
        lock (_historyLock)
        {
            Configer.Set(HistoryConfigKey, new List<DownloadRecord>(), out _, true);
        }
    }

    //清理已结束的任务状态(保留正在下载的)
    public static void RemoveFinishedItems()
    {
        Status.Items.RemoveAll(x => !x.IsDownloading);
        StatusChangedEvent?.Invoke(null, EventArgs.Empty);
    }

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
        //登记下载中的目标文件，壁纸枚举据此跳过半成品（见 DownloadingFiles 注释）
        DownloadingFiles.Begin(destPath);
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
            DownloadingFiles.End(destPath);
        }

        StatusChangedEvent?.Invoke(null, EventArgs.Empty);
        return true;
    }
}
