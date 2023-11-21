using Client.Apps;
using HandyControl.Controls;
using HandyControl.Interactivity;
using MultiLanguageForXAML;
using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace Client.UI;

//托盘图标
internal class AppNotifyIcon
{
    private NotifyIcon? _notifyIcon;
    private MenuItem? _aboutMenuItem;
    private MenuItem? _exitMenuItem;
    public static ContextMenu? Menu { private set; get; }

    internal void Init()
    {
        Menu = new()
        {
            Width = 150
        };
        _aboutMenuItem = new();
        _aboutMenuItem.Click += AboutMenuItem_Click;
        _exitMenuItem = new() { Command = ControlCommands.ShutdownApp };
        _exitMenuItem.Click += ExitMenuItem_Click;

        Menu.Items.Add(_aboutMenuItem);
        Menu.Items.Add(_exitMenuItem);
        Uri iconUri = new("pack://application:,,,/Assets/img/logo.ico");
        _notifyIcon = new()
        {
            Icon = new BitmapImage(iconUri)
            {
                DecodePixelWidth = 300,
                DecodePixelHeight = 300
            },
            ContextMenu = Menu
        };

        _notifyIcon.MouseDoubleClick += NotifyIcon_MouseDoubleClick;
        _notifyIcon.Init();

        UpdateNotifyIconText();
    }

    #region public
    public void UpdateNotifyIconText(string? lan = null)
    {
        if (lan != null)
            LanService.UpdateCulture(lan);

        _notifyIcon?.Dispatcher.BeginInvoke(() =>
        {
            _aboutMenuItem!.Header = LanService.Get("about");
            _exitMenuItem!.Header = LanService.Get("exit");
        });
    }

    #endregion

    #region private

    private void NotifyIcon_MouseDoubleClick(object sender, RoutedEventArgs e)
    {
        AppService.ShowShell();
    }

    private void AboutMenuItem_Click(object sender, RoutedEventArgs e)
    {
        //系统浏览器打开网页
        OpenBrowser("https://github.com/DaZiYuan/livewallpaper");
    }

    private void ExitMenuItem_Click(object sender, RoutedEventArgs e)
    {
        AppService.Exit();
    }

    private static void OpenBrowser(string? url)
    {
        try
        {
            if (url == null)
                return;
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show(ex.ToString());
        }
    }
    #endregion
}
