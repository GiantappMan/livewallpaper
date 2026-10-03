//! 内嵌 libmpv 播放器引擎：进程内动态加载 `libmpv-2.dll`（无需构建期链接），
//! 自建 Win32 宿主窗口并经 mpv 的 `wid` 选项交给它作输出——mpv 在宿主窗口内
//! 自建子窗口，走与外部 mpv.exe（`mpv.rs`）完全相同的 vo_gpu/D3D11 管线
//! （含 d3d11va 硬解零拷贝）。
//!
//! `wid` 是 mpv 官方在 Windows 上的窗口内嵌方式（client.h 嵌入章节）；
//! 较新版本移除的 D3D11 render API 从未进上游，不必考虑。
//!
//! 线程模型：mpv client API 线程安全，控制命令（load/暂停/音量）跨线程直调；
//! 事件泵线程持有一个独立 client 句柄（`mpv_create_client`）排空事件队列并
//! 转发 mpv 日志——退出时泵自行 `mpv_destroy`，主句柄的 `terminate_destroy`
//! 按文档语义等待所有 client 分离，天然无并发竞争。
//!
//! 通过 [`player::PlayerFactory`] / [`player::PlayerEngine`] 接入引擎体系，
//! 与外部 mpv 引擎平级，由屏幕管理器统一调度。

use crate::host::EngineHost;
use crate::models::VideoPlayer;
use crate::player::{MediaSource, PlayerConfig, PlayerEngine, PlayerFactory};
use crate::system::workerw;
use anyhow::{anyhow, Context, Result};
use std::ffi::{c_char, c_double, c_int, c_void, CStr, CString};
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicPtr, Ordering};
use std::sync::{Arc, OnceLock};
use tokio::sync::oneshot;
use windows::Win32::Foundation::HINSTANCE;
use windows::Win32::System::LibraryLoader::LOAD_WITH_ALTERED_SEARCH_PATH;

/// GetProcAddress 的原始返回类型（FARPROC 解包 Option 后的函数指针）。
type RawFn = unsafe extern "system" fn() -> isize;

/// 引擎 kind 标识。
pub const LIBMPV_KIND: &str = "libmpv";

/// 宿主窗口类名。
pub const HOST_WINDOW_CLASS: &str = "GiantappLibmpvHost";

// ---------------------------------------------------------------------------
// libmpv C API 动态绑定（client.h 子集，枚举值与上游头文件一致）
// ---------------------------------------------------------------------------

mod event_id {
    pub const SHUTDOWN: i32 = 1;
    pub const LOG_MESSAGE: i32 = 2;
}

/// mpv_log_level（client.h），仅用于日志分级。
mod log_level {
    pub const ERR: i32 = 4;
    pub const WARN: i32 = 3;
}

/// mpv 不透明句柄（client.h 只以指针形式出现）。
#[repr(C)]
struct mpv_handle {
    _opaque: [u8; 0],
}

#[repr(C)]
struct mpv_event {
    event_id: c_int,
    error: c_int,
    reply_userdata: u64,
    data: *mut c_void,
}

#[repr(C)]
struct mpv_event_log_message {
    prefix: *const c_char,
    level: *const c_char,
    text: *const c_char,
    log_level: c_int,
}

type MpvCreate = unsafe extern "C" fn() -> *mut mpv_handle;
type MpvInitialize = unsafe extern "C" fn(*mut mpv_handle) -> c_int;
type MpvTerminateDestroy = unsafe extern "C" fn(*mut mpv_handle);
type MpvDestroy = unsafe extern "C" fn(*mut mpv_handle);
type MpvCreateClient = unsafe extern "C" fn(*mut mpv_handle, *const c_char) -> *mut mpv_handle;
type MpvSetOptionString =
    unsafe extern "C" fn(*mut mpv_handle, *const c_char, *const c_char) -> c_int;
type MpvSetPropertyString =
    unsafe extern "C" fn(*mut mpv_handle, *const c_char, *const c_char) -> c_int;
