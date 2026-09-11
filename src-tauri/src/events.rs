//! 应用事件枢纽：一条事件流同时供 Tauri emit（前端）与控制管道（CLI / 外部
//! 脚本）消费。core / 下载 / 系统事件 / 配置联动统一从这里发布。

use serde_json::Value;
use std::sync::Arc;
use tokio::sync::broadcast;

/// 已序列化 payload 的应用事件。
#[derive(Debug, Clone)]
pub struct AppEvent {
    pub name: String,
    pub payload: Value,
}

#[derive(Clone)]
pub struct EventHub {
    tx: Arc<broadcast::Sender<AppEvent>>,
}

impl EventHub {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(256);
        Self { tx: Arc::new(tx) }
    }

    pub fn publish(&self, name: &str, payload: impl serde::Serialize) {
        let payload = serde_json::to_value(payload).unwrap_or(Value::Null);
        let _ = self.tx.send(AppEvent {
            name: name.to_string(),
            payload,
        });
    }

    pub fn subscribe(&self) -> broadcast::Receiver<AppEvent> {
        self.tx.subscribe()
    }
}

impl Default for EventHub {
    fn default() -> Self {
        Self::new()
    }
}

/// 把 hub 事件转发到 Tauri emit（setup 时启动一次）。
pub fn forward_to_tauri(hub: &EventHub, app: tauri::AppHandle) {
    let mut rx = hub.subscribe();
    tauri::async_runtime::spawn(async move {
        use tauri::Emitter;
        loop {
            match rx.recv().await {
                Ok(ev) => {
                    let _ = app.emit(&ev.name, ev.payload);
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    log::warn!("event hub lagged, dropped {n} events");
                }
                Err(broadcast::error::RecvError::Closed) => return,
            }
        }
    });
}
