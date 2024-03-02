using System.Diagnostics;
using System.Runtime.InteropServices;

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

        var res = DesktopManager.SendHandleToDesktopBottom(handler, WallpaperApi.GetScreen(1)?.Bounds);
        Assert.IsTrue(res);
        Thread.Sleep(5000);
        p.Kill();
        DesktopManager.CreateWorkerW();//刷新背景
    }
}
