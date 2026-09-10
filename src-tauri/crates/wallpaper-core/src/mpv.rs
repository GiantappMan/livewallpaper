//! mpv 播放器引擎：外部 mpv.exe 进程 + 命名管道 JSON IPC。
//! 与 v3 相同的启动参数与命令集（get_property / set_property / loadlist /
//! loadfile / quit），请求-响应按 request_id 匹配，串行化发送（低频控制命令足够）。
//!
//! 通过 [`player::PlayerFactory`] / [`player::PlayerEngine`] 接入引擎体系。

use crate::host::EngineHost;
use crate::models::VideoPlayer;
use crate::player::{MediaSource, PlayerConfig, PlayerEngine, PlayerFactory};
use crate::system::workerw;
use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::windows::named_pipe::ClientOptions;
use tokio::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MpvSnapshot {
    pub ipc_server_name: String,
    pub pid: u32,
    pub process_name: String,
}

/// mpv 窗口类名。
pub const MPV_WINDOW_CLASS: &str = "mpv";

/// 引擎 kind 标识。
pub const MPV_KIND: &str = "mpv";

struct Ipc {
    inner: Mutex<IpcConn>,
}

struct IpcConn {
    writer: tokio::io::WriteHalf<tokio::net::windows::named_pipe::NamedPipeClient>,
    reader: lines::LineReader,
    next_id: u64,
}

/// 最小化的行读取器，允许在超时后重建（超时视为连接损坏）。
mod lines {
    use super::*;
    pub struct LineReader {
        pub buf: BufReader<tokio::io::ReadHalf<tokio::net::windows::named_pipe::NamedPipeClient>>,
    }
}

pub struct MpvPlayer {
    pipe_full_name: String,
    ipc: Ipc,
    child: Mutex<Option<tokio::process::Child>>,
    /// --playlist 临时文件（load 换源时原地重写）。
    playlist_file: PathBuf,
    /// 接管实例时来自快照的 pid（子进程句柄为空，窗口查找用）。
    pid_hint: u32,
    pub screen: u32,
}

impl MpvPlayer {
    /// 启动 mpv 并连接 IPC。`playlist_file` 为 mpv --playlist 的临时文件。
    pub async fn launch(mpv_exe: &Path, playlist_file: PathBuf, config: &PlayerConfig) -> Result<Self> {
        let pipe_short = format!("mpv{}", uuid::Uuid::new_v4());
        let pipe_full_name = format!(r"\\.\pipe\{pipe_short}");
        let playlist_arg = format!("--playlist={}", playlist_file.display());

        let mut cmd = tokio::process::Command::new(mpv_exe);
        let log_file = playlist_file.with_extension("mpv.log");
        let args: Vec<String> = vec![
            playlist_arg,
            format!("--log-file={}", log_file.display()),
            "--stop-screensaver=no".into(),
            if config.hardware_decoding {
                "--hwdec=auto-safe".into()
            } else {
                "--hwdec=no".into()
            },
            if config.panscan {
                "--panscan=1.0".into()
            } else {
                "--panscan=0.0".into()
            },
            "--keepaspect=yes".into(),
            format!("--input-ipc-server={pipe_short}"),
            // 单文件播放列表用文件循环：规避 mpv 在播放列表 EOF 时偶发退出的 bug
            "--loop-file=inf".into(),
            "--loop-playlist=inf".into(),
            "--window-minimized=yes".into(),
            "--no-osc".into(),
            "--geometry=-10000:-10000".into(),
            "--no-border".into(),
            format!("--volume={}", config.volume),
            "--no-input-default-bindings".into(),
            "--no-terminal".into(),
        ];
        cmd.args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
        set_no_window(&mut cmd);

        let child = cmd
            .spawn()
            .with_context(|| format!("启动 mpv 失败: {}", mpv_exe.display()))?;
        let pid = child.id().unwrap_or(0);

        let player = Self {
            ipc: Ipc {
                inner: Mutex::new(Self::connect(&pipe_full_name).await?),
            },
            pipe_full_name,
            child: Mutex::new(Some(child)),
            playlist_file,
            pid_hint: 0,
            screen: config.screen,
        };

        log::info!("mpv[{}] launched, pid={pid}", config.screen);
        Ok(player)
    }

