using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using MultiLanguageForXAML;

namespace GiantappWallpaper;

/// <summary>
/// 社区页右下角的浏览器快捷工具条（后退 / 前进 / 刷新），仅在社区内部生效。
/// 默认折叠成单圆把手，鼠标悬停时从右下角放大为完整工具条，移开自动收起。
/// WebView2 是 HwndHost（浏览器子窗口永远盖住同窗口的 WPF 元素，airspace 限制），
/// 无法用同窗口 WPF 元素浮在网页上方，所以用一个无激活、不进任务栏的
/// Owned 小窗口贴在壳窗口社区内容区右下角，由 ShellWindow 控制显隐与定位。
/// </summary>
public partial class CommunityNavWindow : Window
{
    private const string BackGlyph = "\uE72B";
    private const string ForwardGlyph = "\uE72A";
    private const string RefreshGlyph = "\uE72C";
    //展开胶囊尺寸（内容区坐标系，CSS px == DIP）
    private const double CapsuleWidth = 44;
    private const double CapsuleHeight = 118;
    //距社区内容区右/下边缘的边距
    private const double MarginRight = 20;
    private const double MarginBottom = 20;
    //窗口比胶囊大一圈（Margin 6），留出阴影渲染空间
    private const double WindowPadding = 6;
    private const int GWL_EXSTYLE = -20;
    private const int WS_EX_NOACTIVATE = 0x08000000;
    private const int WS_EX_TOOLWINDOW = 0x00000080;

    private readonly ShellWindow _owner;
    private bool _rtl;
    private bool _expanded;

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
        //RTL 界面箭头镜像：后退朝右、前进朝左
        BtnBack.Content = rtl ? ForwardGlyph : BackGlyph;
        BtnForward.Content = rtl ? BackGlyph : ForwardGlyph;
        BtnBack.IsEnabled = canBack;
        BtnForward.IsEnabled = canForward;
        //折叠把手贴角落：RTL 时镜像到左下角
        CollapsedRoot.HorizontalAlignment = rtl ? HorizontalAlignment.Left : HorizontalAlignment.Right;
        CollapsedRoot.Margin = rtl ? new Thickness(10, 0, 0, 10) : new Thickness(0, 0, 10, 10);
        if (show)
        {
            UpdatePlacement();
            if (!IsVisible)
                Show();
        }
        else if (IsVisible)
        {
            if (_expanded)
                Collapse();
            Hide();
        }
    }

    //把工具条贴到 webview2 内容区右下角（PointToScreen 已含窗口内边距与 DPI）
    public void UpdatePlacement()
    {
        var webview = _owner.webview2;
        if (webview.Visibility != Visibility.Visible || webview.ActualWidth <= 0 || webview.ActualHeight <= 0)
            return;
        double left = _rtl ? MarginRight : webview.ActualWidth - MarginRight - CapsuleWidth;
        double top = webview.ActualHeight - MarginBottom - CapsuleHeight;
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

    #region 折叠/展开

    private void Root_MouseEnter(object sender, MouseEventArgs e)
    {
        if (_expanded)
            return;
        _expanded = true;
        CollapsedRoot.IsHitTestVisible = false; //避免挡住展开后同位置的刷新按钮
        ExpandedRoot.IsHitTestVisible = true;
        Animate(ExpandedRoot, UIElement.OpacityProperty, 1);
        Animate(ExpandScale, ScaleTransform.ScaleXProperty, 1);
        Animate(ExpandScale, ScaleTransform.ScaleYProperty, 1);
        Animate(CollapsedRoot, UIElement.OpacityProperty, 0);
    }

    private void Root_MouseLeave(object sender, MouseEventArgs e)
    {
        if (!_expanded)
            return;
        Collapse();
    }

    private void Collapse()
    {
        _expanded = false;
        ExpandedRoot.IsHitTestVisible = false; //先关命中，空区域立刻透传点击给网页
        CollapsedRoot.IsHitTestVisible = true;
        Animate(ExpandedRoot, UIElement.OpacityProperty, 0);
        Animate(ExpandScale, ScaleTransform.ScaleXProperty, 0.4);
        Animate(ExpandScale, ScaleTransform.ScaleYProperty, 0.4);
        Animate(CollapsedRoot, UIElement.OpacityProperty, 1);
    }

    private static void Animate(IAnimatable target, DependencyProperty property, double to)
    {
        var anim = new DoubleAnimation(to, TimeSpan.FromMilliseconds(160))
        {
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
        };
        target.BeginAnimation(property, anim);
    }

    #endregion

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
