This project has been moved to https://github.com/giant-app/LiveWallpaper
# LiveWallpaperEngine 
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

[中文文档](https://github.com/giant-app/LiveWallpaperEngine/blob/master/Docs/README_zh.md)

## Features：
Windows10 Live Wallpaper Minimalist API

## App:
[LiveWallpaper](https://livewallpaper.giantapp.cn/)

## Example：
```csharp
WallpaperApi.Initlize(Dispatcher);

//Display video wallpaper
WallpaperApi.ShowWallpaper(new WallpaperModel() { Path = "/xxx.mp4"},WallpaperManager.Screens[0])
//Display exe wallpaper
WallpaperApi.ShowWallpaper(new WallpaperModel() { Path = "/xxx.exe"},WallpaperManager.Screens[0])
//Display HTML wallpaper
WallpaperApi.ShowWallpaper(new WallpaperModel() { Path = "/xxx.html"},WallpaperManager.Screens[0])
//Display image wallpaper
WallpaperApi.ShowWallpaper(new WallpaperModel() { Path = "/xxx.png"},WallpaperManager.Screens[0])
```

## Goals：
- [x] No UI wallpaper engine
- [x] Support for multiple screens
- [x] Supports EXE wallpaper 
	- [x] Mouse event forwarding (Thanks [ADD-SP](https://github.com/ADD-SP) for his advice)  
- [x] Video wallpaper
- [x] Web wallpaper
- [x] Image wallpaper
- [x] Audio control

## Expectations for open source:
- Welcom PR,Suggest
- Not recommended for commercial projects

## Run demo：
```
//Select files in this directory for testing
LiveWallpaperEngine\LiveWallpaperEngine.Samples.NetCore.Test\WallpaperSamples
```

## Note：
* This project is developed in Win10 environment, Win7 is not compatible,if you want you can submit PR by yourself.
* Sometimes it conflicts with desktop organization software, such as Fences.
* Open the antivirus family bucket software, it may not be embedded in the desktop.

## Branch management
- master The version under development may have various errors
- 1.x Current online stable version

## Author
- [DaZiYuan](https://github.com/DaZiYuan)

## If it helps you please give me a star

This document is translated by Google. If you find any grammatical problems, please don’t be stingy with your PR.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://www.mscoder.cn/"><img src="https://avatars3.githubusercontent.com/u/80653?v=4?s=100" width="100px;" alt=""/><br /><sub><b>代码抄写狮</b></sub></a><br /><a href="https://github.com/giant-app/LiveWallpaperEngine/commits?author=DaZiYuan" title="Code">💻</a> <a href="#maintenance-DaZiYuan" title="Maintenance">🚧</a> <a href="https://github.com/giant-app/LiveWallpaperEngine/issues?q=author%3ADaZiYuan" title="Bug reports">🐛</a> <a href="#projectManagement-DaZiYuan" title="Project Management">📆</a></td>
    <td align="center"><a href="https://www.addesp.com"><img src="https://avatars2.githubusercontent.com/u/44437200?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ADD-SP</b></sub></a><br /><a href="https://github.com/giant-app/LiveWallpaperEngine/commits?author=ADD-SP" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