    /// 通过快照接管仍在运行的 mpv（应用崩溃/强杀后重启的场景）。
    pub async fn adopt(snapshot: &MpvSnapshot, screen: u32) -> Result<Self> {
        let full = if snapshot.ipc_server_name.starts_with(r"\\.\pipe\") {
            snapshot.ipc_server_name.clone()
        } else {
            format!(r"\\.\pipe\{}", snapshot.ipc_server_name)
        };
        let player = Self {
            pipe_full_name: full,
            ipc: Ipc {
                inner: Mutex::new(Self::connect(&snapshot.ipc_server_name).await?),
            },
            child: Mutex::new(None),
            playlist_file: PathBuf::new(),
            pid_hint: snapshot.pid,
            screen,
        };
        log::info!("mpv[{screen}] adopted, pid={}", snapshot.pid);
        Ok(player)
    }

    fn normalize_pipe_name(name: &str) -> String {
        if name.starts_with(r"\\.\pipe\") {
            name.to_string()
        } else {
            format!(r"\\.\pipe\{name}")
        }
    }

    async fn connect(pipe_name: &str) -> Result<IpcConn> {
        let full = Self::normalize_pipe_name(pipe_name);

        // 等待 mpv 创建管道（最长 10s）
        let mut client = None;
        for _ in 0..100 {
            match ClientOptions::new().open(&full) {
                Ok(c) => {
                    client = Some(c);
                    break;
                }
                Err(e)
                    if e.kind() == std::io::ErrorKind::NotFound
                        || e.raw_os_error() == Some(231)
                        || e.raw_os_error() == Some(5) =>
                {
                    // NOT_FOUND / PIPE_BUSY / ACCESS_DENIED：mpv 尚未就绪
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
                Err(e) => return Err(anyhow!("connect mpv pipe failed: {e}")),
            }
        }
        let client = client.ok_or_else(|| anyhow!("mpv pipe connect timeout"))?;

        let (reader, writer) = tokio::io::split(client);
        Ok(IpcConn {
            writer,
            reader: lines::LineReader {
                buf: BufReader::new(reader),
            },
            next_id: 1,
        })
    }

    pub async fn request(&self, command: Value) -> Result<Value> {
        let mut conn = self.ipc.inner.lock().await;
        let id = conn.next_id;
        conn.next_id += 1;

        // request_id 必须是整数（mpv 新版已弃用字符串形式）
        let payload = json!({"command": command, "request_id": id});
        let mut bytes = serde_json::to_string(&payload)?.into_bytes();
        bytes.push(b'\n');

        if let Err(e) = conn.writer.write_all(&bytes).await {
            return Err(anyhow!("mpv write failed: {e}"));
        }
        let _ = conn.writer.flush().await;

        // 读取响应（跳过事件行），5s 超时后标记连接损坏
        let mut line = String::new();
        loop {
            line.clear();
            let read = tokio::time::timeout(
                std::time::Duration::from_secs(5),
                conn.reader.buf.read_line(&mut line),
            )
            .await;
            match read {
                Ok(Ok(0)) => return Err(anyhow!("mpv ipc closed")),
                Ok(Ok(_)) => {}
                Ok(Err(e)) => return Err(anyhow!("mpv read failed: {e}")),
                Err(_) => return Err(anyhow!("mpv ipc timeout")),
            }

            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            let resp_id = value
                .get("request_id")
                .and_then(|v| v.as_u64());
            if resp_id != Some(conn.next_id.wrapping_sub(1)) {
                continue; // 事件或错位响应（按发起顺序串行匹配）
            }
            return match value.get("error").and_then(|v| v.as_str()) {
                Some("success") => Ok(value.get("data").cloned().unwrap_or(Value::Null)),
                Some(err) => Err(anyhow!("mpv: {err}")),
                None => Ok(Value::Null),
            };
        }
    }

    pub async fn get_property(&self, name: &str) -> Result<Value> {
        self.request(json!(["get_property", name])).await
    }

    pub async fn get_property_f64(&self, name: &str) -> Result<f64> {
        self.get_property(name)
            .await
            .ok()
            .and_then(|v| v.as_f64())
            .context(format!("no property {name}"))
    }

    pub async fn set_property(&self, name: &str, value: Value) -> Result<()> {
        self.request(json!(["set_property", name, value]))
            .await
            .map(|_| ())
    }

    async fn loadlist(&self, path: &Path) -> Result<()> {
        self.request(json!(["loadlist", path.display().to_string(), "replace"]))
            .await
            .map(|_| ())
    }

    async fn loadfile(&self, path: &Path) -> Result<()> {
        self.request(json!(["loadfile", path.display().to_string(), "replace"]))
            .await
            .map(|_| ())
    }

    /// (duration, position)，不可用时为 -1。
    pub async fn time_pos(&self) -> (f64, f64) {
        let duration = self.get_property_f64("duration").await.unwrap_or(-1.0);
        let position = self.get_property_f64("time-pos").await.unwrap_or(-1.0);
        (duration, position)
    }

    pub async fn playlist_pos(&self) -> Result<u64> {
        self.get_property_f64("playlist-pos")
            .await
            .map(|v| v as u64)
    }

    pub async fn pid(&self) -> u32 {
        let child = self.child.lock().await;
        child
            .as_ref()
            .and_then(|c| c.id())
            .unwrap_or(self.pid_hint)
    }

    /// 优雅退出：quit -> 等待 -> kill。
    pub async fn shutdown(&self) {
        let _ = self.request(json!(["quit"])).await;
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        self.kill().await;
    }

    pub async fn kill(&self) {
        let mut child = self.child.lock().await;
        if let Some(child) = child.as_mut() {
            let _ = child.start_kill();
            let _ = tokio::time::timeout(std::time::Duration::from_secs(1), child.wait()).await;
        }
    }
}

#[async_trait::async_trait]
impl PlayerEngine for MpvPlayer {
    fn kind(&self) -> &'static str {
        MPV_KIND
    }

