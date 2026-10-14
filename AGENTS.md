# AGENTS.md

面向在本仓库工作的 AI 编码代理与协作者的项目约定。巨应壁纸3（v3）：C# WPF(net462, x64 专用) + WebView2，前端为 `src/giantapp-wallpaper-ui-3_0`（Next.js 14 静态导出）。

## 构建与打包

- 调试：仓库根 `bun dev`（前端 dev server + 自动补 mpv + 启动 Debug 客户端）；`bun dev --web` 只起前端
- 打包：**唯一入口是 `powershell -File src/build/compile.ps1`**（前端 → mpv → dotnet publish → Inno Setup），脚本内每步校验退出码与产物完整性，失败即非零退出。不要手工分步绕过它；确要分步时必须逐步校验退出码（管道 `| tail` 会吞失败，曾导致空 UI 变砖包），且前端产物完整性以 `Client/Assets/UI/zh.html` + `_next/` 存在为准
- 临时/验证产物（回读副本、日志）一律放系统 Temp，**绝不放 `src/build/publish`**（Inno 递归打包该目录，曾把 42MB 自我拷贝打进安装包）
- 提交/推送前删除构建产物里的前端 bundle（Mimosa 扫描器会对 `Client/Assets/UI/_next`、`Client/bin/**/Assets/UI` 误报高危拦截提交）：
  `Client/Assets/UI/_next`、`Client/bin/{x64,Release,Debug}/.../Assets/UI`

## 版本与发布

- 版本号：`Client/Client.csproj` 的 `<Version>`（语义版本，source of truth）+ `Client.App/Package.appxmanifest` 的 `Identity Version`（数值四段）
- 发布：用全局 `giantapp-release` skill，按仓库根 `.release.json`（product=wallpaper3，CF+双通道+GitHub Release）执行；清单发到 `releases.giantapp.cc/wallpaper3/`
- 应用内更新检测：`Client/Apps/UpdateService.cs`，启动 10 秒后自动检查 + 设置页手动检查，自动下载，下载完弹窗安装；微软商店版（`UWPHelper.IsRunningAsUwp()`）检查更新 = 打开商店详情页，永不引导下载安装包

## 提交纪律

- **慎用 `git add -A`**：会把用户本机未提交的改动一并扫进提交（曾把用户改到一半的版本号 3.0.0→3.1.0 带进不相关提交）。逐个文件 add，或提交前 `git diff --cached` 逐项确认
- 构建/打包产物不入库：`Assets/UI`、`Assets/Players/Mpv`、`bin`、`src/build/dist`、`src/build/publish` 均已 ignore
- 远端：`github`（主）+ `gitee`（镜像，按需手动推）；push/发布类外发动作先经用户确认

## 已知坑

- Google Fonts 不可达：前端字体已自托管（@fontsource/inter），**不要**引入 `next/font/google`
- 前端静态导出没有 `index.html`：发布版启动地址是 `/{lang}.html`（AppService.ShowShell），新增语言记得同步语言页
- 仅支持 64 位：所有 csproj 已强制 `PlatformTarget=x64`，不要移除
- dev server 多开互踩：起 `next dev` 前先确认 :3000 没有残留实例
