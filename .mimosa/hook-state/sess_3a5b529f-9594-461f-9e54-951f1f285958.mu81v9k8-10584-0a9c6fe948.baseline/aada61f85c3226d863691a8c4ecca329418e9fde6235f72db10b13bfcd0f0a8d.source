//! web 壁纸鼠标交互：全局低级鼠标钩子转发。
//!
//! 嵌入 WorkerW 的壁纸窗口位于桌面图标层之下，Windows 的真实输入
//! 永远到不了壁纸窗口，`set_ignore_cursor_events` 也无济于事。
//! 与 Wallpaper Engine / Lively 相同的思路：安装 WH_MOUSE_LL 全局钩子，
//! 把鼠标事件 PostMessage 给对应壁纸的 WebView2 窗口，页面即获得
//! 移动 / 按键 / 滚轮 / 双击等完整交互。
//!
//! 命中判定：`WindowFromPoint` 的根窗口（GA_ROOT，不跨进程，停在
//! WebView2 的 Chrome_WidgetWin_1）与注册时记录的壁纸 webview 根
//! 一致才转发——实测桌面上命中的就是壁纸自己的 webview（图标层对
//! 空白区域放行），应用窗口 / 任务栏 / 桌面图标命中则根不同，自然
//! 排除。转发目标是命中窗口本身（与真实输入的投递路径一致）。
//!
//! 钩子从不吞事件（恒 CallNextHookEx），桌面图标、任务栏等行为不受影响。

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc;
use std::time::Duration;

use parking_lot::Mutex;
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{MonitorFromPoint, MonitorFromWindow, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, GetDoubleClickTime, VK_CONTROL, VK_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, EnumChildWindows, GetClassNameW, GetMessageW, GetSystemMetrics,
    GetWindowRect, GetWindowThreadProcessId, GetParent, PostMessageW, PostThreadMessageW,
    SetWindowsHookExW, UnhookWindowsHookEx, WindowFromPoint, MSG, MSLLHOOKSTRUCT, SM_CXDOUBLECLK,
    SM_CYDOUBLECLK, WH_MOUSE_LL, WM_LBUTTONDBLCLK, WM_LBUTTONDOWN, WM_LBUTTONUP,
    WM_MBUTTONDBLCLK, WM_MBUTTONDOWN, WM_MBUTTONUP, WM_MOUSEHWHEEL, WM_MOUSEMOVE, WM_MOUSEWHEEL,
    WM_QUIT, WM_RBUTTONDBLCLK, WM_RBUTTONDOWN, WM_RBUTTONUP,
};
use windows::Win32::System::Threading::GetCurrentThreadId;

/// 按键状态位（MK_*），与 Win32 输入消息的 wParam 约定一致。
const MK_LBUTTON: u32 = 0x0001;
const MK_RBUTTON: u32 = 0x0002;
const MK_SHIFT: u32 = 0x0004;
const MK_CONTROL: u32 = 0x0008;
const MK_MBUTTON: u32 = 0x0010;

/// 一个可交互 web 壁纸窗口的转发目标（按屏幕注册）。
#[derive(Debug, Clone, PartialEq)]
pub struct MouseTarget {
    pub screen: u32,
    /// 壁纸窗口所在显示器（HMONITOR 原始值）；光标命中图标层时按显示器路由。
    pub monitor: isize,
    /// 壁纸 WebView2 窗口链的链顶（GetParent 走到头的 Chrome_WidgetWin_1，
    /// 属 msedgewebview2.exe 进程）。命中侧用同一算法取链顶比对。
    pub webview_top: isize,
    /// WebView2 输入子窗口（Chrome_RenderWidgetHostHWND），图标层拦截
    /// 真实输入时的投递目标。
    pub input: isize,
}

static TARGETS: Mutex<Vec<MouseTarget>> = Mutex::new(Vec::new());

/// 当前按下的鼠标键（MOVE / 滚轮消息的 wParam 需要）。
static BUTTONS: AtomicU32 = AtomicU32::new(0);

/// 首次成功转发时打一条 INFO 日志（测试时确认链路已通）。
static FORWARDED_ONCE: AtomicBool = AtomicBool::new(false);