type MpvGetPropertyString = unsafe extern "C" fn(*mut mpv_handle, *const c_char) -> *mut c_char;
type MpvCommand = unsafe extern "C" fn(*mut mpv_handle, *mut *mut c_char) -> c_int;
type MpvRequestLogMessages = unsafe extern "C" fn(*mut mpv_handle, *const c_char) -> c_int;
type MpvWaitEvent = unsafe extern "C" fn(*mut mpv_handle, c_double) -> *mut mpv_event;
type MpvFree = unsafe extern "C" fn(*mut c_void);
type MpvErrorString = unsafe extern "C" fn(c_int) -> *const c_char;

#[derive(Clone, Copy)]
struct MpvApi {
    create: MpvCreate,
    initialize: MpvInitialize,
    terminate_destroy: MpvTerminateDestroy,
    destroy: MpvDestroy,
    create_client: MpvCreateClient,
    set_option_string: MpvSetOptionString,
    set_property_string: MpvSetPropertyString,
    get_property_string: MpvGetPropertyString,
    command: MpvCommand,
    request_log_messages: MpvRequestLogMessages,
    wait_event: MpvWaitEvent,
    free: MpvFree,
    error_string: MpvErrorString,
}

/// 已加载的 libmpv-2.dll 导出表。有意不 FreeLibrary：DLL 生命周期与进程一致。
static LIB: OnceLock<MpvApi> = OnceLock::new();

/// 加载 `libmpv-2.dll` 并解析所需导出（幂等，首次成功后全局缓存）。
fn load_library(dll_path: &Path) -> Result<&'static MpvApi> {
    if let Some(api) = LIB.get() {
        return Ok(api);
    }
    let api = unsafe { load_library_inner(dll_path)? };
    // 并发加载时以先到者为准，丢失的一方直接复用缓存
    let _ = LIB.set(api);
    Ok(LIB.get().unwrap())
}

/// # Safety
/// `dll_path` 须为合法 DLL 文件路径。
unsafe fn load_library_inner(dll_path: &Path) -> Result<MpvApi> {
    use windows::core::{PCSTR, PCWSTR};
    use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryExW};

    let wide: Vec<u16> = crate::system::wide(&dll_path.to_string_lossy());
    // LOAD_WITH_ALTERED_SEARCH_PATH：依赖 DLL 从自身所在目录解析
    let module = LoadLibraryExW(PCWSTR(wide.as_ptr()), None, LOAD_WITH_ALTERED_SEARCH_PATH)
        .with_context(|| format!("加载 {} 失败", dll_path.display()))?;

    let symbol = |name: &str| -> Result<RawFn> {
        let cname = CString::new(name).unwrap();
        GetProcAddress(module, PCSTR(cname.as_ptr() as *const u8))
            .ok_or_else(|| anyhow!("libmpv-2.dll 缺少导出 {name}"))
    };
    macro_rules! sym {
        ($name:literal) => {
            std::mem::transmute::<RawFn, _>(symbol($name)?)
        };
    }
    Ok(MpvApi {
        create: sym!("mpv_create"),
        initialize: sym!("mpv_initialize"),
        terminate_destroy: sym!("mpv_terminate_destroy"),
        destroy: sym!("mpv_destroy"),
        create_client: sym!("mpv_create_client"),
        set_option_string: sym!("mpv_set_option_string"),
        set_property_string: sym!("mpv_set_property_string"),
        get_property_string: sym!("mpv_get_property_string"),
        command: sym!("mpv_command"),
        request_log_messages: sym!("mpv_request_log_messages"),
        wait_event: sym!("mpv_wait_event"),
        free: sym!("mpv_free"),
        error_string: sym!("mpv_error_string"),
    })
}

// ---------------------------------------------------------------------------
// 引擎实现
// ---------------------------------------------------------------------------

struct LibmpvPlayer {
    /// mpv 主句柄。shutdown/Drop 时 swap 为 null 后销毁，天然防双重释放。
    mpv: Arc<AtomicPtr<mpv_handle>>,
    /// 宿主窗口句柄（原始值；HWND 非 Send，跨线程只传句柄值）。
    hwnd: isize,
    /// 窗口线程存活标记；false 后探活直接判死。
    window_alive: Arc<AtomicBool>,
    /// 独立窗口模式（不嵌 WorkerW）。
    embed_desktop: bool,
    screen: u32,
}

