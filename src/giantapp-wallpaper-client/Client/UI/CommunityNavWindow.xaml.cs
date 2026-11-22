using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using MultiLanguageForXAML;

namespace GiantappWallpaper;

/// <summary>
/// 社区页的浏览器快捷工具条（后退 / 前进 / 刷新），仅在社区内部生效。
/// 常驻在标题栏（web TitleBar 行，高 3rem）内、标题（logo+头像）之后：三枚 32px
/// 幽灵按钮（ShellWindow NavIconButton 同规格，悬停 12% 淡入），无底无边融入标题栏。
/// 不做折叠/悬停展开（右下角悬浮方案会与社区站底部锚定元素互相遮挡，且窗口
/// 移动引发 WPF 假 MouseLeave/Enter 造成闪烁，已弃用）。
/// WebView2 是 HwndHost（浏览器子窗口永远盖住同窗口的 WPF 元素，airspace 限制），
/// 无法用同窗口 WPF 元素浮在网页上方，所以用一个无激活、不进任务栏的
/// Owned 小窗口浮在壳窗口标题栏上方，由 ShellWindow 控制显隐与定位。
/// </summary>
public partial class CommunityNavWindow : Window
{
    private const string BackGlyph = "\uE72B";
    private const string ForwardGlyph = "\uE72A";
    private const string RefreshGlyph = "\uE72C";
    //三枚 32px 幽灵按钮的横排区域（内容区坐标系，CSS px == DIP）
    private const double NavWidth = 96;
    private const double NavHeight = 32;
    //窗口四周留 4px 命中余量
    private const double WindowPadding = 4;
    //web 标题栏行高（布局里 3rem）与标题（logo+头像）之后的起始 x
    private const double TitleBarHeight = 48;
    private const double TitleBarOffsetX = 112;
    private const int GWL_EXSTYLE = -20;
    private const int WS_EX_NOACTIVATE = 0x08000000;
    private const int WS_EX_TOOLWINDOW = 0x00000080;

    private readonly ShellWindow _owner;
    private bool _rtl;

    public event Action? BackRequested;
    public event Action? ForwardRequested;
    public event Action? RefreshRequested;

    public CommunityNavWindow(ShellWindow owner)
    {
        InitializeComponent();
        _owner = owner;
        //tooltip 带快捷键提示，与 ShellWindow 的社区快捷键（Alt+←/Alt+→/F5）对应
        BtnBack.ToolTip = $"{LanService.Get("back")} (Alt+←)";
        BtnForward.ToolTip = $"{LanService.Get("forward")} (Alt+→)";
        BtnRefresh.ToolTip = $"{LanService.Get("refresh")} (F5)";
        Owner = owner;
    }

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        //不抢焦点（点击后 WebView2 键盘焦点不动），也不出现在 Alt+Tab
        var hwnd = new WindowInteropHelper(this).Handle;
        int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        SetWindowLong(hwnd, GWL_EXSTYLE, exStyle | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW);
    }

    /// <summary>
    /// 同步显示状态、RTL 朝向与各按钮可用性，显示时重算位置
    /// </summary>
    public void UpdateState(bool show, bool rtl, bool canBack, bool canForward)
    {
        _rtl = rtl;
        //RTL：布局镜像（按钮从右往左排），箭头方向对调
        FlowDirection = rtl ? System.Windows.FlowDirection.RightToLeft : System.Windows.FlowDirection.LeftToRight;
        BtnBack.Content = rtl ? ForwardGlyph : BackGlyph;
        BtnForward.Content = rtl ? BackGlyph : ForwardGlyph;
        BtnBack.IsEnabled = canBack;
        BtnForward.IsEnabled = canForward;
        if (show)
        {
            UpdatePlacement();
            if (!IsVisible)
                Show();
        }
        else if (IsVisible)
        {
            Hide();
        }
    }

    //落位到标题栏内、标题之后（webview 坐标系，PointToScreen 已含窗口内边距与 DPI），
    //垂直在标题栏（48px）内居中
    public void UpdatePlacement()
    {
        var webview = _owner.webview2;
        if (webview.Visibility != Visibility.Visible || webview.ActualWidth <= 0 || webview.ActualHeight <= 0)
            return;
        double left = _rtl
            ? webview.ActualWidth - TitleBarOffsetX - NavWidth
            : TitleBarOffsetX;
        double top = (TitleBarHeight - NavHeight) / 2;
        try
        {
            var screenPoint = webview.PointToScreen(new Point(left, top));
            double scale = PresentationSource.FromVisual(webview)?.CompositionTarget?.TransformToDevice.M11 ?? 1.0;
            if (scale <= 0 || double.IsNaN(scale) || double.IsInfinity(scale))
                scale = 1.0;
            Left = screenPoint.X / scale - WindowPadding;
            Top = screenPoint.Y / scale - WindowPadding;
        }
        catch
        {
            //visual 尚未渲染完成时跳过，等下一次布局事件
        }
    }

    private void BtnBack_Click(object sender, RoutedEventArgs e)
    {
        BackRequested?.Invoke();
    }

    private void BtnForward_Click(object sender, RoutedEventArgs e)
    {
        ForwardRequested?.Invoke();
    }

    private void BtnRefresh_Click(object sender, RoutedEventArgs e)
    {
        RefreshRequested?.Invoke();
    }

    [DllImport("user32.dll")]
    private static extern int GetWindowLong(IntPtr hwnd, int index);

    [DllImport("user32.dll")]
    private static extern int SetWindowLong(IntPtr hwnd, int index, int newStyle);
}
