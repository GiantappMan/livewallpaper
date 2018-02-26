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

namespace VideoPlayer
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            // 设置全屏

            //double x = SystemParameters.WorkArea.Width;//得到屏幕工作区域宽度
            //double y = SystemParameters.WorkArea.Height;//得到屏幕工作区域高度
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
            mediaElement.LoadedBehavior = MediaState.Manual;

            if (App.Args != null && App.Args.Length > 0)
            {
                var path = App.Args[0];
                //MessageBox.Show(path);
                mediaElement.Source = new Uri(path);
                mediaElement.Play();
            }
        }

        private void mediaElement_MediaEnded(object sender, RoutedEventArgs e)
        {
            mediaElement.Position = new TimeSpan(0, 0, 1);
            mediaElement.Play();
        }
    }
}
