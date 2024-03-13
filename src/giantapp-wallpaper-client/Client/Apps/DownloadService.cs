using System;
using System.Collections.Generic;
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
}

public class DonwloadStatus
{
    //Items
    public List<DonwloadItem> Items { get; set; } = new List<DonwloadItem>();
}

public class DownloadService
{
    public static int MaxParallel { get; set; } = 2;


    public static event EventHandler? StatusChangedEvent;
    public static DonwloadStatus Status { get; private set; } = new DonwloadStatus();

    public static void Cancel(string id)
    {
        throw new NotImplementedException();
    }

    public static async Task<bool> DownloadAsync(string coverUrl, string destCoverPath, string id, string? desc)
    {
        throw new NotImplementedException();
    }
}
