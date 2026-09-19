//! 系统事件：通过一个 message-only 窗口接收
//! 显示器变化（WM_DISPLAYCHANGE）、主题切换（WM_SETTINGCHANGE）与
//! 锁屏/解锁（WM_WTSSSESSION_CHANGE）。

use crate::system::wide;
use parking_lot::Mutex;
use std::sync::mpsc::Sender;
use std::sync::OnceLock;

static FORWARDERS: Mutex<Vec<Sender<SystemEvent>>> = Mutex::new(Vec::new());

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SystemEvent {
    DisplayChanged,
    ThemeChanged { dark: bool },
    SessionLock,
    SessionUnlock,
}

const WM_DISPLAYCHANGE: u32 = 0x007E;
const WM_SETTINGCHANGE: u32 = 0x001A;
const WM_WTSSESSION_CHANGE: u32 = 0x02B1;
const WM_DESTROY: u32 = 0x0002;
const WTS_SESSION_LOCK: u32 = 0x7;
const WTS_SESSION_UNLOCK: u32 = 0x8;
const NOTIFY_FOR_THIS_SESSION: u32 = 0;

fn dispatch(event: SystemEvent) {
    let list = FORWARDERS.lock();
    for tx in list.iter() {
        let _ = tx.send(event);
    }
}

/// 供应用层订阅系统事件。须在 `start` 之后调用。
pub fn subscribe(sender: Sender<SystemEvent>) {
    FORWARDERS.lock().push(sender);
}

/// 启动系统事件监听线程（幂等）。
pub fn start() {
    static STARTED: OnceLock<()> = OnceLock::new();
    if STARTED.set(()).is_err() {
        return;
    }

    std::thread::Builder::new()
        .name("wp4-system-events".into())
        .spawn(|| {
            #[cfg(windows)]
            {
                if let Err(e) = unsafe { create_message_window() } {
                    log::error!("system event window failed: {e}");
                }
            }
        })
        .ok();
}

#[cfg(windows)]
unsafe fn create_message_window() -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::System::RemoteDesktop::WTSRegisterSessionNotification;
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DispatchMessageW, GetMessageW, RegisterClassW, TranslateMessage, MSG,
        WNDCLASSW,
    };

    let class_name = wide("GiantappWallpaper4Events");
    let hinstance = GetModuleHandleW(None).map_err(|e| e.to_string())?;

    let wc = WNDCLASSW {
        lpfnWndProc: Some(wnd_proc),
        hInstance: hinstance.into(),
        lpszClassName: windows::core::PCWSTR(class_name.as_ptr()),
        ..Default::default()
    };
    let atom = RegisterClassW(&wc);
    if atom == 0 {
        return Err("RegisterClassW failed".into());
    }

    // message-only 窗口（不可见，仅收消息）
    let hwnd = CreateWindowExW(
        Default::default(),
        windows::core::PCWSTR(class_name.as_ptr()),
        windows::core::PCWSTR::null(),
        Default::default(),
        0,
        0,
        0,
        0,
        Some(HWND::default()),
        None,
        Some(hinstance.into()),
        None,
    )
    .map_err(|e| e.to_string())?;

    if let Err(e) = WTSRegisterSessionNotification(hwnd, NOTIFY_FOR_THIS_SESSION) {
        log::warn!("WTSRegisterSessionNotification failed: {e}");
    }

    let mut msg = MSG::default();
    while GetMessageW(&mut msg, Some(HWND::default()), 0, 0).as_bool() {
        let _ = TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
    Ok(())
}

#[cfg(windows)]
unsafe extern "system" fn wnd_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::WindowsAndMessaging::{DefWindowProcW, PostQuitMessage};

    #[allow(unreachable_patterns)]
    match msg {
        WM_DISPLAYCHANGE => dispatch(SystemEvent::DisplayChanged),
        WM_SETTINGCHANGE => {
            // lParam 指向变更项名称；"ImmersiveColorSet" 表示深浅色变化
            if lparam.0 != 0 {
                let text = windows::core::PCWSTR(lparam.0 as *const u16)
                    .to_string()
                    .unwrap_or_default();
                if text == "ImmersiveColorSet" {
                    dispatch(SystemEvent::ThemeChanged {
                        dark: crate::system::registry::is_dark_mode(),
                    });
                }
            }
        }
        WM_WTSSESSION_CHANGE => match wparam.0 as u32 {
            WTS_SESSION_LOCK => dispatch(SystemEvent::SessionLock),
            WTS_SESSION_UNLOCK => dispatch(SystemEvent::SessionUnlock),
            _ => {}
        },
        WM_DESTROY => PostQuitMessage(0),
        _ => {}
    }
    let _ = hwnd;
    DefWindowProcW(hwnd, msg, wparam, lparam)
}
