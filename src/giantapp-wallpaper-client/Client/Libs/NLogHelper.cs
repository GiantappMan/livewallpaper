using NLog;
using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
//依赖Nlog
namespace Client.Libs;

//日志初始化，捕获异常
public class NLogHelper
{
    public static string? Folder { get; private set; }
    private static readonly NLog.Logger _logger = LogManager.GetCurrentClassLogger();
    private static string? _productName;
    internal static void Init(string productName)
    {
        _productName = productName;
        Folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), productName, "logs");
        CatchApplicationError();
    }

    #region private
    //捕获异常
    private static void CatchApplicationError()
    {
        //日志路径
        var config = new NLog.Config.LoggingConfiguration();

        string logPath = Path.Combine(Folder, "log.txt");
        string erroLlogPath = Path.Combine(Folder, "err.txt");
        var logfile = new NLog.Targets.FileTarget("logfile") { FileName = logPath, MaxArchiveFiles = 3, ArchiveEvery = NLog.Targets.FileArchivePeriod.Month };
        var erroLogfile = new NLog.Targets.FileTarget("erroLogfile")
        {
            FileName = erroLlogPath,
            MaxArchiveFiles = 3,
            ArchiveEvery = NLog.Targets.FileArchivePeriod.Month,
            //Layout = "${longdate} ${uppercase:${level}} ${message} ${exception:format=toString} (line: ${callsite-linenumber})"
        };
        var logconsole = new NLog.Targets.ConsoleTarget("logconsole");

        config.AddRule(LogLevel.Info, LogLevel.Fatal, logconsole);
        config.AddRule(LogLevel.Debug, LogLevel.Fatal, logfile);
        config.AddRule(LogLevel.Error, LogLevel.Fatal, erroLogfile);

        // Apply config           
        LogManager.Configuration = config;

        //异常捕获
        AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;

        Application.Current.DispatcherUnhandledException += Current_DispatcherUnhandledException;

        //Application.SetHighDpiMode(HighDpiMode.PerMonitorV2); 多屏 DPI
    }
    private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        var ex = e.ExceptionObject as Exception;
        _logger.Error(ex);
        MessageBox.Show($"Error:{ex?.Message}. \r \r {_productName} has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
        OpenConfigFolder();
    }
    private static void Current_DispatcherUnhandledException(object sender, System.Windows.Threading.DispatcherUnhandledExceptionEventArgs e)
    {
        var ex = e.Exception;
        _logger.Error(ex);
        MessageBox.Show($"Error:{ex.Message}. \r \r ￥{_productName} has encountered an error and will automatically open the log folder. \r \r please sumibt these logs to us, thank you");
        OpenConfigFolder();
    }
    public static void OpenConfigFolder()
    {
        Debouncer.Shared.Delay(() =>
        {
            try
            {
                Process.Start("Explorer.exe", Folder);
            }
            catch (Exception ex)
            {
                _logger.Warn("OpenConfigFolder:" + ex);
                MessageBox.Show("OpenConfigFolder:" + ex);
            }
        }, 1000);
    }

    #endregion
}
