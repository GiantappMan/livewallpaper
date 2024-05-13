using System.Diagnostics;
using WallpaperCore.Libs;

namespace WallpaperCore.Test;

[TestClass]
public class WindowStateCheckerTest
{
    [TestMethod]
    public void TestIsWindowMaximized()
    {
        //启动notepad，并最大化窗口
        ProcessStartInfo psi = new("mspaint.exe")
        {
            WindowStyle = ProcessWindowStyle.Maximized
        };
        Process p = Process.Start(psi);
        Assert.IsNotNull(p);

        //等待notepad启动
        Thread.Sleep(1000);

        //获取notepad的窗口句柄
        IntPtr hWnd = p.MainWindowHandle;
        Assert.IsTrue(hWnd != IntPtr.Zero);

        //检查窗口状态
        Assert.IsTrue(WindowStateChecker.IsWindowMaximized(hWnd, out _, out _));

        //关闭notepad
        p.CloseMainWindow();
        p.Close();
    }
}