// mpv client API 保证线程安全（除渲染上下文外），跨线程共享句柄安全。
unsafe impl Send for LibmpvPlayer {}
unsafe impl Sync for LibmpvPlayer {}

impl LibmpvPlayer {
    /// 创建实例：窗口线程建宿主窗口 -> 初始化 mpv（wid 指向宿主）-> 加载首文件。
    async fn launch(
        api: &'static MpvApi,
        source: &MediaSource,
        config: &PlayerConfig,
    ) -> Result<Self> {
        let window_alive = Arc::new(AtomicBool::new(true));
        let (tx, rx) = oneshot::channel();
        // 'static 线程边界只传拷贝值（屏幕号）
        let screen = config.screen;
        std::thread::Builder::new()
            .name(format!("{HOST_WINDOW_CLASS}-{screen}"))
            .spawn({
                let window_alive = window_alive.clone();
                move || window_thread(tx, window_alive, screen)
            })
            .context("启动窗口线程失败")?;

        let hwnd = tokio::time::timeout(std::time::Duration::from_secs(5), rx)
            .await
            .map_err(|_| anyhow!("窗口创建超时"))?
            .map_err(|_| anyhow!("窗口线程异常退出"))?
            .ok_or_else(|| anyhow!("宿主窗口创建失败"))?;

        // mpv 初始化 / 首次加载失败时回收窗口线程（否则隐藏窗口与线程永久残留）
        let result = async {
            // 指针经 usize 跨 spawn_blocking 边界（原始指针非 Send）
            let hwdec = config.hardware_decoding;
            let panscan = config.panscan;
            let volume = config.volume;
            let mpv = tokio::task::spawn_blocking(move || unsafe {
                init_mpv(api, hwnd, hwdec, panscan, volume).map(|p| p as usize)
            })
            .await
            .map_err(|e| anyhow!("mpv 初始化任务失败: {e}"))?
            .map(|p| p as *mut mpv_handle)?;

            let player = Self {
                mpv: Arc::new(AtomicPtr::new(mpv)),
                hwnd,
                window_alive,
                embed_desktop: config.embed_desktop,
                screen: config.screen,
            };
            player.load(source, config).await?;
            log::info!(
                "libmpv[{}] launched, hwnd={hwnd:#x}, embed={}",
                config.screen,
                config.embed_desktop
            );
            Ok(player)
        }
        .await;
        if result.is_err() {
            post_wm_close(hwnd);
        }
        result
    }

    fn handle(&self) -> *mut mpv_handle {
        self.mpv.load(Ordering::SeqCst)
    }

    fn set_property(&self, name: &str, value: &str) -> Result<()> {
        let mpv = self.handle();
        if mpv.is_null() {
            return Err(anyhow!("引擎已退出"));
        }
        let api = LIB.get().expect("libmpv loaded");
        let cname = CString::new(name).unwrap();
        let cvalue = CString::new(value).unwrap();
        let err = unsafe { (api.set_property_string)(mpv, cname.as_ptr(), cvalue.as_ptr()) };
        if err < 0 {
            Err(anyhow!("set {name}={value} 失败: {}", error_text(api, err)))
        } else {
            Ok(())
        }
    }

    fn get_property_string(&self, name: &str) -> Option<String> {
        let mpv = self.handle();
        if mpv.is_null() {
            return None;
        }
        let api = LIB.get()?;
        let cname = CString::new(name).ok()?;
        let ptr = unsafe { (api.get_property_string)(mpv, cname.as_ptr()) };
        if ptr.is_null() {
            return None;
        }
        let value = unsafe { CStr::from_ptr(ptr) }.to_string_lossy().into_owned();
        unsafe { (api.free)(ptr.cast()) };
        Some(value)
    }

