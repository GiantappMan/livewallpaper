using Client.Libs;
using GiantappWallpaper;
using Newtonsoft.Json;
using Ookii.Dialogs.Wpf;
using System;
using System.Runtime.InteropServices;
using System.Windows;

namespace Client.Apps;

public class ConfigSetAfterEventArgs : EventArgs
{
    public string Key { get; set; } = string.Empty;
    public string Json { get; set; } = string.Empty;
}

public class CorrectConfigEventArgs : ConfigSetAfterEventArgs
{
    public object? Corrected { get; set; }
}

/// <summary>
/// 前端api
/// </summary>
[ClassInterface(ClassInterfaceType.AutoDual)]
[ComVisible(true)]
public class ApiObject
{
    public static event EventHandler<ConfigSetAfterEventArgs>? ConfigSetAfterEvent;
    public static event EventHandler<CorrectConfigEventArgs>? CorrectConfigEvent;

    public void SetConfig(string key, string json)
    {
        key = $"Client.Apps.Configs.{key}";
        var obj = JsonConvert.DeserializeObject(json, Configer.JsonSettings);
        Configer.Set(key, obj, true);
        if (ConfigSetAfterEvent != null && obj != null)
        {
            ConfigSetAfterEvent(this, new ConfigSetAfterEventArgs
            {
                Key = key,
                Json = json
            });
        }
    }

    public string GetConfig(string key)
    {
        key = $"Client.Apps.Configs.{key}";
        var config = Configer.Get<object>(key) ?? "";
        var json = JsonConvert.SerializeObject(config, Configer.JsonSettings);
        if (CorrectConfigEvent != null)
        {
            var e = new CorrectConfigEventArgs
            {
                Key = key,
                Json = json
            };
            CorrectConfigEvent(this, e);
            if (e.Corrected != null)
            {
                json = JsonConvert.SerializeObject(e.Corrected, Configer.JsonSettings);
            }
        }

        return json;
    }

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
