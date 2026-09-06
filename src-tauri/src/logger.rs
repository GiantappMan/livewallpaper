//! 简单文件日志：`logs/log.txt`（5MB x 5 轮转）+ stdout(debug) + panic 钩子。

use log::{LevelFilter, Metadata, Record};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

const MAX_SIZE: u64 = 5 * 1024 * 1024;
const MAX_FILES: usize = 5;

struct FileLogger {
    file: parking_lot::Mutex<Option<std::fs::File>>,
    path: PathBuf,
    written: AtomicUsize,
}

impl log::Log for FileLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= log::max_level()
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let now = chrono::Local::now();
        let line = format!(
            "[{}] [{:<5}] [{}] {}\n",
            now.format("%Y-%m-%d %H:%M:%S%.3f"),
            record.level(),
            record.target(),
            record.args()
        );

        #[cfg(debug_assertions)]
        {
            print!("{}", line);
            let _ = std::io::stdout().flush();
        }

        let mut guard = self.file.lock();
        if guard.is_none() {
            if let Some(parent) = self.path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            *guard = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.path)
                .ok();
        }
        if let Some(file) = guard.as_mut() {
            let _ = file.write_all(line.as_bytes());
            let n = self.written.fetch_add(line.len(), Ordering::Relaxed) + line.len();
            if n as u64 > MAX_SIZE {
                self.rotate(&mut *guard);
            }
        }
    }

    fn flush(&self) {
        if let Some(file) = self.file.lock().as_mut() {
            let _ = file.flush();
        }
    }
}

impl FileLogger {
    fn rotate(&self, file: &mut Option<std::fs::File>) {
        *file = None;
        for i in (1..MAX_FILES).rev() {
            let from = self.path.with_extension(format!("log.{i}"));
            let to = self.path.with_extension(format!("log.{}", i + 1));
            let _ = std::fs::rename(&from, &to);
        }
        let _ = std::fs::rename(&self.path, self.path.with_extension("log.1"));
        self.written.store(0, Ordering::Relaxed);
    }
}

pub fn init(dirs: &wallpaper_core::AppDirs) {
    let path = dirs.logs_dir().join("log.txt");
    let logger: &'static FileLogger = Box::leak(Box::new(FileLogger {
        file: parking_lot::Mutex::new(None),
        path,
        written: AtomicUsize::new(0),
    }));
    let _ = log::set_logger(logger as &'static dyn log::Log);
    log::set_max_level(if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    });

    // panic 钩子：写日志
    std::panic::set_hook(Box::new(|info| {
        log::error!("panic: {info}");
    }));
}
