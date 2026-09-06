# 巨应壁纸 IV

简洁、轻量、易用、无打扰的动态壁纸客户端。本分支使用 **Tauri 2（Rust）** 全新重写，与 v3.x（C# WPF + WebView2 + mpv）功能对齐，代码完全重新设计，面向长期维护。

线上源码查看 v3.x 分支。

## 下载

- Github Releases：<https://github.com/GiantappMan/livewallpaper/releases>

## 开发调试

```bash
bun install   # 首次
bun dev       # 根目录一键启动（Vite + Rust + 应用）
```

详见 [docs/1.开发.md](./docs/1.开发.md)。

## 功能

- [x] 图片壁纸（bmp / jpg / jpeg / png / jfif / avif）
- [x] 动图壁纸（gif / webp）
- [x] 视频壁纸（mp4 / flv / blv / avi / mov / webm / mkv，mpv 硬解或内置播放器）
- [x] Web 壁纸（html / htm，v4 新增，v3 预留）
- [x] 播放列表（顺序 / 随机 / 按时长自动切换）
- [x] 多显示器（逐屏独立设置壁纸 / 暂停 / 音源）
- [x] 全屏遮挡智能暂停 / 停止，锁屏暂停
- [x] 社区（Hub，iframe 接入 wallpaper.giantapp.cn）
- [x] 多语言（简体中文 / English / Русский / Español）
- [x] 开机自启 / 单实例 / 托盘 / livewallpaper4:// 深链

## 技术栈

| 层 | v3.x | v4.x |
|---|---|---|
| 外壳 | C# WPF + WebView2 | Tauri 2（Rust + 系统 WebView2） |
| UI | Next.js 14 静态导出 | Vite + React 18 + Tailwind + shadcn/ui |
| 视频引擎 | 外部 mpv.exe / WPF 播放器进程（命名管道 IPC） | mpv（命名管道 IPC）/ 内置 WebView 播放器窗口 |
| 桌面嵌入 | WorkerW + SetParent | WorkerW + SetParent（windows-rs） |
| 静态壁纸 | IDesktopWallpaper COM | IDesktopWallpaper COM（windows-rs） |
| 安装包 | Inno Setup | NSIS（tauri bundle） |

## 仓库结构

```
├── docs/                          # 愿景 / 开发 / 更新记录
├── src/
│   └── giantapp-wallpaper-ui/     # 前端（Vite + React）
└── src-tauri/
    ├── src/                       # Tauri 应用层（命令 / 托盘 / 事件 / 内置播放器）
    ├── crates/wallpaper-core/     # 壁纸引擎（纯 Rust，无 Tauri 依赖）
    ├── assets/players/mpv/        # mpv.exe 放置处（构建时下载，见开发文档）
    └── tauri.conf.json
```

## 相关链接

- 愿景：[docs/0.愿景.md](./docs/0.愿景.md)
- 开发：[docs/1.开发.md](./docs/1.开发.md)
- 应用商店（v3）：<https://www.microsoft.com/store/apps/9MWTG433JV6B>

## 鼓励一下

- [点个星星](https://github.com/GiantappMan/livewallpaper)
- [五星好评](https://www.microsoft.com/store/apps/9MWTG433JV6B)
