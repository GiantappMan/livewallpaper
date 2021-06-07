using GiantappConfiger;
using GiantappConfiger.Models;
using Giantapp.LiveWallpaper.Engine;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Forms;
using static Giantapp.LiveWallpaper.Engine.ScreenOption;
using System;
using System.Text;
using WinAPI;

namespace LiveWallpaperEngine.Samples.NetCore.Test
{
    class Monitor
    {
        public string DeviceName { get; set; }
        public bool Checked { get; set; }
    }
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        readonly List<Monitor> monitorsVM = new();
        public MainWindow()
        {
            System.Windows.Forms.Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Activated += MainWindow_Activated;
            Deactivated += MainWindow_Deactivated;
            WallpaperApi.Initlize(Dispatcher);
            InitializeComponent();
            monitors.ItemsSource = monitorsVM = Screen.AllScreens.Select(m => new Monitor()
            {
                DeviceName = m.DeviceName,
                Checked = true
            }).ToList();

            var audioOption = Screen.AllScreens.Select(m => new DescriptorInfo()
            {
                Text = m.DeviceName,
                DefaultValue = m.DeviceName
            }).ToList();
            audioOption.Insert(0, new DescriptorInfo() { Text = "Disabled", DefaultValue = null });

            var screenSetting = Screen.AllScreens.Select(m => new ScreenOption()
            {
                Screen = m.DeviceName,
                WhenAppMaximized = ActionWhenMaximized.Pause,
            }).ToList();

            var screenSettingOptions = new List<DescriptorInfo>()
            {
                new DescriptorInfo(){Text="Play",DefaultValue=ActionWhenMaximized.Play},
                new DescriptorInfo(){Text="Pause",DefaultValue=ActionWhenMaximized.Pause},
                new DescriptorInfo(){Text="Stop",DefaultValue=ActionWhenMaximized.Stop},
            };

            var descInfo = new DescriptorInfoDict()
            {
                { nameof(LiveWallpaperOptions),
                    new DescriptorInfo(){
                        Text="Wallpaper Settings",
                        PropertyDescriptors=new DescriptorInfoDict(){
                            {
                                nameof(LiveWallpaperOptions.AudioScreen),
                                new DescriptorInfo(){
                                    Text="Audio Source",
                                    Type=PropertyType.Combobox,Options=new ObservableCollection<DescriptorInfo>(audioOption),
                                    DefaultValue=null,
                                }
                            },
                            //{
                            //    nameof(LiveWallpaperOptions.AutoRestartWhenExplorerCrash),
                            //    new DescriptorInfo(){
                            //        Text="崩溃后自动恢复",
                            //        DefaultValue=true,
                            //}},
                            {
                                nameof(LiveWallpaperOptions.AppMaximizedEffectAllScreen),
                                new DescriptorInfo(){
                                    Text="Full screen detection affects all screens",
                                    DefaultValue=true,
                            }},
                               {
                                nameof(LiveWallpaperOptions.ForwardMouseEvent),
                                new DescriptorInfo(){
                                    Text="Forward mouse event",
                                    DefaultValue=true,
                            }},
                            {
                                nameof(LiveWallpaperOptions.ScreenOptions),
                                new DescriptorInfo(){
                                    Text ="Display Settings",
                                    Type =PropertyType.List,
                                    CanAddItem =false,
                                    CanRemoveItem=false,
                                    DefaultValue=screenSetting,
                                    PropertyDescriptors=new DescriptorInfoDict()
                                    {
                                        {nameof(ScreenOption.Screen),new DescriptorInfo(){ Text="Screen",Type=PropertyType.Label } },
                                        {nameof(ScreenOption.WhenAppMaximized),new DescriptorInfo(){ Text="When other programs are maximized",Options=new ObservableCollection<DescriptorInfo>(screenSettingOptions)} }
                                    }
                                }
                            },
                }}}
            };
            var setting = new LiveWallpaperOptions()
            {
                ScreenOptions = screenSetting
            };
            var vm = ConfigerService.GetVM(setting, descInfo);
            configer.DataContext = vm;
        }

        private void MainWindow_Deactivated(object sender, EventArgs e)
        {
            //System.Diagnostics.Debug.WriteLine("MainWindow_Deactivated " + GetActiveWindowTitle());
        }

        private void MainWindow_Activated(object sender, EventArgs e)
        {
            //System.Diagnostics.Debug.WriteLine("MainWindow_Activated " + GetActiveWindowTitle());
        }

