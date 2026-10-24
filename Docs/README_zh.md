# 巨应壁纸 v2.x

一个迷你无打扰的动（静）态 Windows10 壁纸软件

### 下载地址

[巨应壁纸](https://www.microsoft.com/store/apps/9N1S487WCGWR)

---

### 使用教程
[Bilibili](https://www.bilibili.com/video/BV1ph411872V/)

### 图片
![LocalWallpaper](https://github.com/giant-app/LiveWallpaper/blob/master/screenshots/1.png?raw=true)

![Wallpaper Community](https://github.com/giant-app/LiveWallpaper/blob/master/screenshots/2.png?raw=true)

![Setting Page](https://github.com/giant-app/LiveWallpaper/blob/master/screenshots/3.png?raw=true)

![Notify Icon](https://github.com/giant-app/LiveWallpaper/blob/master/screenshots/4.png?raw=true)

### 编译环境：

- VS2019
- Win10

### 本地开发

需要安装 [bun](https://bun.sh) 和 .NET 9 SDK。

- `bun dev` 一键启动全部并自动打开浏览器：
  - 前端：http://localhost:3001/?p=5001 （Nuxt dev，热更新）
  - C# 客户端：`LiveWallpaper.Shell`（WPF 托盘客户端 + 本地服务端 + 壁纸引擎，由 `dotnet watch` 运行在 http://localhost:5001）。DEBUG 下客户端窗口通过 launchSettings.json 里的 `LIVEWALLPAPER_DEV_UI` 直接加载上面的 dev 前端；C# 保存自动 Hot Reload，无法热更的修改会自动重启客户端
  - 只启动后端（不带客户端）：`bun run dev:server`（`LiveWallpaper.LocalServer.DevHost`）
- 前后端都支持热更新：前端保存即生效；后端 C# 保存自动 Hot Reload，无法热更的修改会自动重启
- 也可以分开启动：`bun run dev:web` / `bun run dev:client` / `bun run dev:server`
- 停止 `bun dev`（Ctrl+C）后会自动退出所有子进程并释放端口。开发模式的 WPF 客户端收不到控制台 Ctrl+C 信号，由内置看门狗（监视 dotnet watch 进程）兜底退出

### 分支管理

- master 是最新版代码（当前是 2.x)，新版本[巨应壁纸](https://www.microsoft.com/store/apps/9N1S487WCGWR)
- 1.x 目前线上 WPF 开发的版本，老版本[巨应动态壁纸](https://www.microsoft.com/store/apps/9MV8GK87MZ05)，新版本稳定后将升级这个 app

### 注意事项

- 新版本巨应壁纸需要使用本地 5001 端口进行通信，请注意是否有浏览器拦截(brave 浏览器，及其他安全插件）