    fn command(&self, args: &[&str]) -> Result<()> {
        let mpv = self.handle();
        if mpv.is_null() {
            return Err(anyhow!("引擎已退出"));
        }
        let api = LIB.get().expect("libmpv loaded");
        let cargs: Vec<CString> = args
            .iter()
            .map(|s| CString::new(*s).map_err(|e| anyhow!("bad arg {s:?}: {e}")))
            .collect::<Result<_>>()?;
        let mut ptrs: Vec<*mut c_char> = cargs
            .iter()
            .map(|s| s.as_ptr().cast_mut())
            .chain(std::iter::once(std::ptr::null_mut()))
            .collect();
        let err = unsafe { (api.command)(mpv, ptrs.as_mut_ptr()) };
        if err < 0 {
            Err(anyhow!("command {args:?} 失败: {}", error_text(api, err)))
        } else {
            Ok(())
        }
    }

    /// 释放 mpv 主句柄（幂等）。terminate_destroy 按文档等待事件泵句柄分离。
    fn teardown(&self) {
        let mpv = self.mpv.swap(std::ptr::null_mut(), Ordering::SeqCst);
        if mpv.is_null() {
            return;
        }
        let Some(api) = LIB.get() else { return };
        unsafe { (api.terminate_destroy)(mpv) };
    }

    /// 请求窗口线程退出消息循环（窗口由线程自毁）。
    fn quit_window(&self) {
        post_wm_close(self.hwnd);
    }
}

/// 向宿主窗口投递 WM_CLOSE（独立函数：launch 失败回收窗口线程时实例尚不存在）。
fn post_wm_close(hwnd: isize) {
    if hwnd == 0 {
        return;
    }
    unsafe {
        use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{PostMessageW, WM_CLOSE};
        let _ = PostMessageW(Some(HWND(hwnd as *mut _)), WM_CLOSE, WPARAM(0), LPARAM(0));
    }
}

impl Drop for LibmpvPlayer {
    fn drop(&mut self) {
        // 兜底：未经 shutdown 的丢弃路径（错误回滚 / 进程退出）同步清理。
        self.teardown();
        self.quit_window();
    }
}

#[async_trait::async_trait]
impl PlayerEngine for LibmpvPlayer {
    fn kind(&self) -> &'static str {
        LIBMPV_KIND
    }

    fn embed_desktop(&self) -> bool {
        self.embed_desktop
    }

    /// 原地 loadfile 换源（mpv 保持初始化状态，切换近乎即时）。
    async fn load(&self, source: &MediaSource, config: &PlayerConfig) -> Result<()> {
        if source.path.as_os_str().is_empty() {
            return Err(anyhow!("libmpv 引擎需要本地文件路径"));
        }
        let path = source.path.display().to_string();
        self.command(&["loadfile", &path, "replace"])?;
        self.set_property("panscan", if config.panscan { "1.0" } else { "0.0" })?;
        Ok(())
    }

    /// 嵌入模式：宿主窗口挂到桌面 WorkerW 层（mpv 子窗口随父窗口走）；
    /// 独立窗口模式：居中显示为常规窗口（调试 / 预览）。
    /// SetParent 重试与 WorkerW 枚举可能耗时数秒，放线程池避免拖住 tokio worker。
    async fn attach_to_desktop(&self) -> Result<()> {
        let hwnd = self.hwnd;
        let embed = self.embed_desktop;
        let screen = self.screen;
        tokio::task::spawn_blocking(move || {
            let hwnd = windows::Win32::Foundation::HWND(hwnd as *mut _);
            if embed {
                if workerw::send_handle_to_desktop_bottom(hwnd, screen) {
                    Ok(())
                } else {
                    Err(anyhow!("WorkerW 不可用"))
                }
            } else {
                unsafe {
                    use windows::Win32::UI::WindowsAndMessaging::*;
                    // 38% 屏幕大小居中（与外部 mpv --autofit=38% 的调试窗口一致）
                    let (sw, sh) = (GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN));
                    let (w, h) = (sw * 38 / 100, sh * 38 / 100);
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_TOP),
                        (sw - w) / 2,
                        (sh - h) / 2,
                        w,
                        h,
                        SWP_NOZORDER | SWP_SHOWWINDOW,
                    );
                    let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
                }
                Ok(())
            }
        })
        .await
        .map_err(|e| anyhow!("attach 任务失败: {e}"))?
    }

    async fn set_paused(&self, paused: bool) -> Result<()> {
        self.set_property("pause", if paused { "yes" } else { "no" })
    }

    async fn set_volume(&self, volume: u32) -> Result<()> {
        self.set_property("volume", &volume.to_string())
    }

    async fn set_panscan(&self, value: f64) -> Result<()> {
        self.set_property("panscan", &value.to_string())
    }

    async fn seek_percent(&self, percent: f64) -> Result<()> {
        self.set_property("percent-pos", &percent.to_string())
    }

    async fn time_pos(&self) -> (f64, f64) {
        let parse = |name: &str| -> f64 {
            self.get_property_string(name)
                .and_then(|s| s.parse().ok())
                .unwrap_or(-1.0)
        };
        (parse("duration"), parse("time-pos"))
    }

    async fn is_alive(&self) -> bool {
        // 探活用核心常驻属性（mpv-version）：filename 在文件加载期不可用，
        // 会把"启动中/换源中"误判为死亡（管理器会因此触发不必要的自愈重启）
        self.window_alive.load(Ordering::SeqCst)
            && !self.handle().is_null()
            && self.get_property_string("mpv-version").is_some()
    }

    /// 进程内引擎随应用退出而消亡，不支持跨启动接管。
    async fn snapshot(&self) -> Option<serde_json::Value> {
        None
    }

    /// 释放 mpv（阻塞操作放线程池）并请求窗口线程退出。
    async fn shutdown(&self) {
        let player = LibmpvPlayer {
            mpv: self.mpv.clone(),
            hwnd: self.hwnd,
            window_alive: self.window_alive.clone(),
            embed_desktop: self.embed_desktop,
            screen: self.screen,
        };
        let _ = tokio::task::spawn_blocking(move || {
            player.teardown();
            player.quit_window();
        })
        .await;
    }
}

