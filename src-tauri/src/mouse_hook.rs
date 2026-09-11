//! web 壁纸鼠标交互：全局低级鼠标钩子转发。
//!
//! 嵌入 WorkerW 的壁纸窗口位于桌面图标层（Progman → SHELLDLL_DefView →
//! SysListView32）之下，Windows 把桌面上的鼠标输入全部交给图标层，
//! 壁纸窗口收不到任何真实输入，`set_ignore_cursor_events` 也无济于事。
//! 与 Wallpaper Engine / Lively 相同的思路：安装 WH_MOUSE_LL 全局钩子，
//! 把"落在桌面上"的鼠标事件 PostMessage 给对应屏幕的 WebView2 子窗口
//! （Chrome_WidgetWin_0），页面即获得移动 / 按键 / 滚轮 / 双击等完整交互。
//!
//! 钩子从不吞事件（恒 CallNextHookEx），桌面图标、任务栏等行为不受影响；
//! 光标位于普通应用窗口之上时不转发，避免事件穿透到被遮挡的壁纸。

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::mpsc;
use std::time::Duration;

use parking_lot::Mutex;
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    MonitorFromPoint, MonitorFromWindow, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, GetDoubleClickTime, VK_CONTROL, VK_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, EnumChildWindows, GetAncestor, GetClassNameW, GetMessageW, GetSystemMetrics,
    GetWindowRect, PostMessageW, PostThreadMessageW, SetWindowsHookExW, UnhookWindowsHookEx,
    WindowFromPoint, GA_ROOT, MSG, MSLLHOOKSTRUCT, SM_CXDOUBLECLK, SM_CYDOUBLECLK, WH_MOUSE_LL,
    WM_LBUTTONDBLCLK, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDBLCLK, WM_MBUTTONDOWN,
    WM_MBUTTONUP, WM_MOUSEHWHEEL, WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_QUIT, WM_RBUTTONDBLCLK,
    WM_RBUTTONDOWN, WM_RBUTTONUP,
};
use windows::Win32::System::Threading::GetCurrentThreadId;

/// 按键状态位（MK_*），与 Win32 输入消息的 wParam 约定一致。
const MK_LBUTTON: u32 = 0x0001;
const MK_RBUTTON: u32 = 0x0002;
const MK_SHIFT: u32 = 0x0004;
const MK_CONTROL: u32 = 0x0008;
const MK_MBUTTON: u32 = 0x0010;

/// 一个可交互 web 壁纸窗口的转发目标（按屏幕注册）。
#[derive(Debug, Clone)]
pub struct MouseTarget {
    pub screen: u32,
    /// 壁纸窗口所在显示器（HMONITOR 原始值）。
    pub monitor: isize,
    /// WebView2 渲染子窗口（Chrome_WidgetWin_0）原始句柄。
    pub hwnd: isize,
}

static TARGETS: Mutex<Vec<MouseTarget>> = Mutex::new(Vec::new());

/// 当前按下的鼠标键（MOVE / 滚轮消息的 wParam 需要）。
static BUTTONS: AtomicU32 = AtomicU32::new(0);

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
pub fn set_target(screen: u32, target: Option<MouseTarget>) {
    let need = {
        let mut targets = TARGETS.lock();
        targets.retain(|t| t.screen != screen);
        if let Some(t) = target {
            log::info!("mouse hook target: screen {screen} hwnd={:#x}", t.hwnd);
            targets.push(t);
        }
        !targets.is_empty()
    };
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

    let pt = info.pt;
    // 光标在普通应用窗口上时不转发（壁纸被遮挡，转发只会造成幽灵点击）
    if !cursor_on_desktop(pt) {
        return;
    }
    let Some(target) = target_at(pt) else {
        return;
    };
    let hwnd = HWND(target.hwnd as *mut _);

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

/// 光标下的根窗口是否为桌面（图标层 / WorkerW）。
fn cursor_on_desktop(pt: POINT) -> bool {
    unsafe {
        let under = WindowFromPoint(pt);
        let root = GetAncestor(under, GA_ROOT);
        let root = if root.is_invalid() { under } else { root };
        let cls = window_class(root);
        cls.eq_ignore_ascii_case("Progman") || cls.eq_ignore_ascii_case("WorkerW")
    }
}

fn target_at(pt: POINT) -> Option<MouseTarget> {
    let monitor = unsafe { MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST) }.0 as isize;
    TARGETS.lock().iter().find(|t| t.monitor == monitor).cloned()
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

fn window_class(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) };
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

/// 窗口所在显示器（HMONITOR 原始值）。
pub fn monitor_of_window(hwnd: isize) -> isize {
    unsafe { MonitorFromWindow(HWND(hwnd as *mut _), MONITOR_DEFAULTTONEAREST) }.0 as isize
}

struct ChildSlots {
    webview: Option<isize>,
    first: Option<isize>,
}

unsafe extern "system" fn child_enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let slots = &mut *(lparam.0 as *mut ChildSlots);
    if window_class(hwnd).eq_ignore_ascii_case("Chrome_WidgetWin_0") {
        if slots.webview.is_none() {
            slots.webview = Some(hwnd.0 as isize);
        }
    } else if slots.first.is_none() {
        slots.first = Some(hwnd.0 as isize);
    }
    true.into()
}

/// 找到 WebView2 的输入子窗口（Chrome_WidgetWin_0；兜底取第一个子窗口）。
pub fn find_webview_child(top: isize) -> Option<isize> {
    let mut slots = ChildSlots {
        webview: None,
        first: None,
    };
    unsafe {
        let _ = EnumChildWindows(
            Some(HWND(top as *mut _)),
            Some(child_enum_proc),
            LPARAM(&mut slots as *mut ChildSlots as isize),
        );
    }
    slots.webview.or(slots.first)
}
