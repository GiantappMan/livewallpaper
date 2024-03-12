using System;
using System.Threading.Tasks;

namespace Client.Apps;

public class DonwloadStatus
{

}

public class DownloadService
{
    public static event EventHandler? StatusChangedEvent;
    public static DonwloadStatus Status { get; private set; } = new DonwloadStatus();

    internal static void Cancel(string id)
    {
        throw new NotImplementedException();
    }

    internal static async Task<bool> DownloadAsync(string coverUrl, string destCoverPath, string? desc)
    {
        throw new NotImplementedException();
    }
}
