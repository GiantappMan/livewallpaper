//! 下载管理：最多 2 个并行任务，进度事件（节流 200ms），支持取消；
//! 完成的任务写入持久化下载历史。

use anyhow::{anyhow, Context};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, Semaphore};

/// 历史记录上限（超出时丢弃最旧的）。
const HISTORY_LIMIT: usize = 200;

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

/// 已完成下载的历史记录（持久化到配置目录）。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct DownloadHistoryItem {
    pub id: String,
    pub title: String,
    /// 媒体文件在媒体库中的绝对路径。
    pub file_path: String,
    /// 封面文件绝对路径（可选）。
    pub cover_path: Option<String>,
    pub total_bytes: u64,
    /// 完成时间（Unix 毫秒）。
    pub completed_at: i64,
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
    /// 历史记录持久化文件；为空表示不记录历史。
    history_path: Option<PathBuf>,
    /// 最近完成的下载（新在前），与磁盘文件保持同步。
    history: Arc<std::sync::Mutex<Vec<DownloadHistoryItem>>>,
}

impl DownloadManager {
    pub fn new(emit: EmitFn, history_path: Option<PathBuf>) -> Self {
        let history = history_path
            .as_ref()
            .and_then(|p| load_history(p).ok())
            .unwrap_or_default();
        Self {
            items: Arc::new(Mutex::new(HashMap::new())),
            semaphore: Arc::new(Semaphore::new(2)),
            emit,
            client: reqwest::Client::builder()
                .user_agent("GiantappWallpaper/4")
                .build()
                .unwrap_or_default(),
            history_path,
            history: Arc::new(std::sync::Mutex::new(history)),
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
        let title = desc.to_string();
        let media_url = media_url.to_string();
        // 历史记录用的路径副本（原值被 async 块消费）
        let hist_media_dest = media_dest.clone();
        let hist_cover_dest = cover_dest.clone();
        let history = self.history.clone();
        let history_path = self.history_path.clone();

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

                let mut progress = JobProgress::default();
                // 先下媒体再下封面：大文件的进度连续走完，小封面只补最后一段，
                // 整体进度条单调递增，不会出现"进度跑两次"
                job.download_file(&media_url, &media_dest, &mut progress).await?;
                if let Some((url, dest)) = cover_url.zip(cover_dest) {
                    job.download_file(&url, &dest, &mut progress).await?;
                }
                Ok::<(), anyhow::Error>(())
            }
            .await;

            {
                let mut info = job.state.info.lock().await;
                info.is_downloading = false;
                match result {
                    Ok(()) => {
                        info.is_download_completed = true;
                        info.percent = 100.0;
                    }
                    Err(e) => {
                        log::error!("download {id} failed: {e}");
                        let _ = std::fs::remove_file(&media_dest);
                    }
                }
            }
            job.notify().await;

            // 成功完成的任务写入历史记录
            if job.state.info.lock().await.is_download_completed {
                let total = job.state.info.lock().await.total_bytes;
                let cover = hist_cover_dest
                    .as_ref()
                    .filter(|p| p.exists())
                    .map(|p| p.to_string_lossy().to_string());
                record_history(
                    &history,
                    history_path.as_deref(),
                    &id,
                    &title,
                    &hist_media_dest,
                    cover,
                    total,
                );
            }

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

    /// 已完成下载记录（新在前）。
    pub fn history_all(&self) -> Vec<DownloadHistoryItem> {
        self.history.lock().unwrap().clone()
    }

    /// 清空全部历史记录。
    pub fn clear_history(&self) {
        {
            let mut list = self.history.lock().unwrap();
            list.clear();
        }
        self.persist_history();
    }

    /// 删除单条历史记录。
    pub fn remove_history(&self, id: &str) {
        {
            let mut list = self.history.lock().unwrap();
            list.retain(|it| it.id != id);
        }
        self.persist_history();
    }

    fn persist_history(&self) {
        if let Some(path) = &self.history_path {
            let list = self.history.lock().unwrap();
            if let Err(e) = save_history(path, &list) {
                log::warn!("save download history failed: {e}");
            }
        }
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

/// 追加一条历史记录：同 id 去重（覆盖旧记录），新记录置顶，超限丢弃最旧的。
fn record_history(
    history: &std::sync::Mutex<Vec<DownloadHistoryItem>>,
    history_path: Option<&Path>,
    id: &str,
    title: &str,
    media_dest: &Path,
    cover_path: Option<String>,
    total_bytes: u64,
) {
    let item = DownloadHistoryItem {
        id: id.into(),
        title: title.into(),
        file_path: media_dest.to_string_lossy().to_string(),
        cover_path,
        total_bytes,
        completed_at: chrono::Local::now().timestamp_millis(),
    };
    {
        let mut list = history.lock().unwrap();
        list.retain(|it| it.id != id);
        list.insert(0, item);
        list.truncate(HISTORY_LIMIT);
    }
    if let Some(path) = history_path {
        if let Err(e) = save_history(path, &history.lock().unwrap()) {
            log::warn!("save download history failed: {e}");
        }
    }
}

fn load_history(path: &Path) -> std::io::Result<Vec<DownloadHistoryItem>> {
    let text = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&text).unwrap_or_default())
}

fn save_history(path: &Path, items: &[DownloadHistoryItem]) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, serde_json::to_string(items).unwrap_or_default())
}

