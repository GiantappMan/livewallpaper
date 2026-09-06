//! 应用数据目录布局：`%LOCALAPPDATA%/LiveWallpaper4`。

use std::path::{Path, PathBuf};

pub const APP_DIR_NAME: &str = "LiveWallpaper4";
/// v3 的数据目录，用于一次性导入配置与快照。
pub const V3_APP_DIR_NAME: &str = "LiveWallpaper3";

#[derive(Debug, Clone)]
pub struct AppDirs {
    pub root: PathBuf,
}

impl AppDirs {
    /// 以指定目录构造（主要供测试与自定义数据目录使用）。
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    /// 默认数据目录。失败时退回到可执行文件所在目录下的 `data`。
    pub fn resolve() -> Self {
        let root = dirs::data_local_dir()
            .unwrap_or_else(|| std::env::current_exe().ok().map(|p| p.parent().map(Path::to_path_buf)).flatten().unwrap_or_default())
            .join(APP_DIR_NAME);
        Self::new(root)
    }

    pub fn v3_root(&self) -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_default()
            .join(V3_APP_DIR_NAME)
    }

    pub fn ensure(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.root)?;
        std::fs::create_dir_all(self.tmp_dir())?;
        std::fs::create_dir_all(self.configs_dir())?;
        std::fs::create_dir_all(self.logs_dir())?;
        Ok(())
    }

    pub fn tmp_dir(&self) -> PathBuf {
        self.root.join("tmp")
    }

    pub fn configs_dir(&self) -> PathBuf {
        self.root.join("configs")
    }

    pub fn logs_dir(&self) -> PathBuf {
        self.root.join("logs")
    }

    pub fn config_file(&self, name: &str) -> PathBuf {
        self.configs_dir().join(format!("{name}.json"))
    }

    pub fn snapshot_file(&self) -> PathBuf {
        self.root.join("snapshot.json")
    }

    /// 播放列表临时文件（mpv --playlist 用）。
    pub fn playlist_tmp_file(&self, screen: u32) -> PathBuf {
        self.tmp_dir().join(format!("playlist{screen}.txt"))
    }
}