struct LastClick {
    button: u32,
    time: u32,
    x: i32,
    y: i32,
}
impl Clone for LastClick {
    fn clone(&self) -> Self {
        Self { button: self.button, time: self.time, x: self.x, y: self.y }
    }
}
static LAST_CLICK: Mutex<Option<LastClick>> = Mutex::new(None);

struct Running {
    tid: u32,
}
static HOOK_THREAD: Mutex<Option<Running>> = Mutex::new(None);

/// 更新某屏幕的转发目标；存在目标时确保钩子已安装，全部移除后自动卸载。
/// 目标未变化时是 no-op（刷新线程会周期性重算，避免日志/钩子抖动）。
pub fn set_target(screen: u32, target: Option<MouseTarget>) {
    let changed = {
        let mut targets = TARGETS.lock();
        if targets.iter().find(|t| t.screen == screen) == target.as_ref() {
            false
        } else {
            targets.retain(|t| t.screen != screen);
            if let Some(t) = target {
                log::info!(
                    "mouse hook target: screen {screen} monitor={:#x} webview_top={:#x} input={:#x}",
                    t.monitor, t.webview_top, t.input
                );
                targets.push(t);
            }
            true
        }
    };
    if !changed {
        return;
    }
    let need = !TARGETS.lock().is_empty();
    sync_hook(need);
}

/// 确保钩子线程与 installed 状态一致（惰性安装 / 空闲即卸载）。
fn sync_hook(need: bool) {
    let mut running = HOOK_THREAD.lock();
    match (need, running.as_ref()) {
        (true, None) => {
            let (ready_tx, ready_rx) = mpsc::channel();
            let spawned = std::thread::Builder::new()
                .name("mouse-hook".into())
                .spawn(move || hook_thread_main(ready_tx));
            let tid = spawned
                .ok()
                .and_then(|_| ready_rx.recv_timeout(Duration::from_secs(2)).ok())
                .filter(|t| *t != 0);
            *running = tid.map(|tid| Running { tid });
            if tid.is_none() {
                log::warn!("鼠标钩子线程启动失败，web 壁纸交互不可用");
            }
        }
        (false, Some(r)) => {
            unsafe {
                let _ = PostThreadMessageW(r.tid, WM_QUIT, WPARAM(0), LPARAM(0));
            }
            *running = None;
        }
        _ => {}
    }
}

fn hook_thread_main(ready: mpsc::Sender<u32>) {
    unsafe {
        let hook = match SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook_proc), None, 0) {
            Ok(h) => h,
            Err(e) => {
                log::warn!("安装鼠标钩子失败: {e}");
                let _ = ready.send(0);
                return;
            }
        };
        let _ = ready.send(GetCurrentThreadId());
        log::info!("鼠标交互钩子已安装");
        // LL 钩子事件经本线程消息队列派发；收到 WM_QUIT 即退出
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {}
        let _ = UnhookWindowsHookEx(hook);
        log::info!("鼠标交互钩子已卸载");
    }
}

unsafe extern "system" fn mouse_hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let info = &*(lparam.0 as *const MSLLHOOKSTRUCT);
        forward(wparam.0 as u32, info);
    }
    CallNextHookEx(None, code, wparam, lparam)
}

