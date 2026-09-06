# giantapp-wallpaper-ui

巨应壁纸 v4 前端：Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui。

## 结构

```
src/
├── main.tsx              # 入口（HashRouter）
├── App.tsx               # 布局 + 路由
├── i18n.ts               # 语言注册表（zh/en/ru/es）
├── pages/
│   ├── home/             # 本地壁纸管理（网格 + 工具条 + 创建/设置对话框）
│   ├── hub.tsx           # 社区（iframe wallpaper.giantapp.cn）
│   ├── settings/         # 常规 / 壁纸 / 外观
│   └── about.tsx
├── components/
│   ├── providers.tsx     # 启动引导（语言/主题/全局事件）
│   ├── link.tsx          # href 风格的 RouterLink 适配
│   └── ui/               # shadcn/ui 基础组件
├── lib/client/
│   ├── api.ts            # 桥接层：invoke/listen 封装（方法面与 v3 一致）
│   ├── shell.ts          # 窗口外壳（文件夹对话框、loading）
│   └── types.ts          # 数据模型（字段名与后端 serde 对齐，含 v3 历史命名）
└── player/player.ts      # 内嵌播放器页面（wp-cmd / wp-time 事件协议）
```

## 开发

> 推荐从仓库根目录操作：`bun install` + `bun dev`（完整应用调试）。

```bash
bun install     # 或在根目录执行（workspace 已关联）
bun run dev     # 仅前端 http://localhost:5173（浏览器打开时桥接层优雅降级）
bun run build   # tsc + vite build → dist/
```

## 与 v3 的差异

- 语言从 URL 前缀（`/zh/...`）改为应用状态（启动时从后端配置读取，切换后刷新）
- `next/link` → `@/components/link`（保持 `href` 用法）
- 环境变量：`VITE_HUB_ADDRESS`（社区地址）、`VITE_MS_ADDRESS`（商店评价回退链接）
- `window.__TAURI_INTERNALS__` 替代 `window.chrome.webview` 判断运行环境