struct Job {
    client: reqwest::Client,
    state: Arc<ItemState>,
    emit: EmitFn,
    #[allow(dead_code)]
    items: Arc<Mutex<HashMap<String, Arc<ItemState>>>>,
}

/// 一个任务内多个文件（媒体+封面）的累计进度，避免各文件进度互相覆盖。
#[derive(Default)]
struct JobProgress {
    total: u64,
    received: u64,
    /// 任一文件未返回 Content-Length 时，累计分母不完整，百分比不可信
    total_known: bool,
}

impl Job {
    async fn notify(&self) {
        (self.emit)(DownloadStatus {
            items: vec![self.state.info.lock().await.clone()],
        });
    }

    async fn download_file(
        &self,
        url: &str,
        dest: &Path,
        progress: &mut JobProgress,
    ) -> anyhow::Result<()> {
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
        match resp.content_length() {
            Some(len) => progress.total += len,
            None => progress.total_known = false,
        }
        {
            let mut info = self.state.info.lock().await;
            info.total_bytes = progress.total;
        }

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let tmp = dest.with_extension("part");
        let mut file = std::fs::File::create(&tmp)?;

        use futures_util::StreamExt;
        use std::io::Write;
        let mut stream = resp.bytes_stream();
        let mut last_notify = Instant::now() - Duration::from_secs(1);

        while let Some(chunk) = stream.next().await {
            if self.state.cancel.load(Ordering::SeqCst) {
                drop(file);
                let _ = std::fs::remove_file(&tmp);
                return Err(anyhow!("canceled"));
            }
            let chunk = chunk?;
            file.write_all(&chunk)?;
            progress.received += chunk.len() as u64;

            let now = Instant::now();
            if now.duration_since(last_notify) > Duration::from_millis(200) {
                last_notify = now;
                let mut info = self.state.info.lock().await;
                info.received_bytes = progress.received;
                if progress.total > 0 && progress.total_known {
                    info.percent = (progress.received as f64 / progress.total as f64) * 100.0;
                }
                drop(info);
                self.notify().await;
            }
        }
        file.flush()?;

        {
            let mut info = self.state.info.lock().await;
            info.received_bytes = progress.received;
            if progress.total > 0 && progress.total_known {
                info.percent = (progress.received as f64 / progress.total as f64) * 100.0;
            }
        }
        std::fs::rename(&tmp, dest)?;
        Ok(())
    }
}
