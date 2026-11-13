using System.Diagnostics;
using System.Runtime.InteropServices;
using WallpaperCore.Libs;

namespace WallpaperCore.Test;

[TestClass]
public class WindowStateCheckerTest
{
    const int SW_MAXIMIZE = 3;

    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [TestMethod]
    public void TestIsWindowMaximized()
    {
        //启动画图，再把窗口最大化
        Process p = Process.Start("mspaint.exe");
        Assert.IsNotNull(p);

        //等待画图启动
        Thread.Sleep(1000);
        p.WaitForInputIdle(5000);

        //最大化窗口
        IntPtr hWnd = p.MainWindowHandle;
        Assert.IsTrue(hWnd != IntPtr.Zero);
        ShowWindow(hWnd, SW_MAXIMIZE);
        Thread.Sleep(200);

        //检查窗口状态
        Assert.IsTrue(WindowStateChecker.IsWindowMaximized(hWnd, out _, out _));

        //关闭画图
        p.CloseMainWindow();
        p.Close();
    }

    [TestMethod]
    public void TestIsClassIgnored()
    {
        string[] ignoreStrings = new string[] { "ZcodeGhostCursorOverlay", "overlay" };
        //命中：完全匹配
        Assert.IsTrue(WindowStateChecker.IsClassIgnored("ZcodeGhostCursorOverlay", ignoreStrings));
        //命中：包含匹配
        Assert.IsTrue(WindowStateChecker.IsClassIgnored("SomeOverlayHost", new string[] { "overlay" }));
        //命中：不区分大小写
        Assert.IsTrue(WindowStateChecker.IsClassIgnored("zcodeghostcursoroverlay", ignoreStrings));
        //未命中
        Assert.IsFalse(WindowStateChecker.IsClassIgnored("Chrome_WidgetWin_1", ignoreStrings));
        //空值防御
        Assert.IsFalse(WindowStateChecker.IsClassIgnored(null, ignoreStrings));
        Assert.IsFalse(WindowStateChecker.IsClassIgnored("mpv", null));
        Assert.IsFalse(WindowStateChecker.IsClassIgnored("mpv", new string[0]));
    }
}