        private async void BtnSelect_Click(object sender, RoutedEventArgs e)
        {
            //System.Diagnostics.Debug.WriteLine("before ShowWallpaper " + GetActiveWindowTitle());
            using (var openFileDialog = new OpenFileDialog())
            {
                openFileDialog.InitialDirectory = "WallpaperSamples";
                openFileDialog.Filter = "All files (*.*)|*.*";

                if (openFileDialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    var displayScreen = monitorsVM.Where(m => m.Checked).Select(m => m.DeviceName).ToArray();
                    BtnApply_Click(null, null);
                    var showResult = await WallpaperApi.ShowWallpaper(openFileDialog.FileName, displayScreen);
                    var wp = showResult.Data;
                    if (!showResult.Ok)
                    {
                        if (showResult.Error == ErrorType.NoPlayer)
                        {
                            var r = System.Windows.MessageBox.Show($"{showResult.Error} {showResult.Message}， Whether to download the player？", "", MessageBoxButton.OKCancel);
                            if (r == MessageBoxResult.OK)
                            {
                                popup.Visibility = Visibility.Visible;
                                txtPopup.Text = "downloading...";
                                var url = WallpaperApi.PlayerUrls.FirstOrDefault(m => m.Type == wp.RunningData.Type).DownloadUrl;

                                void WallpaperManager_SetupPlayerProgressChangedEvent(object sender, SetupPlayerProgressChangedArgs e)
                                {
                                    Dispatcher.BeginInvoke(new Action(async () =>
                                    {
                                        txtPopup.Text = $"{(e.ActionType == SetupPlayerProgressChangedArgs.Type.Unpacking ? "unpacking" : "downloading")} ... {(int)(e.ProgressPercentage * 100)}%";

                                        if (e.AllCompleted)
                                        {
                                            WallpaperApi.SetupPlayerProgressChangedEvent -= WallpaperManager_SetupPlayerProgressChangedEvent;
                                            popup.Visibility = Visibility.Collapsed;

                                            if (e.Result.Ok)
                                            {
                                                showResult = await WallpaperApi.ShowWallpaper(wp, displayScreen);
                                            }
                                            else
                                            {
                                                System.Windows.Forms.MessageBox.Show($"Message:{e.Result.Message},Error:{e.Result.Error}");
                                            }
                                        }
                                    }));
                                }

                                WallpaperApi.SetupPlayerProgressChangedEvent -= WallpaperManager_SetupPlayerProgressChangedEvent;
                                WallpaperApi.SetupPlayerProgressChangedEvent += WallpaperManager_SetupPlayerProgressChangedEvent;

                                var setupResult = WallpaperApi.SetupPlayer(wp.RunningData.Type.Value, url);
                            }
                        }
                        else
                            System.Windows.MessageBox.Show($"{showResult.Error} {showResult.Message} ");
                    }
                }
            }
            //System.Diagnostics.Debug.WriteLine("after ShowWallpaper" + GetActiveWindowTitle());
            //IntPtr progman = User32Wrapper.FindWindow("Progman", null);
            //User32Wrapper.SetForegroundWindow(window); //change focus from the started window//application.
            //User32Wrapper.SetFocus(window);
            Activate();
        }

        private static string GetActiveWindowTitle()
        {
            const int nChars = 256;
            StringBuilder Buff = new(nChars);
            IntPtr handle = User32Wrapper.GetForegroundWindow();

            if (User32Wrapper.GetWindowText(handle, Buff, nChars) > 0)
            {
                return Buff.ToString();
            }
            return null;
        }
        private async void BtnStop_Click(object sender, RoutedEventArgs e)
        {
            var activeWindowTitle = GetActiveWindowTitle();
            //System.Diagnostics.Debug.WriteLine("btnStop_Click " + activeWindowTitle); 
            var displayIds = monitorsVM.Where(m => m.Checked).Select(m => m.DeviceName).ToArray();
            await WallpaperApi.CloseWallpaper(displayIds);
        }

        private void BtnApply_Click(object sender, RoutedEventArgs e)
        {
            var vm = (ConfigerViewModel)configer.DataContext;
            var setting = ConfigerService.GetData<LiveWallpaperOptions>(vm.Nodes);
            _ = WallpaperApi.SetOptions(setting);
        }

        private async void BtnCancelSetupPlayer_Click(object sender, RoutedEventArgs e)
        {
            _ = await WallpaperApi.StopSetupPlayer();
            popup.Visibility = Visibility.Collapsed;
        }
    }
}
