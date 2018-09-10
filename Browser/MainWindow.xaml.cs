using CefSharp;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Browser
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            // 设置全屏
            double x1 = SystemParameters.PrimaryScreenWidth;//得到屏幕整体宽度
            double y1 = SystemParameters.PrimaryScreenHeight;//得到屏幕整体高度
            WindowState = System.Windows.WindowState.Maximized;
            WindowStyle = System.Windows.WindowStyle.None;
            ResizeMode = System.Windows.ResizeMode.NoResize;
            //MinWidth = Screen.AllScreens[0].Bounds.Width;
            //MinHeight = Screen.AllScreens[0].Bounds.Height;
            MinWidth = x1;
            MinHeight = y1;
            Left = 0;
            Top = 0;


            InitializeComponent();
            CefSettings cs = new CefSettings();
            cs.CefCommandLineArgs.Add("--disable-web-security", "");
            cs.CefCommandLineArgs.Add("--allow-file-access-from-files", "");
            cs.CefCommandLineArgs.Add("--allow-file-access", "");

            if (App.Args != null && App.Args.Length > 0)
            {
                browser.Load(App.Args[0]);
            }

            //Loaded += MainWindow_Loaded;
            //Test();
        }

        private  void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            //await Task.Delay(2000);
            //browser.GetBrowser().ShowDevTools();
        }

        protected override void OnClosed(EventArgs e)
        {
            Cef.Shutdown();
            base.OnClosed(e);
        }

        //private async void Test()
        //{
        //    for (int i = 0; i < 100; i++)
        //    {
        //        System.Diagnostics.Debug.WriteLine($"{Width} { Height} {Left} {Top}");
        //        await Task.Delay(100);
        //    }
        //}
    }
}
