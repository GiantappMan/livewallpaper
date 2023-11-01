using GiantappWallpaper;
using Ookii.Dialogs.Wpf;
using System.Runtime.InteropServices;
using System.Windows;

namespace Client.UI;

/// <summary>
/// Shell前端api
/// </summary>
[ClassInterface(ClassInterfaceType.AutoDual)]
[ComVisible(true)]
public class ShellApiObject
{

    public string ShowFolderDialog()
    {
        var dialog = new VistaFolderBrowserDialog
        {
            Description = "Please select a folder.",
            UseDescriptionForTitle = true // This applies to the Vista style dialog only, not the old dialog.
        };

        if (!VistaFolderBrowserDialog.IsVistaFolderDialogSupported)
        {
            MessageBox.Show(ShellWindow.Instance, "Because you are not using Windows Vista or later, the regular folder browser dialog will be used. Please use Windows Vista to see the new dialog.", "Sample folder browser dialog");
        }

        if (dialog.ShowDialog(ShellWindow.Instance) == true)
        {
            // 将选择的文件夹路径发送回React应用程序
            return dialog.SelectedPath;
            //MessageBox.Show(this, $"The selected folder was:{Environment.NewLine}{dialog.SelectedPath}", "Sample folder browser dialog");
        }
        return "";
    }
}
