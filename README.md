# LiveWallpaper v2.x

A tiny non-disturbing Win10 (dynamic) wallpaper app

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-5-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[中文文档](https://github.com/daziyuan/LiveWallpaper/blob/v2.x/Docs/README_zh.md)

---

### How to use

[Youtube](https://www.youtube.com/watch?v=vTavq2PlAJA&t=351s)  
[Bilibili](https://www.bilibili.com/video/BV1ph411872V/)

### Download Link

[LiveWallpaper](https://www.microsoft.com/store/apps/9N1S487WCGWR)

---

### Images

![LocalWallpaper](https://github.com/daziyuan/LiveWallpaper/blob/v2.x/screenshots/1.png?raw=true)

![Wallpaper Community](https://github.com/daziyuan/LiveWallpaper/blob/v2.x/screenshots/2.png?raw=true)

![Setting Page](https://github.com/daziyuan/LiveWallpaper/blob/v2.x/screenshots/3.png?raw=true)

![Notify Icon](https://github.com/daziyuan/LiveWallpaper/blob/v2.x/screenshots/4.png?raw=true)

### Build Environment

- VS2019
- Win10
- The server site is not open source, the client web source code is [here](https://github.com/daziyuan/LiveWallpaper/tree/v2.x/livewallpaper-client-ui).

### Development

Requires [bun](https://bun.sh) and the .NET 9 SDK.

- `bun dev` starts everything together and opens the browser automatically:
  - web UI: http://localhost:3001/?p=5001 (Nuxt dev, hot reload)
  - C# client: `LiveWallpaper.Shell` (WPF tray app + local server + wallpaper engine, run by `dotnet watch` on http://localhost:5001). In DEBUG the client window loads the dev web UI above via the `LIVEWALLPAPER_DEV_UI` setting in its launchSettings.json; C# edits hot reload, unsupported edits restart the client
  - backend only (no client UI): `bun run dev:server` (`LiveWallpaper.LocalServer.DevHost`)
- Hot reload on both sides: frontend edits apply instantly, backend C# edits hot reload (unsupported edits restart the server automatically)
- Or run them separately: `bun run dev:web` / `bun run dev:client` / `bun run dev:server`
- Stopping `bun dev` (Ctrl+C) exits all child processes and releases the ports. The dev-mode WPF client can't receive the console Ctrl+C signal, so a built-in watchdog (watching the dotnet watch process) shuts it down as a fallback

### Branch management

- **v2.x** is the latest version of the code, the new version [LiveWallpaper](https://www.microsoft.com/store/apps/9N1S487WCGWR)
- **v1.x** original old version [LiveWallpaper Classic](https://www.microsoft.com/store/apps/9NK0K2HWJ7C0)

### Attention

- The new version of the LiveWallpaper needs to use the local port for communication, please note whether there is a browser blocking (Brave browser, and other security plug-ins).

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/DaZiYuan"><img src="https://avatars3.githubusercontent.com/u/80653?v=4?s=100" width="100px;" alt=""/><br /><sub><b>代码抄写狮</b></sub></a><br /><a href="#maintenance-DaZiYuan" title="Maintenance">🚧</a> <a href="https://github.com/daziyuan/LiveWallpaper/commits?author=DaZiYuan" title="Code">💻</a> <a href="https://github.com/daziyuan/LiveWallpaper/issues?q=author%3ADaZiYuan" title="Bug reports">🐛</a> <a href="#projectManagement-DaZiYuan" title="Project Management">📆</a></td>
    <td align="center"><a href="http://Empty... No!"><img src="https://avatars0.githubusercontent.com/u/7201687?v=4?s=100" width="100px;" alt=""/><br /><sub><b>The_BadUser</b></sub></a><br /><a href="#translation-vanja-san" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/Laezor"><img src="https://avatars2.githubusercontent.com/u/32393101?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Laezor</b></sub></a><br /><a href="#translation-Laezor" title="Translation">🌍</a></td>
    <td align="center"><a href="https://www.addesp.com"><img src="https://avatars.githubusercontent.com/u/44437200?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ADD-SP</b></sub></a><br /><a href="https://github.com/daziyuan/LiveWallpaper/commits?author=ADD-SP" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