fn forward(msg: u32, info: &MSLLHOOKSTRUCT) {
    match msg {
        WM_MOUSEMOVE | WM_LBUTTONDOWN | WM_LBUTTONUP | WM_RBUTTONDOWN | WM_RBUTTONUP
        | WM_MBUTTONDOWN | WM_MBUTTONUP | WM_MOUSEWHEEL | WM_MOUSEHWHEEL => {}
        _ => return,
    }

    // 维护按下状态：MOVE / 滚轮 / DBLCLK 的 wParam 需要携带按键位
    let (bit, pressed) = match msg {
        WM_LBUTTONDOWN => (MK_LBUTTON, true),
        WM_RBUTTONDOWN => (MK_RBUTTON, true),
        WM_MBUTTONDOWN => (MK_MBUTTON, true),
        WM_LBUTTONUP => (MK_LBUTTON, false),
        WM_RBUTTONUP => (MK_RBUTTON, false),
        WM_MBUTTONUP => (MK_MBUTTON, false),
        _ => (0, false),
    };
    let state = if pressed {
        BUTTONS.fetch_or(bit, Ordering::SeqCst) | bit
    } else if bit != 0 {
        BUTTONS.fetch_and(!bit, Ordering::SeqCst)
    } else {
        BUTTONS.load(Ordering::SeqCst)
    };
    let wflags = state | modifiers();

    // 命中匹配：光标下窗口的根是注册的壁纸 webview 根才转发
    // （应用窗口 / 任务栏 / 桌面图标命中的根不同，自动排除）
    let pt = info.pt;
    let Some(hwnd) = resolve_target(pt) else {
        return;
    };

    if !FORWARDED_ONCE.swap(true, Ordering::SeqCst) {
        log::info!("web 壁纸鼠标交互已生效（首次转发 msg={msg:#x}）");
    }

    // WM_MOUSEWHEEL / WM_MOUSEHWHEEL 的 lParam 按约定为屏幕坐标
    if matches!(msg, WM_MOUSEWHEEL | WM_MOUSEHWHEEL) {
        let delta = (info.mouseData >> 16) as u16;
        let wp = ((delta as usize) << 16) | wflags as usize;
        unsafe {
            let _ = PostMessageW(Some(hwnd), msg, WPARAM(wp), lparam_xy(pt.x, pt.y));
        }
        return;
    }

    // 其余鼠标消息 lParam 为客户区坐标
    let rect = unsafe {
        let mut rect = RECT::default();
        if GetWindowRect(hwnd, &mut rect).is_err() {
            return;
        }
        rect
    };
    let cx = pt.x - rect.left;
    let cy = pt.y - rect.top;

    let mut msg = msg;
    if pressed && is_double_click(bit, info.time, cx, cy) {
        msg = match msg {
            WM_LBUTTONDOWN => WM_LBUTTONDBLCLK,
            WM_RBUTTONDOWN => WM_RBUTTONDBLCLK,
            WM_MBUTTONDOWN => WM_MBUTTONDBLCLK,
            _ => msg,
        };
        *LAST_CLICK.lock() = None;
    } else if pressed {
        *LAST_CLICK.lock() = Some(LastClick {
            button: bit,
            time: info.time,
            x: cx,
            y: cy,
        });
    }

    unsafe {
        let _ = PostMessageW(Some(hwnd), msg, WPARAM(wflags as usize), lparam_xy(cx, cy));
    }
}

/// 光标下窗口属于哪个注册的壁纸：返回应投递的窗口（命中窗口本身，
/// 与真实输入的投递路径一致）。判定方式：命中窗口沿 GetParent 链
/// 走到链顶，与注册的 webview 链顶一致即命中。应用窗口 / 任务栏 /
/// 桌面图标的链顶不同，自动排除。
/// 解析光标处应投递的壁纸输入窗口。两种桌面形态都覆盖：
/// - 图标层对空白区放行 / 图标隐藏时，命中窗口就是壁纸 webview 自己
///   （链顶 == 注册的 webview_top），直接投递命中窗口（与真实输入同路）；
/// - 图标层拦截输入时命中 SysListView32 → 链顶 Progman/WorkerW，
///   按显示器路由到该屏壁纸的输入窗口主动投递。
/// 其他应用 / 任务栏 / 锁屏 / 主窗口的链顶不同，自动排除。
fn resolve_target(pt: POINT) -> Option<HWND> {
    unsafe {
        let under = WindowFromPoint(pt);
        let top = chain_top(under.0 as isize);
        let targets = TARGETS.lock();
        if targets.iter().any(|t| t.webview_top == top) {
            return Some(under);
        }
        let top_cls = window_class_of(HWND(top as *mut _));
        if top_cls.eq_ignore_ascii_case("Progman") || top_cls.eq_ignore_ascii_case("WorkerW") {
            let mon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST).0 as isize;
            if let Some(t) = targets.iter().find(|t| t.monitor == mon) {
                return Some(HWND(t.input as *mut _));
            }
        }
        None
    }
}

