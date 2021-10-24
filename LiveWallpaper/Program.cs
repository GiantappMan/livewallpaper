using LiveWallpaper.LocalServer;
using NLog;
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace LiveWallpaper
{
    class Program
    {
        private static readonly Logger logger = NLog.LogManager.GetCurrentClassLogger();

        [STAThread]
        static void Main()
        {
            //日志路径
            var config = new NLog.Config.LoggingConfiguration();

            string logPath = Path.Combine(AppManager.LogDir, "log.txt");
            var logfile = new NLog.Targets.FileTarget("logfile") { FileName = logPath };
            var logconsole = new NLog.Targets.ConsoleTarget("logconsole");

            config.AddRule(LogLevel.Info, LogLevel.Fatal, logconsole);
            config.AddRule(LogLevel.Debug, LogLevel.Fatal, logfile);

            // Apply config           
            LogManager.Configuration = config;

            //异常捕获
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;

            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Application.Run(new AppContext());
        }

        private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            var ex = e.ExceptionObject as Exception;
            logger.Error(ex);
            MessageBox.Show($"Error:{ex.Message}. \r \r Livewallpaper has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
            OpenConfigFolder();
        }

        public static void OpenConfigFolder()
        {
            try
            {
                Process.Start("Explorer.exe", AppManager.ConfigDir);
            }
            catch (Exception ex)
            {
                logger.Warn("OpenConfigFolder:" + ex);
                MessageBox.Show("OpenConfigFolder:" + ex);
            }
        }
    }
}
