//! 注册表：开机自启（Run 键）、深链协议注册、系统深浅色读取。

use crate::system::wide;
use windows::core::PCWSTR;
use windows::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyW, RegDeleteValueW, RegGetValueW, RegOpenKeyExW, RegSetValueExW,
    HKEY, HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_SZ, RRF_RT_REG_DWORD, RRF_RT_REG_SZ,
};

fn create_key(path: &str) -> Result<HKEY, String> {
    let mut key = HKEY::default();
    let path_w = wide(path);
    let err = unsafe {
        RegCreateKeyW(
            HKEY_CURRENT_USER,
            PCWSTR(path_w.as_ptr()),
            &mut key,
        )
    };
    if err.is_ok() {
        Ok(key)
    } else {
        Err(format!("create key failed: {err:?}"))
    }
}

fn open_key(path: &str, write: bool) -> Option<HKEY> {
    let mut key = HKEY::default();
    let path_w = wide(path);
    let access = if write { KEY_WRITE } else { KEY_READ };
    let err = unsafe {
        RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(path_w.as_ptr()),
            None,
            access,
            &mut key,
        )
    };
    if err.is_ok() {
        Some(key)
    } else {
        None
    }
}

fn read_string(key: HKEY, name: &str) -> Option<String> {
    let name_w = wide(name);
    let mut buf = [0u16; 1024];
    let mut size = (buf.len() * 2) as u32;
    let err = unsafe {
        RegGetValueW(
            key,
            PCWSTR::null(),
            PCWSTR(name_w.as_ptr()),
            RRF_RT_REG_SZ,
            None,
            Some(buf.as_mut_ptr() as _),
            Some(&mut size),
        )
    };
    if err.is_ok() {
        let len = (size as usize / 2).min(buf.len());
        Some(
            String::from_utf16_lossy(&buf[..len])
                .trim_end_matches('\0')
                .to_string(),
        )
    } else {
        None
    }
}

fn read_dword(key: HKEY, name: &str) -> Option<u32> {
    let name_w = wide(name);
    let mut value: u32 = 0;
    let mut size = 4u32;
    let err = unsafe {
        RegGetValueW(
            key,
            PCWSTR::null(),
            PCWSTR(name_w.as_ptr()),
            RRF_RT_REG_DWORD,
            None,
            Some(&mut value as *mut u32 as _),
            Some(&mut size),
        )
    };
    if err.is_ok() {
        Some(value)
    } else {
        None
    }
}

fn set_string(key: HKEY, name: &str, value: &str) -> Result<(), String> {
    let name_w = wide(name);
    let value_w = wide(value);
    let bytes: &[u8] = unsafe {
        std::slice::from_raw_parts(value_w.as_ptr() as *const u8, value_w.len() * 2)
    };
    let err = unsafe {
        RegSetValueExW(key, PCWSTR(name_w.as_ptr()), None, REG_SZ, Some(bytes))
    };
    if err.is_ok() {
        Ok(())
    } else {
        Err(format!("RegSetValueExW failed: {err:?}"))
    }
}

fn set_default_string(key: HKEY, value: &str) -> Result<(), String> {
    let value_w = wide(value);
    let bytes: &[u8] = unsafe {
        std::slice::from_raw_parts(value_w.as_ptr() as *const u8, value_w.len() * 2)
    };
    let err = unsafe { RegSetValueExW(key, PCWSTR::null(), None, REG_SZ, Some(bytes)) };
    if err.is_ok() {
        Ok(())
    } else {
        Err(format!("RegSetValueExW failed: {err:?}"))
    }
}

fn delete_value(key: HKEY, name: &str) {
    let name_w = wide(name);
    unsafe {
        let _ = RegDeleteValueW(key, PCWSTR(name_w.as_ptr()));
    }
}

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";

/// 读取自启命令（None = 未设置）。
pub fn autostart_command(value_name: &str) -> Option<String> {
    open_key(RUN_KEY, false).and_then(|key| {
        let v = read_string(key, value_name);
        unsafe {
            let _ = RegCloseKey(key);
        }
        v
    })
}

pub fn set_autostart(value_name: &str, command: &str) -> Result<(), String> {
    let key = create_key(RUN_KEY)?;
    let r = set_string(key, value_name, command);
    unsafe {
        let _ = RegCloseKey(key);
    }
    r
}

pub fn remove_autostart(value_name: &str) {
    if let Some(key) = open_key(RUN_KEY, true) {
        delete_value(key, value_name);
        unsafe {
            let _ = RegCloseKey(key);
        }
    }
}

/// 读取系统深浅色（true = dark）。
pub fn is_dark_mode() -> bool {
    open_key(
        r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
        false,
    )
    .and_then(|key| {
        let v = read_dword(key, "AppsUseLightTheme");
        unsafe {
            let _ = RegCloseKey(key);
        }
        v
    })
    .map(|light| light == 0)
    .unwrap_or(true)
}

/// 注册 URI scheme（livewallpaper4://）。
pub fn register_uri_scheme(scheme: &str, exe_path: &std::path::Path) -> Result<(), String> {
    let base = format!(r"Software\Classes\{scheme}");

    let key = create_key(&base)?;
    // 默认值 + URL Protocol 标记
    let r = set_default_string(key, &format!("URL:{scheme}"))
        .and_then(|_| set_string(key, "URL Protocol", ""));
    unsafe {
        let _ = RegCloseKey(key);
    }
    r?;

    let cmd_key_path = format!(r"{base}\shell\open\command");
    let key = create_key(&cmd_key_path)?;
    let r = set_default_string(key, &format!("\"{}\" \"%1\"", exe_path.display()));
    unsafe {
        let _ = RegCloseKey(key);
    }
    r
}

/// 查询协议是否已注册。
pub fn uri_scheme_registered(scheme: &str) -> bool {
    open_key(&format!(r"Software\Classes\{scheme}"), false).is_some()
}
