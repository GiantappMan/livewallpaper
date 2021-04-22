using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LiveWallpaperEngineRender
{
    public class LaunchOptions
    {
        public int WindowLeft { get; set; }
        public int WindowTop { get; set; }
    }

    static class Program
    {
        /// <summary>
        ///  The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(string[] args)
        {
            LaunchOptions e = Util.ParseArguments<LaunchOptions>(args);

            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Console.WriteLine("initlized");

            ListenConsole();

            Application.Run(new RenderForm()
            {
                Left = e.WindowLeft,
                Top = e.WindowTop,
                StartPosition = FormStartPosition.Manual
            });
        }


        static DateTime lastReadTime = DateTime.Now;
        private static async void ListenConsole()
        {
            while (true)
            {
                if (DateTime.Now - lastReadTime < TimeSpan.FromSeconds(1))
                    await Task.Delay(1000);

                var command = await Console.In.ReadLineAsync();
                if (command != null)
                {
                    WinformInvoke(() =>
                    {
                        RenderForm form = new RenderForm();
                        form.Show();
                    });
                }
                else
                {
                    //非命令触发时才加调用限制
                    lastReadTime = DateTime.Now;
                }
            }
        }

        public static void WinformInvoke(Action a)
        {
            if (Application.OpenForms.Count == 0)
                return;

            var mainForm = Application.OpenForms[0];
            if (mainForm.InvokeRequired)
                mainForm.Invoke(a);
            else
                a();
        }
    }
}
