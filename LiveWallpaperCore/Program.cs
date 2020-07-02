using Microsoft.VisualBasic.ApplicationServices;
using System;
using System.Windows.Forms;

namespace LiveWallpaperCore
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            SingleInstanceController controller = new SingleInstanceController();
            controller.Run(args);
        }
    }

    public class SingleInstanceController : WindowsFormsApplicationBase
    {
        public SingleInstanceController()
        {
            IsSingleInstance = false;
            StartupNextInstance += SingleInstanceController_StartupNextInstance;
        }
        private void SingleInstanceController_StartupNextInstance(object sender, StartupNextInstanceEventArgs e)
        {
            MessageBox.Show("已有一个实例启动，请查看右下角托盘");
        }
        protected override void OnRun()
        {
            Application.Run(new AppContext());
        }
        protected override bool OnStartup(StartupEventArgs eventArgs)
        {
            return base.OnStartup(eventArgs);
        }
        protected override void OnCreateMainForm()
        {
        }
    }
}