    /// 原地重写播放列表临时文件并 loadlist 换源（进程保持存活，切换近乎即时）。
    async fn load(&self, source: &MediaSource) -> Result<()> {
        if self.playlist_file.as_os_str().is_empty() {
            // 接管的实例没有自己的临时文件，退回 loadfile 单文件直放
            return self.loadfile(&source.path).await;
        }
        write_playlist_file(&self.playlist_file, source)?;
        self.loadlist(&self.playlist_file).await
    }

    /// 等待 mpv 主窗口出现并 SetParent 到桌面 WorkerW 层。
    async fn attach_to_desktop(&self) -> Result<()> {
        let pid = self.pid().await;
        let hwnd_raw = wait_window(pid).await?;
        // HWND 非 Send，跨线程只传原始句柄值
        let hwnd = windows::Win32::Foundation::HWND(hwnd_raw as *mut _);
        if workerw::send_handle_to_desktop_bottom(hwnd, self.screen) {
            Ok(())
        } else {
            Err(anyhow!("WorkerW 不可用"))
        }
    }

    async fn set_paused(&self, paused: bool) -> Result<()> {
        self.set_property("pause", json!(paused)).await
    }

    async fn set_volume(&self, volume: u32) -> Result<()> {
        self.set_property("volume", json!(volume)).await
    }

    async fn set_panscan(&self, value: f64) -> Result<()> {
        self.set_property("panscan", json!(value)).await
    }

    async fn seek_percent(&self, percent: f64) -> Result<()> {
        self.set_property("percent-pos", json!(percent)).await
    }

    async fn time_pos(&self) -> (f64, f64) {
        MpvPlayer::time_pos(self).await
    }

    async fn is_alive(&self) -> bool {
        matches!(
            tokio::time::timeout(
                std::time::Duration::from_secs(2),
                self.get_property("filename")
            )
            .await,
            Ok(Ok(_))
        )
    }

    async fn snapshot(&self) -> Option<Value> {
        let pid = self.pid().await;
        if pid == 0 {
            return None; // 接管的实例，无需再快照（原快照仍有效）
        }
        let snap = MpvSnapshot {
            ipc_server_name: self.pipe_full_name.clone(),
            pid,
            process_name: "mpv".into(),
        };
        serde_json::to_value(snap).ok()
    }