/// GetParent 链顶端。实测 WebView2 的窗口链停在 Chrome_WidgetWin_1
/// （父链不进入宿主进程），壁纸窗口与命中窗口走同一算法结果一致。
pub fn chain_top(hwnd: isize) -> isize {    let mut cur = hwnd;
    unsafe {
        for _ in 0..16 {
            let parent = match GetParent(HWND(cur as *mut _)) {
                Ok(p) => p,
                Err(_) => break,
            };
            if parent.is_invalid() || parent.0 as isize == cur {
                break;
            }
            cur = parent.0 as isize;
        }
    }
    cur
}

/// 窗口所在显示器（HMONITOR 原始值）。
pub fn monitor_of_window(hwnd: isize) -> isize {
    unsafe { MonitorFromWindow(HWND(hwnd as *mut _), MONITOR_DEFAULTTONEAREST) }.0 as isize
}

struct ChildCtx {
    self_pid: u32,
    webview: Option<isize>,
}

/// 找到壁纸窗口下的 WebView2 输入子窗口——优先 Chrome_RenderWidgetHostHWND
/// （输入窗口），退回 Chrome_WidgetWin_1，再次退回任意跨进程子窗口；
/// 其链顶即注册用链顶。子窗口句柄会被 WebView2 周期性重建，调用方需
/// 周期性重取（见 InternalPlayerController 的刷新线程）。
pub fn find_webview_child(top: isize) -> Option<isize> {
    let top = HWND(top as *mut _);
    let mut ctx = ChildCtx {
        self_pid: unsafe { GetWindowThreadProcessId(top, None) },
        webview: None,
    };
    unsafe {
        let _ = EnumChildWindows(
            Some(top),
            Some(child_enum_proc),
            LPARAM(&mut ctx as *mut ChildCtx as isize),
        );
    }
    ctx.webview
}

unsafe extern "system" fn child_enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let ctx = &mut *(lparam.0 as *mut ChildCtx);
    let mut pid = 0u32;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    // WebView2 的 Chrome_* 窗口属于 msedgewebview2.exe 进程
    if pid != ctx.self_pid {
        let cls = window_class_of(hwnd);
        let is_input = cls.eq_ignore_ascii_case("Chrome_RenderWidgetHostHWND");
        let is_root = cls.eq_ignore_ascii_case("Chrome_WidgetWin_1");
        if is_input {
            // 输入窗口是最优选择，直接定稿并停止枚举
            ctx.webview = Some(hwnd.0 as isize);
            return false.into();
        }
        if ctx.webview.is_none() || is_root {
            ctx.webview = Some(hwnd.0 as isize);
        }
    }
    true.into()
}

fn window_class_of(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) };
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

fn modifiers() -> u32 {
    unsafe {
        let mut f = 0;
        if GetAsyncKeyState(VK_SHIFT.0 as i32) & 0x8000u16 as i16 != 0 {
            f |= MK_SHIFT;
        }
        if GetAsyncKeyState(VK_CONTROL.0 as i32) & 0x8000u16 as i16 != 0 {
            f |= MK_CONTROL;
        }
        f
    }
}

/// 两次按键落在系统双击判定（时间 + 位移容差）内。
fn is_double_click(button: u32, time: u32, cx: i32, cy: i32) -> bool {
    let last = LAST_CLICK.lock().clone();
    let Some(last) = last else {
        return false;
    };
    if last.button != button {
        return false;
    }
    if time.wrapping_sub(last.time) > unsafe { GetDoubleClickTime() } {
        return false;
    }
    let slack_x = unsafe { GetSystemMetrics(SM_CXDOUBLECLK) / 2 }.max(1);
    let slack_y = unsafe { GetSystemMetrics(SM_CYDOUBLECLK) / 2 }.max(1);
    (last.x - cx).abs() <= slack_x && (last.y - cy).abs() <= slack_y
}

fn lparam_xy(x: i32, y: i32) -> LPARAM {
    LPARAM((((y as u16 as usize) << 16) | (x as u16 as usize)) as isize)
}
