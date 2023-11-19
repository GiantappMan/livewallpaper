using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;

namespace WallpaperCore.Test;

[TestClass]
public class DesktopManagerTest
{
    [TestMethod]
    public void TestGetWorkerW()
    {
        //kill all explorer
        var processes = Process.GetProcessesByName("explorer");
        foreach (var process in processes)
        {
            process.Kill();
        }
        //start explorer and wait
        Process.Start("explorer");
        Thread.Sleep(3000);

        var res = DesktopManager.GetWorkerW();
        Assert.IsTrue(res != IntPtr.Zero);
    }

    [TestMethod]
    public void TestSendHandleToDesktopBottom()
    {
        SetPerMonitorV2DpiAwareness();
        var p = Process.Start("TestWallpapers\\TestExeWallpaper.exe");
        //var p = Process.Start("mspaint");
        while (p.MainWindowHandle == IntPtr.Zero)
        {
            Thread.Sleep(100);
        }
        var handler = p.MainWindowHandle;
        //Application.SetHighDpiMode(HighDpiMode.PerMonitorV2); 多屏 DPI

        var res = DesktopManager.SendHandleToDesktopBottom(handler, Screen.AllScreens[0].Bounds);
        Assert.IsTrue(res);
        Thread.Sleep(5000);
        p.Kill();
        DesktopManager.CreateWorkerW();//刷新背景
    }

    [DllImport("user32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT dpiContext);

    [DllImport("shcore.dll")]
    private static extern bool SetProcessDpiAwareness(PROCESS_DPI_AWARENESS awareness);

    private enum PROCESS_DPI_AWARENESS
    {
        ProcessDpiUnaware = 0,
        ProcessSystemDPIAware = 1,
        ProcessPerMonitorDPIAware = 2,
    }

    private enum DPI_AWARENESS_CONTEXT
    {
        DPI_AWARENESS_CONTEXT_UNAWARE = -1,
        DPI_AWARENESS_CONTEXT_SYSTEM_AWARE = -2,
        DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE = -3,
        DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4,
    }

    static void SetPerMonitorV2DpiAwareness()
    {
        try
        {
            // 首先，尝试将DPI感知设置为PerMonitorV2
            if (SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT.DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2))
            {
                Console.WriteLine("成功设置为PerMonitorV2 DPI感知。");
            }
            else
            {
                // 如果函数失败，可以尝试使用较旧的方法设置
                if (SetProcessDpiAwareness(PROCESS_DPI_AWARENESS.ProcessPerMonitorDPIAware))
                {
                    Console.WriteLine("成功设置为PerMonitor DPI感知。");
                }
                else
                {
                    Console.WriteLine("无法设置DPI感知。");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"设置DPI感知时出错：{ex.Message}");
        }
    }
}
