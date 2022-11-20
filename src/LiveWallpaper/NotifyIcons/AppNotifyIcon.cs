﻿using HandyControl.Controls;
using HandyControl.Interactivity;
using MultiLanguageForXAML;
using System;
using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace LiveWallpaper.NotifyIcons
{
    //托盘图标
    internal class AppNotifyIcon
    {
        private readonly NotifyIcon _notifyIcon = new();
        private readonly MenuItem _aboutMenuItem = new();
        private readonly MenuItem _localWallpaperMenuItem = new();
        private readonly MenuItem _wallpaperCommunityMenuItem = new();
        private readonly MenuItem _settingsMenuItem = new();
        private readonly MenuItem _exitMenuItem = new();
        public ContextMenu? Menu { private set; get; }

        internal void Init()
        {
            _aboutMenuItem.Click += AboutMenuItem_Click;
            _settingsMenuItem.Click += SettingMenuItem_Click;
            _exitMenuItem.Command = ControlCommands.ShutdownApp;

            Menu = new()
            {
                Width = 150
            };

            Menu.Items.Add(_aboutMenuItem);
            Menu.Items.Add(new Separator());
            Menu.Items.Add(_localWallpaperMenuItem);
            Menu.Items.Add(_wallpaperCommunityMenuItem);
            Menu.Items.Add(_settingsMenuItem);
            Menu.Items.Add(new Separator());
            Menu.Items.Add(_exitMenuItem);

            string ApptEntryDir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
            string iconPath = Path.Combine(ApptEntryDir, "Assets\\Img\\logo.ico");
            _notifyIcon.Icon = new BitmapImage(new Uri(iconPath, UriKind.Absolute))
            {
                DecodePixelWidth = 300,
                DecodePixelHeight = 300
            };
            _notifyIcon.ContextMenu = Menu;
            _notifyIcon.MouseDoubleClick += NotifyIcon_MouseDoubleClick;
            _notifyIcon.Init();
            UpdateNotifyIconText();
        }
        #region public
        internal void UpdateNotifyIconText(string? lan = null)
        {
            if (lan != null)
                LanService.UpdateCulture(lan);

            _notifyIcon?.Dispatcher.BeginInvoke(() =>
            {
                _aboutMenuItem.Header = LanService.Get("about");
                _settingsMenuItem.Header = LanService.Get("settings");
                _wallpaperCommunityMenuItem.Header = LanService.Get("wallpaper_community");
                _localWallpaperMenuItem.Header = LanService.Get("local_wallpaper");
                _exitMenuItem.Header = LanService.Get("exit");
            });
        }

        #endregion

        #region callback

        private void SettingMenuItem_Click(object sender, RoutedEventArgs e)
        {

        }
        private void AboutMenuItem_Click(object sender, RoutedEventArgs e)
        {

        }
        private void NotifyIcon_MouseDoubleClick(object sender, RoutedEventArgs e)
        {
        }

        #endregion
    }
}