/// libmpv 播放器工厂：按 [`EngineHost::libmpv_path`] 定位 DLL。
pub struct LibmpvFactory {
    host: Arc<dyn EngineHost>,
}

impl LibmpvFactory {
    pub fn new(host: Arc<dyn EngineHost>) -> Self {
        Self { host }
    }
}

#[async_trait::async_trait]
impl PlayerFactory for LibmpvFactory {
    fn kind(&self) -> &'static str {
        LIBMPV_KIND
    }

    fn serves(&self) -> &'static [VideoPlayer] {
        &[VideoPlayer::Libmpv]
    }

    fn is_available(&self) -> bool {
        self.host.libmpv_path().exists()
    }

    async fn create(
        &self,
        source: &MediaSource,
        config: &PlayerConfig,
    ) -> Result<Arc<dyn PlayerEngine>> {
        let dll = self.host.libmpv_path();
        if !dll.exists() {
            return Err(anyhow!("libmpv-2.dll 不存在: {}", dll.display()));
        }
        let api = load_library(&dll)?;
        let player = LibmpvPlayer::launch(api, source, config).await?;
        Ok(Arc::new(player))
    }

    async fn restore(
        &self,
        _data: &serde_json::Value,
        _screen: u32,
    ) -> Result<Arc<dyn PlayerEngine>> {
        Err(anyhow!("libmpv 引擎不支持跨启动接管"))
    }
}

// ---------------------------------------------------------------------------
// 初始化 / 窗口线程 / 事件泵
// ---------------------------------------------------------------------------

