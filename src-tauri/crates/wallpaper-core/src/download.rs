//! 下载管理：最多 2 个并行任务，进度事件（节流 200ms），支持取消。

use anyhow::{anyhow, Context};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, Semaphore};

/// 与 v3 `DownloadItem` 对齐（注意 `IsCanceled` 的历史大写命名）。
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DownloadItem {
    pub id: String,
    pub desc: String,
    pub percent: f64,
    pub total_bytes: u64,
    pub received_bytes: u64,
    pub is_downloading: bool,
    pub is_download_completed: bool,
    #[serde(rename = "IsCanceled")]
    pub is_canceled: bool,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DownloadStatus {
    pub items: Vec<DownloadItem>,
}

struct ItemState {
    info: Mutex<DownloadItem>,
    cancel: AtomicBool,
}

type EmitFn = Arc<dyn Fn(DownloadStatus) + Send + Sync>;
/// 下载进度回调（应用层注入，如发送事件到前端）。
pub type DownloadEventCallback = EmitFn;

pub struct DownloadManager {
    items: Arc<Mutex<HashMap<String, Arc<ItemState>>>>,
    semaphore: Arc<Semaphore>,
    emit: EmitFn,
    client: reqwest::Client,
}

impl DownloadManager {
    pub fn new(emit: EmitFn) -> Self {
        Self {
            items: Arc::new(Mutex::new(HashMap::new())),
            semaphore: Arc::new(Semaphore::new(2)),
            emit,
            client: reqwest::Client::builder()
                .user_agent("GiantappWallpaper/4")
                .build()
                .unwrap_or_default(),
        }
    }

    /// 提交下载任务（媒体必选，封面可选）。立即返回，进度经 emit 回调广播。
    pub async fn submit(
        &self,
        id: &str,
        desc: &str,
        media_url: &str,
        media_dest: PathBuf,
        cover_url: Option<String>,
        cover_dest: Option<PathBuf>,
    ) {
        let state = Arc::new(ItemState {
            info: Mutex::new(DownloadItem {
                id: id.into(),
                desc: desc.into(),
                is_downloading: true,
                ..Default::default()
            }),
            cancel: AtomicBool::new(false),
        });
        self.items.lock().await.insert(id.to_string(), state.clone());
        self.notify().await;

        let items = self.items.clone();
        let emit = self.emit.clone();
        let semaphore = self.semaphore.clone();
        let client = self.client.clone();
        let id = id.to_string();
        let media_url = media_url.to_string();

        tokio::spawn(async move {
            let job = Job {
                client,
                state,
                emit: emit.clone(),
                items: items.clone(),
            };

            let result = async {
                let permit = semaphore.acquire_owned().await?;
                let _permit = permit;

                if let Some((url, dest)) = cover_url.zip(cover_dest) {
                    job.download_file(&url, &dest).await?;
                    job.notify().await;
                }
                job.download_file(&media_url, &media_dest).await?;
                Ok::<(), anyhow::Error>(())
            }
            .await;

            {
                let mut info = job.state.info.lock().await;
                info.is_downloading = false;
                match result {
                    Ok(()) => info.is_download_completed = true,
                    Err(e) => {
                        log::error!("download {id} failed: {e}");
                        let _ = std::fs::remove_file(&media_dest);
                    }
                }
            }
            job.notify().await;

            // 保留最终状态 30s 供 UI 查询，然后清理
            tokio::time::sleep(Duration::from_secs(30)).await;
            items.lock().await.remove(&id);
            job.notify().await;
        });
    }

    pub fn cancel(&self, id: &str) {
        let items = self.items.clone();
        let id = id.to_string();
        tokio::spawn(async move {
            if let Some(state) = items.lock().await.get(&id).cloned() {
                state.cancel.store(true, Ordering::SeqCst);
                let mut info = state.info.lock().await;
                info.is_canceled = true;
                info.is_downloading = false;
            }
        });
    }

    pub async fn status_all(&self) -> DownloadStatus {
        let items = self.items.lock().await;
        collect_status(&items)
    }

    pub async fn status_of(&self, id: &str) -> Option<DownloadItem> {
        let state = self.items.lock().await.get(id).cloned()?;
        let info = state.info.lock().await.clone();
        Some(info)
    }

    async fn notify(&self) {
        let items = self.items.lock().await;
        (self.emit)(collect_status(&items));
    }
}

fn collect_status(items: &HashMap<String, Arc<ItemState>>) -> DownloadStatus {
    let mut list: Vec<DownloadItem> = items
        .values()
        .filter_map(|s| s.info.try_lock().ok().map(|g| g.clone()))
        .collect();
    list.sort_by(|a, b| a.id.cmp(&b.id));
    DownloadStatus { items: list }
}

struct Job {
    client: reqwest::Client,
    state: Arc<ItemState>,
    emit: EmitFn,
    #[allow(dead_code)]
    items: Arc<Mutex<HashMap<String, Arc<ItemState>>>>,
}

impl Job {
    async fn notify(&self) {
        (self.emit)(DownloadStatus {
            items: vec![self.state.info.lock().await.clone()],
        });
    }

    async fn download_file(&self, url: &str, dest: &Path) -> anyhow::Result<()> {
        if self.state.cancel.load(Ordering::SeqCst) {
            return Err(anyhow!("canceled"));
        }
        let resp = self
            .client
            .get(url)
            .send()
            .await
            .with_context(|| format!("GET {url}"))?
            .error_for_status()?;
        let total = resp.content_length().unwrap_or(0);
        {
            let mut info = self.state.info.lock().await;
            info.total_bytes = total;
            info.desc = dest
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
        }

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let tmp = dest.with_extension("part");
        let mut file = std::fs::File::create(&tmp)?;

        use futures_util::StreamExt;
        use std::io::Write;
        let mut stream = resp.bytes_stream();
        let mut received: u64 = 0;
        let mut last_notify = Instant::now() - Duration::from_secs(1);

        while let Some(chunk) = stream.next().await {
            if self.state.cancel.load(Ordering::SeqCst) {
                drop(file);
                let _ = std::fs::remove_file(&tmp);
                return Err(anyhow!("canceled"));
            }
            let chunk = chunk?;
            file.write_all(&chunk)?;
            received += chunk.len() as u64;

            let now = Instant::now();
            if now.duration_since(last_notify) > Duration::from_millis(200) {
                last_notify = now;
                let mut info = self.state.info.lock().await;
                info.received_bytes = received;
                if total > 0 {
                    info.percent = (received as f64 / total as f64) * 100.0;
                }
                drop(info);
                self.notify().await;
            }
        }
        file.flush()?;

        {
            let mut info = self.state.info.lock().await;
            info.received_bytes = received;
            info.percent = if total > 0 {
                (received as f64 / total as f64) * 100.0
            } else {
                100.0
            };
        }
        std::fs::rename(&tmp, dest)?;
        Ok(())
    }
}
