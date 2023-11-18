using System.Diagnostics;
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
        var p = Process.Start("TestWallpapers\\TestExeWallpaper.exe");
        while (p.MainWindowHandle == IntPtr.Zero)
        {
            Thread.Sleep(100);
        }
        var handler = p.MainWindowHandle;

        var res = DesktopManager.SendHandleToDesktopBottom(handler, Screen.AllScreens[0].Bounds);
        Assert.IsTrue(res);
    }
}