/// mpv_create -> 预设选项（wid 指向宿主窗口等）-> mpv_initialize -> 开启事件泵。
///
/// # Safety
/// `api` 须已成功加载，`hwnd` 须为有效宿主窗口。
unsafe fn init_mpv(
    api: &MpvApi,
    hwnd: isize,
    hardware_decoding: bool,
    panscan: bool,
    volume: u32,
) -> Result<*mut mpv_handle> {
    let mpv = (api.create)();
    if mpv.is_null() {
        return Err(anyhow!("mpv_create 失败"));
    }
    let set_opt = |name: &str, value: &str| -> Result<()> {
        let cname = CString::new(name).unwrap();
        let cvalue = CString::new(value).unwrap();
        let err = (api.set_option_string)(mpv, cname.as_ptr(), cvalue.as_ptr());
        if err < 0 {
            Err(anyhow!("set option {name}={value} 失败: {}", error_text(api, err)))
        } else {
            Ok(())
        }
    };
    // wid：本引擎的嵌入核心。mpv 自建子窗口输出到宿主窗口；
    // 文档要求句柄按 uint32 传入（Windows 句柄均为 32 位）。
    set_opt("wid", &(hwnd as u32).to_string())?;
    set_opt("hwdec", if hardware_decoding { "auto-safe" } else { "no" })?;
    set_opt("panscan", if panscan { "1.0" } else { "0.0" })?;
    set_opt("keepaspect", "yes")?;
    set_opt("volume", &volume.to_string())?;
    // 单文件循环：壁纸语义（与外部 mpv 引擎 --loop-file=inf 一致）
    set_opt("loop-file", "inf")?;
    // 壁纸不应阻止屏保；不吃键盘输入、无屏上控件
    set_opt("stop-screensaver", "no")?;
    set_opt("input-default-bindings", "no")?;
    set_opt("input-vo-keyboard", "no")?;
    set_opt("osc", "no")?;
    set_opt("osd-level", "0")?;
    // 不读用户配置（%APPDATA%/mpv），行为与外部 mpv.exe 引擎一致
    set_opt("config", "no")?;

    let err = (api.initialize)(mpv);
    if err < 0 {
        (api.terminate_destroy)(mpv);
        return Err(anyhow!("mpv_initialize 失败: {}", error_text(api, err)));
    }
    (api.request_log_messages)(mpv, c"warn".as_ptr());
    spawn_event_pump(api, mpv);
    Ok(mpv)
}

/// 宿主窗口线程：创建隐藏窗口、回传 HWND，跑消息循环直到退出后自毁窗口。
fn window_thread(ready_tx: oneshot::Sender<Option<isize>>, window_alive: Arc<AtomicBool>, screen: u32) {
    match create_host_window(screen) {
        Ok(hwnd) => {
            let _ = ready_tx.send(Some(hwnd.0 as isize));
            run_message_loop(hwnd);
            window_alive.store(false, Ordering::SeqCst);
            unsafe {
                let _ = windows::Win32::UI::WindowsAndMessaging::DestroyWindow(hwnd);
            }
        }
        Err(e) => {
            log::error!("libmpv 宿主窗口创建失败: {e:#}");
            window_alive.store(false, Ordering::SeqCst);
            let _ = ready_tx.send(None);
        }
    }
}

/// 创建隐藏的无边框宿主窗口（mpv 子窗口稍后覆盖其整个客户区）。
fn create_host_window(screen: u32) -> Result<windows::Win32::Foundation::HWND> {
    use windows::core::PCWSTR;
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::*;

    // 类全局注册一次；多屏实例共用类名
    static REGISTERED: OnceLock<()> = OnceLock::new();
    REGISTERED.get_or_init(|| unsafe {
        let wc = WNDCLASSEXW {
            cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
            lpfnWndProc: Some(host_wnd_proc),
            hInstance: HINSTANCE(GetModuleHandleW(None).unwrap_or_default().0),
            lpszClassName: PCWSTR(HOST_WINDOW_CLASS_W.as_ptr()),
            ..Default::default()
        };
        let _ = RegisterClassExW(&wc);
    });

    // 初始尺寸取目标屏幕（嵌入前 mpv 需要合理窗口尺寸出画面）；
    // attach 时 WorkerW 层会重新定位。
    let (w, h) = crate::system::screens::screen_bounds(screen)
        .map(|(_, _, w, h)| (w, h))
        .unwrap_or((960, 540));
    let hwnd = unsafe {
        CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            PCWSTR(HOST_WINDOW_CLASS_W.as_ptr()),
            windows::core::w!("GiantappWallpaper"),
            WS_POPUP,
            0,
            0,
            w,
            h,
            None,
            None,
            Some(HINSTANCE(GetModuleHandleW(None).unwrap_or_default().0)),
            None,
        )
    }
    .map_err(|e| anyhow!("CreateWindowExW 失败: {e}"))?;
    Ok(hwnd)
}

