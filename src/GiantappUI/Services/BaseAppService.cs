using GiantappUI.Helpers;
using NLog;
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;

namespace GiantappUI.Services
{
    /// <summary>
    /// 应用程序管理相关
    /// </summary>
    public class BaseAppService
    {
        private readonly Logger _logger;
        private readonly ConfigService _configService;
        private readonly Debouncer _openFolderDebouncer = new();
        public string AppName { get; private set; }
        public string ApptEntryDir { get; private set; }

        public BaseAppService(InitServiceOption option, Logger logger, ConfigService configService)
        {
            ApptEntryDir = Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!;
            AppName = option.AppName!;
            _logger = logger;
            _configService = configService;
        }

        //捕获异常
        public void CatchApplicationError()
        {
            //日志路径
            var config = new NLog.Config.LoggingConfiguration();

            string logPath = Path.Combine(_configService.LogDir, "log.txt");
            var logfile = new NLog.Targets.FileTarget("logfile") { FileName = logPath };
            var logconsole = new NLog.Targets.ConsoleTarget("logconsole");

            config.AddRule(LogLevel.Info, LogLevel.Fatal, logconsole);
            config.AddRule(LogLevel.Debug, LogLevel.Fatal, logfile);

            // Apply config           
            LogManager.Configuration = config;

            //异常捕获
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;

            System.Windows.Application.Current.DispatcherUnhandledException += Current_DispatcherUnhandledException;
        }
        private void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            var ex = e.ExceptionObject as Exception;
            _logger.Error(ex);
            System.Windows.MessageBox.Show($"Error:{ex?.Message}. \r \r ${AppName} has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
            OpenConfigFolder();
        }
        private void Current_DispatcherUnhandledException(object sender, System.Windows.Threading.DispatcherUnhandledExceptionEventArgs e)
        {
            var ex = e.Exception;
            _logger.Error(ex);
            MessageBox.Show($"Error:{ex.Message}. \r \r ${AppName} has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
            OpenConfigFolder();
        }
        public void OpenConfigFolder()
        {
            _openFolderDebouncer.Execute(new Func<Task>(() =>
            {
                try
                {
                    Process.Start("Explorer.exe", _configService.AppConfigDir);
                }
                catch (Exception ex)
                {
                    _logger.Warn("OpenConfigFolder:" + ex);
                    MessageBox.Show("OpenConfigFolder:" + ex);
                }
                return Task.CompletedTask;
            }), 1000);

        }
    }
}