    async fn shutdown(&self) {
        MpvPlayer::shutdown(self).await
    }
}

/// mpv 播放器工厂：定位 mpv.exe、管理 --playlist 临时文件。
pub struct MpvFactory {
    host: Arc<dyn EngineHost>,
    dirs: crate::dirs::AppDirs,
}

impl MpvFactory {
    pub fn new(host: Arc<dyn EngineHost>, dirs: crate::dirs::AppDirs) -> Self {
        Self { host, dirs }
    }
}

#[async_trait::async_trait]
impl PlayerFactory for MpvFactory {
    fn kind(&self) -> &'static str {
        MPV_KIND
    }

    fn serves(&self) -> &'static [VideoPlayer] {
        &[VideoPlayer::Mpv]
    }

    fn is_available(&self) -> bool {
        self.host.mpv_path().exists()
    }

    async fn create(&self, source: &MediaSource, config: &PlayerConfig) -> Result<Arc<dyn PlayerEngine>> {
        let mpv_exe = self.host.mpv_path();
        if !mpv_exe.exists() {
            return Err(anyhow!("mpv.exe 不存在"));
        }
        let list = self.dirs.playlist_tmp_file(config.screen);
        write_playlist_file(&list, source)?;
        let player = MpvPlayer::launch(&mpv_exe, list, config).await?;
        Ok(Arc::new(player))
    }

    async fn restore(&self, data: &Value, screen: u32) -> Result<Arc<dyn PlayerEngine>> {
        let snapshot: MpvSnapshot =
            serde_json::from_value(data.clone()).context("mpv 快照反序列化失败")?;
        let player = MpvPlayer::adopt(&snapshot, screen).await?;
        Ok(Arc::new(player))
    }
}

/// 把播放源写为 mpv --playlist 文件（当前为单文件，mpv 侧以文件循环播放）。
fn write_playlist_file(path: &Path, source: &MediaSource) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, source.path.display().to_string())?;
    Ok(())
}

/// 等待并返回 mpv 的主窗口句柄（最多 ~10s）。返回原始句柄值（HWND 非 Send）。
async fn wait_window(pid: u32) -> Result<isize> {
    tokio::task::spawn_blocking(move || {
        for _ in 0..100 {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if let Some(hwnd) = workerw::find_window_by_pid(pid, MPV_WINDOW_CLASS) {
                return Ok(hwnd.0 as isize);
            }
        }
        Err(anyhow!("mpv window not found"))
    })
    .await
    .map_err(|e| anyhow!("等待 mpv 窗口失败: {e}"))?
}

/// 为 mpv 生成封面：截取视频首帧缩放为 500px 宽（jpg）。
/// 图片/动图也可用（mpv 同样能渲染出首帧）。
pub fn generate_cover(mpv_exe: &Path, media: &Path, cover: &Path) -> Result<()> {
    let out_dir = cover
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!(".cover-tmp-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&out_dir).context("create cover tmp dir failed")?;

    let result = std::process::Command::new(mpv_exe)
        .arg(media)
        .args([
            "--frames=1".to_string(),
            "--audio=no".into(),
            "--sub=no".into(),
            "--vo=image".into(),
            "--vo-image-format=jpg".into(),
            format!("--vo-image-outdir={}", out_dir.display()),
            "--really-quiet".into(),
            "--no-terminal".into(),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    // 取出唯一帧并移动为封面
    let mut moved = false;
    if let Ok(entries) = std::fs::read_dir(&out_dir) {
        for entry in entries.flatten() {
            if moved {
                break;
            }
            if entry.path().is_file() {
                moved = std::fs::rename(entry.path(), cover).is_ok();
            }
        }
    }
    let _ = std::fs::remove_dir_all(&out_dir);

    let status = result.context("mpv cover generation failed")?;
    if status.success() && moved && cover.exists() {
        Ok(())
    } else {
        Err(anyhow!("mpv cover generation failed"))
    }
}

fn set_no_window(cmd: &mut tokio::process::Command) {
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    #[cfg(not(windows))]
    let _ = cmd;
}
