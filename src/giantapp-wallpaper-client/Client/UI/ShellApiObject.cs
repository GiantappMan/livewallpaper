using GiantappWallpaper;
using NLog;
using Ookii.Dialogs.Wpf;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace Client.UI;

/// <summary>
/// Shell前端api
/// </summary>
[ClassInterface(ClassInterfaceType.AutoDual)]
[ComVisible(true)]
public class ShellApiObject
{
    readonly ShellWindow? _window;

    public ShellApiObject(ShellWindow? window = null)
    {
        _window = window;
    }

    /// <summary>
    /// 三方库，感觉要崩
    /// </summary>
    /// <returns></returns>
    public async Task<string> ShowFolderDialog()
    {
        var res = string.Empty;
        bool wait = true;

        if (!VistaFolderBrowserDialog.IsVistaFolderDialogSupported)
        {
            return await ShowFolderDialogWinform();
        }

        //处理崩溃
        //https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model#re-entrancy
        System.Threading.SynchronizationContext.Current.Post((_) =>
        {
            var dialog = new VistaFolderBrowserDialog
            {
                Description = "Please select a folder.",
                UseDescriptionForTitle = true // This applies to the Vista style dialog only, not the old dialog.
            };

            if (dialog.ShowDialog(ShellWindow.Instance) == true)
            {
                // 将选择的文件夹路径发送回React应用程序
                res = dialog.SelectedPath;
            }
            wait = false;
        }, null);

        while (wait)
        {
            await Task.Delay(100);
        }
        return res;
    }

    public async Task<string> ShowFolderDialogWinform()
    {
        var res = string.Empty;
        bool wait = true;
        //处理崩溃
        //https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model#re-entrancy
        System.Threading.SynchronizationContext.Current.Post((_) =>
        {
            var dialog = new System.Windows.Forms.FolderBrowserDialog();
            if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            {
                // 将选择的文件夹路径发送回React应用程序
                res = dialog.SelectedPath;
            }
            wait = false;
        }, null);

        while (wait)
        {
            await Task.Delay(100);
        }

        return res;
    }

    public void HideLoading()
    {
        //ShellWindow.Instance?.HideLoading();
        _window?.HideLoading();
    }

    public void CloseWindow()
    {
        _window?.Close();
    }
}
