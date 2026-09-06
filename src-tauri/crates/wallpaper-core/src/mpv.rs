//! mpv 进程管理 + 命名管道 JSON IPC。
//! 与 v3 相同的启动参数与命令集（get_property / set_property / loadlist /
//! loadfile / quit），请求-响应按 request_id 匹配，串行化发送（低频控制命令足够）。

use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};
use std::future::Future;
use std::path::Path;
use std::process::Stdio;
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
    pub screen: u32,
}

impl MpvPlayer {
    /// 启动 mpv 并连接 IPC。`playlist_file` 为 mpv --playlist 的临时文件。
    pub async fn launch(
        mpv_exe: &Path,
        playlist_file: &Path,
        screen: u32,
        hardware_decoding: bool,
        pan_scan: bool,
        volume: u32,
    ) -> Result<Self> {
        let pipe_short = format!("mpv{}", uuid::Uuid::new_v4());
        let pipe_full_name = format!(r"\\.\pipe\{pipe_short}");
        let playlist_arg = format!("--playlist={}", playlist_file.display());

        let mut cmd = tokio::process::Command::new(mpv_exe);
        let args: Vec<String> = vec![
            playlist_arg,
            "--stop-screensaver=no".into(),
            if hardware_decoding {
                "--hwdec=auto-safe".into()
            } else {
                "--hwdec=no".into()
            },
            if pan_scan {
                "--panscan=1.0".into()
            } else {
                "--panscan=0.0".into()
            },
            "--keepaspect=yes".into(),
            format!("--input-ipc-server={pipe_short}"),
            "--loop-playlist=inf".into(),
            "--window-minimized=yes".into(),
            "--no-osc".into(),
            "--geometry=-10000:-10000".into(),
            "--no-border".into(),
            format!("--volume={volume}"),
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
            screen,
        };

        log::info!("mpv[{screen}] launched, pid={pid}");
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
        let id = conn.next_id.to_string();
        conn.next_id += 1;

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
            if value.get("request_id").and_then(|v| v.as_str()) != Some(id.as_str()) {
                continue; // 事件或错位响应
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

    pub async fn loadlist(&self, path: &Path) -> Result<()> {
        self.request(json!(["loadlist", path.display().to_string(), "replace"]))
            .await
            .map(|_| ())
    }

    pub async fn loadfile(&self, path: &Path) -> Result<()> {
        self.request(json!(["loadfile", path.display().to_string(), "replace"]))
            .await
            .map(|_| ())
    }

    pub async fn pause(&self, paused: bool) -> Result<()> {
        self.set_property("pause", json!(paused)).await
    }

    pub async fn set_volume(&self, volume: u32) -> Result<()> {
        self.set_property("volume", json!(volume)).await
    }

    pub async fn set_panscan(&self, value: f64) -> Result<()> {
        self.set_property("panscan", json!(value)).await
    }

    pub async fn seek_percent(&self, percent: f64) -> Result<()> {
        self.set_property("percent-pos", json!(percent)).await
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

    pub fn pid(&self) -> impl Future<Output = u32> + Send + '_ {
        async move {
            let child = self.child.lock().await;
            child.as_ref().and_then(|c| c.id()).unwrap_or(0)
        }
    }

    pub async fn snapshot(&self) -> Option<MpvSnapshot> {
        let child = self.child.lock().await;
        let pid = child.as_ref().and_then(|c| c.id()).unwrap_or(0);
        if pid == 0 {
            return None; // 接管的实例，无需再快照（原快照仍有效）
        }
        Some(MpvSnapshot {
            ipc_server_name: self.pipe_full_name.clone(),
            pid,
            process_name: "mpv".into(),
        })
    }

    pub async fn is_alive(&self) -> bool {
        matches!(
            tokio::time::timeout(
                std::time::Duration::from_secs(2),
                self.get_property("filename")
            )
            .await,
            Ok(Ok(_))
        )
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