/// NUL 结尾的类名（UTF-16），注册与创建共用。
const HOST_WINDOW_CLASS_W: &[u16] = &make_class_name();

const fn make_class_name() -> [u16; HOST_WINDOW_CLASS.len() + 1] {
    let src = HOST_WINDOW_CLASS.as_bytes();
    let mut out = [0u16; HOST_WINDOW_CLASS.len() + 1];
    let mut i = 0;
    while i < src.len() {
        out[i] = src[i] as u16;
        i += 1;
    }
    out
}

/// 宿主窗口过程：吞背景擦除（mpv 重配时防闪）、WM_CLOSE 触发退出。
unsafe extern "system" fn host_wnd_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::WindowsAndMessaging::{
        DefWindowProcW, PostQuitMessage, WM_CLOSE, WM_ERASEBKGND,
    };
    match msg {
        WM_ERASEBKGND => windows::Win32::Foundation::LRESULT(1),
        WM_CLOSE => {
            PostQuitMessage(0);
            windows::Win32::Foundation::LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// 标准消息循环，WM_QUIT 返回。
fn run_message_loop(hwnd: windows::Win32::Foundation::HWND) {
    use windows::Win32::UI::WindowsAndMessaging::{DispatchMessageW, GetMessageW, TranslateMessage, MSG};
    let mut msg = MSG::default();
    unsafe {
        loop {
            // GetMessageW 返回 BOOL：0 = WM_QUIT，-1 = 错误（窗口意外销毁）
            let r = GetMessageW(&mut msg, Some(hwnd), 0, 0).0;
            if r == 0 || r == -1 {
                return;
            }
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

/// 事件泵线程：持有独立 client 句柄排空事件队列并转发 mpv 日志。
/// 无人读事件时队列会无限增长，因此泵与主句柄同生命周期；
/// 收到 SHUTDOWN 后自行销毁泵句柄退出（主句柄的 terminate_destroy
/// 会等它分离，无并发竞争）。
fn spawn_event_pump(api: &MpvApi, mpv: *mut mpv_handle) {
    let client_name = CString::new("giantapp-pump").unwrap();
    let pump = unsafe { (api.create_client)(mpv, client_name.as_ptr()) };
    if pump.is_null() {
        log::warn!("libmpv 事件泵句柄创建失败，mpv 日志不可用");
        return;
    }
    // 日志订阅按 client 句柄生效：必须在泵句柄上请求，
    // 主句柄的订阅不会转发到泵（否则泵永远收不到 mpv 日志）
    let log_level = CString::new("warn").unwrap();
    unsafe { (api.request_log_messages)(pump, log_level.as_ptr()) };
    let api = *api;
    // 句柄以 usize 过线程边界（原始指针非 Send）
    let pump_addr = pump as usize;
    let _ = std::thread::Builder::new().name("libmpv-pump".into()).spawn(move || unsafe {
        let pump = pump_addr as *mut mpv_handle;
        loop {
            let ev = (api.wait_event)(pump, 10.0);
            if ev.is_null() {
                continue;
            }
            match (*ev).event_id {
                event_id::SHUTDOWN => break,
                event_id::LOG_MESSAGE => {
                    let data = (*ev).data as *const mpv_event_log_message;
                    if data.is_null() {
                        continue;
                    }
                    let prefix = CStr::from_ptr((*data).prefix).to_string_lossy();
                    let text = CStr::from_ptr((*data).text).to_string_lossy();
                    let text = text.trim_end();
                    match (*data).log_level {
                        log_level::ERR => log::error!("libmpv [{prefix}] {text}"),
                        log_level::WARN => log::warn!("libmpv [{prefix}] {text}"),
                        _ => log::info!("libmpv [{prefix}] {text}"),
                    }
                }
                _ => {}
            }
        }
        (api.destroy)(pump);
    });
}

fn error_text(api: &MpvApi, err: c_int) -> String {
    unsafe { CStr::from_ptr((api.error_string)(err)) }
        .to_string_lossy()
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::player::PlayerConfig;
    use std::path::PathBuf;
    use std::sync::Once;

    /// 测试日志转发（mpv 事件泵经 log crate 输出，测试需装 logger 才可见）。
    static LOG_INIT: Once = Once::new();
    fn install_test_logger() {
        LOG_INIT.call_once(|| {
            struct Print;
            impl log::Log for Print {
                fn enabled(&self, meta: &log::Metadata) -> bool {
                    meta.level() <= log::Level::Warn
                }
                fn log(&self, record: &log::Record) {
                    eprintln!("[mpv-test {}] {}", record.level(), record.args());
                }
                fn flush(&self) {}
            }
            let _ = log::set_boxed_logger(Box::new(Print));
            log::set_max_level(log::LevelFilter::Info);
        });
    }

    /// 测试用 DLL 定位：MPV_TEST_DLL 环境变量优先，其次开发树 assets。
    fn test_dll() -> Option<PathBuf> {
        if let Some(p) = std::env::var_os("MPV_TEST_DLL") {
            return Some(PathBuf::from(p));
        }
        // 开发树 assets 在仓库 src-tauri/ 下（本 crate 在 crates/ 子目录，回退两级）
        let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../assets/players/libmpv/libmpv-2.dll");
        dev.exists().then_some(dev)
    }

    fn test_config() -> PlayerConfig {
        PlayerConfig {
            screen: 0,
            volume: 0, // 测试静音
            panscan: false,
            hardware_decoding: false,
            mouse_events: false,
            embed_desktop: false,
        }
    }

    /// 端到端冒烟：加载 DLL -> 创建实例 -> 播放 lavfi 测试源 -> 探活 / 进度 /
    /// 暂停恢复 -> 关闭。窗口全程隐藏（不 attach），默认忽略：
    /// 需要真实 libmpv-2.dll（MPV_TEST_DLL 或开发树 assets/players/libmpv/）。
    #[tokio::test]
    #[ignore = "需要真实 libmpv-2.dll（MPV_TEST_DLL 或 assets/players/libmpv/）"]
    async fn libmpv_end_to_end_playback() {
        install_test_logger();
        let Some(dll) = test_dll() else {
            eprintln!("未找到 libmpv-2.dll（可设 MPV_TEST_DLL），跳过");
            return;
        };
        let api = load_library(&dll).expect("load libmpv");
        // lavfi 内置测试源：无需真实媒体文件（shinchiro 构建带 ffmpeg 滤镜）；
        // 单滤镜多参数用 ':' 分隔（',' 是滤镜链分隔符，会被 lavfi 拒绝）
        let source =
            MediaSource::from_path("av://lavfi:testsrc2=duration=10:size=320x240:rate=30");
        let player = LibmpvPlayer::launch(api, &source, &test_config())
            .await
            .expect("launch libmpv player");

        assert!(player.is_alive().await, "实例应存活");

        // 进度推进（最多等 5s）；失败先转储核心状态再断言
        let mut started = false;
        for _ in 0..50 {
            let (_, pos) = player.time_pos().await;
            if pos > 0.2 {
                started = true;
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
        if !started {
            for p in ["path", "idle-active", "eof-reached", "time-pos", "duration", "pause"] {
                eprintln!("diag {p} = {:?}", player.get_property_string(p));
            }
        }
        assert!(started, "播放进度应推进（5s 内 time-pos 未超过 0.2）");

        // 暂停后进度冻结
        player.set_paused(true).await.expect("pause");
        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        let (_, p1) = player.time_pos().await;
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        let (_, p2) = player.time_pos().await;
        assert!((p1 - p2).abs() < 0.01, "暂停后进度不应推进（{p1} -> {p2}）");
        player.set_paused(false).await.expect("resume");

        player.shutdown().await;
        assert!(!player.is_alive().await, "shutdown 后应判死");
    }
}
