/**
 * 皮肤共享引擎 SkinCore（官方皮肤共用，逻辑与 skin-dev / 默认皮肤对齐）。
 *
 * 职责：状态缓存与订阅、i18n（zh/en/ru/es/zh-Hant/ja/de/fr/pt-BR，缺词回退 en）、播放控制与进度轮询规则、
 * 分块上传 / 封面生成 / 播放列表、配置整组读写、下载、mpv、皮肤管理、演示模式。
 *
 * 皮肤页面在 index.html 里先定义 window.SKIN_META = { brand, version }，再引入本文件。
 * 无应用环境（浏览器直开）时进入演示模式：注入 mock 数据，全部操作本地模拟，
 * 便于设计与走查。
 */
(function () {
  "use strict";

  const meta = window.SKIN_META || { brand: "Skin", version: "1.0.0" };
  const client = window.WallpaperClient && window.WallpaperClient.api ? window.WallpaperClient : null;
  const inClient = !!(client && client.api.isRunningInClient && client.api.isRunningInClient());
  const demo = !inClient;

  // ---------------------------------------------------------------- 事件总线
  const listeners = new Map(); // name -> Set<fn>
  function on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  }
  function emit(name, payload) {
    const set = listeners.get(name);
    if (!set) return;
    set.forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  }

  // ---------------------------------------------------------------- i18n
  const DICTS = {
    zh: {
      "nav.library": "壁纸库", "nav.local": "本地库", "nav.downloads": "下载", "nav.hub": "社区", "nav.settings": "设置", "nav.about": "关于",
      "common.apply": "应用", "common.allScreens": "全部屏幕", "common.screen": "屏幕 {0}", "common.primary": "主屏",
      "common.cancel": "取消", "common.ok": "确定", "common.delete": "删除", "common.save": "保存", "common.saving": "保存中…",
      "common.close": "关闭", "common.edit": "编辑", "common.create": "创建", "common.location": "打开位置", "common.refresh": "刷新",
      "common.playing": "播放中", "common.paused": "已暂停", "common.idle": "空闲", "common.demo": "演示模式",
      "common.demoHint": "未检测到应用环境，正在展示模拟数据", "common.add": "添加", "common.remove": "移除",
      "common.saved": "已保存", "common.opFailed": "操作失败：{0}", "common.done": "完成", "common.back": "返回",
      "card.clickApplyAll": "单击应用到全部屏幕", "card.clickApplyScreen": "单击应用到{0}",
      "type.1": "图片", "type.2": "动图", "type.3": "视频", "type.4": "Web", "type.5": "Exe", "type.6": "列表", "type.0": "自动检测",
      "lib.title": "壁纸库", "lib.count": "{0} 个壁纸", "lib.search": "搜索壁纸…", "lib.empty": "还没有壁纸",
      "lib.emptyHint": "点击右上角「创建」导入本地视频或图片，或从社区下载",
      "lib.target": "应用到", "lib.playingBadge": "正在播放",
      "local.title": "本地库", "local.count": "{0} 项", "local.target": "应用到",
      "local.filter": "类型", "local.filterAll": "全部类型", "local.sort": "排序",
      "local.sortName": "按名称", "local.sortType": "按类型", "local.sortTime": "按创建时间", "local.openDirs": "打开目录",
      "local.newFolder": "新建文件夹", "local.folderNamePh": "文件夹名称", "local.more": "更多选项",
      "local.moveTo": "移动到…", "local.moveTitle": "移动到文件夹", "local.moveCurrent": "当前位置",
      "local.moved": "已移动到「{0}」", "local.folderCreated": "文件夹已创建",
      "local.open": "打开", "local.rearrange": "自动整理",
      "local.zoomIn": "放大（Ctrl+=）", "local.zoomOut": "缩小（Ctrl+-）", "local.zoomReset": "重置为 100%（Ctrl+0）",
      "local.zoomHint": "封面缩放：Ctrl+滚轮 或右下角控件调整 · Ctrl+= / Ctrl+- 步进 · Ctrl+0 复位",
      "local.delFolder": "删除文件夹",
      "local.delFolderBody": "「{0}」和其中的全部内容将被永久删除，此操作无法撤销。",
      "local.delFolderCount": "其中包含 {0} 个壁纸",
      "local.folderEmpty": "这个文件夹是空的",
      "local.folderEmptyHint": "右键壁纸选择「移动到…」，或直接把壁纸拖到文件夹卡片上",
      "local.searchEmpty": "没有匹配的壁纸",
      "local.needUpdate": "文件夹整理需要先更新巨应壁纸到新版本",
      "local.empty": "还没有壁纸",
      "local.emptyHint": "把视频或图片放进壁纸目录即可",
      "pv.title": "预览", "pv.noPreview": "该类型不支持预览",
      "pv.engine": "视频引擎：{0}", "pv.engineNote": "MPV 引擎无法内嵌预览，已改用内置 Web 播放器渲染",
      "pv.mouseOff": "鼠标交互已关闭",
      "pv.loadFailed": "加载失败：当前格式可能不被内置播放器支持",
      "pv.max": "放大", "pv.restore": "还原", "pv.wheelHint": "滚轮上下切换上一个 / 下一个",
      "create.wallpaper": "创建壁纸", "create.playlist": "创建播放列表", "create.editWallpaper": "编辑壁纸", "create.editList": "编辑列表",
      "create.titleField": "标题", "create.titlePh": "给{0}起个名字", "create.type": "类型",
      "create.file": "点击选择文件，或把文件拖到这里", "create.fileHint": "支持图片 / 动图 / 视频 / 网页（≤ 500MB）",
      "create.pickFolder": "选择文件夹（Web 壁纸）", "create.webPack": "{0} 个文件 · {1}", "create.webNeedHtml": "文件夹里没有网页文件",
      "create.webAskTitle": "导入 Web 壁纸", "create.webAskBody": "是否包含整个文件夹？将同时导入该网页所在目录的全部资源", "create.webAskYes": "包含整个文件夹", "create.webAskNo": "仅此文件",
      "create.webBigTitle": "文件夹较大", "create.webBigBody": "共 {0}，导入可能需要一些时间，确定继续吗？",
      "create.importing": "导入中 {0}%", "create.imported": "已导入", "create.reselect": "重新选择",
      "create.addMembers": "添加壁纸", "create.members": "成员 {0}", "create.membersEmpty": "还没有成员，点击「添加壁纸」从库中选择",
      "create.creating": "创建中…", "create.titleEmpty": "标题不能为空", "create.noFile": "请先选择文件",
      "create.listEmpty": "播放列表至少需要一个成员", "create.created": "创建成功", "create.createFailed": "创建失败：{0}",
      "create.updated": "已保存", "create.coverFailed": "封面生成失败（已跳过，稍后可自动生成）",
      "create.unsaved": "有未保存的修改", "create.unsavedBody": "关闭后将丢失这些修改，确定关闭吗？",
      "create.pickTitle": "选择成员", "create.pickHint": "点击卡片选择，播放列表不能嵌套播放列表", "create.selectAll": "全选",
      "set.title": "壁纸设置", "set.sub": "「{0}」的播放参数，保存后立即生效",
      "set.overlayTitle": "叠加设置", "set.overlaySub": "「{0}」的画面叠加，保存后立即生效",
      "set.overlayTime": "时间时钟", "set.overlayTimeHint": "在画面右上角显示实时系统时间",
      "set.duration": "播放时长", "set.durationHint": "该壁纸在播放列表中停留的时间（时:分）",
      "set.playMode": "播放模式", "set.order": "顺序播放", "set.random": "随机播放",
      "set.mouse": "鼠标交互", "set.mouseHint": "允许壁纸响应鼠标移动与点击",
      "set.player": "视频引擎", "set.engine0": "默认", "set.engine1": "MPV 播放器", "set.engine2": "Web 播放器", "set.engine3": "内嵌 MPV 播放器",
      "set.hwdec": "硬件解码", "set.hwdecHint": "显著降低播放视频时的 CPU 占用",
      "set.panscan": "铺满拉伸", "set.panscanHint": "裁剪画面以铺满整个屏幕",
      "set.fit": "契合度", "set.fit0": "居中", "set.fit1": "平铺", "set.fit2": "拉伸", "set.fit3": "适应", "set.fit4": "填充", "set.fit5": "跨屏",
      "set.keep": "保留壁纸", "set.keepHint": "退出应用时不恢复原桌面壁纸",
      "set.saved": "设置已保存并生效", "set.saveFailed": "保存失败：{0}",
      "dock.stop": "停止", "dock.pause": "暂停", "dock.resume": "继续播放", "dock.prev": "上一项", "dock.next": "下一项",
      "dock.volume": "音量", "dock.audio": "音源", "dock.mute": "静音", "dock.nothing": "桌面正在休息",
      "dock.nothingHint": "点击任意壁纸即可应用", "dock.focus": "正在控制",
      "dock.screensHint": "点击选择要操作的屏幕（再点取消）；未选屏幕时操作作用于全部屏幕；把壁纸拖到屏幕块上即可在该屏播放",
      "dock.blankTitle": "点击壁纸生效，或拖壁纸到此块播放",
      "dock.blankHint": "点击库中壁纸即可生效；也可把壁纸拖到此屏块上，直接在该屏播放",
      "dl.title": "下载", "dl.sub": "下载任务与历史记录", "dl.active": "进行中", "dl.activeEmpty": "暂无下载任务",
      "dl.emptyHint": "从社区发现喜欢的壁纸，下载记录会显示在这里",
      "dl.history": "历史记录", "dl.historyEmpty": "暂无下载记录", "dl.clear": "清空记录",
      "dl.clearConfirm": "将清空全部下载记录，不会删除已下载的壁纸文件。确定清空吗？", "dl.cleared": "记录已清空",
      "dl.cancel": "取消任务", "dl.removed": "记录已删除",
      "hub.title": "社区", "hub.login": "登录账号", "hub.loginHint": "将在独立窗口中完成登录",
      "hub.reload": "重新加载", "hub.browser": "在浏览器打开", "hub.failed": "页面加载失败，请检查网络",
      "cfg.general": "常规", "cfg.wallpaper": "壁纸", "cfg.appearance": "外观",
      "cfg.autoStart": "开机启动", "cfg.autoStartHint": "登录 Windows 后自动运行",
      "cfg.hideWindow": "启动时隐藏主窗口", "cfg.hideWindowHint": "启动后只在托盘与桌面生效",
      "cfg.headless": "开机自启时后台运行", "cfg.headlessHint": "自启时不显示任何窗口（需先开启开机启动）",
      "cfg.language": "语言",
      "cfg.langApplied": "语言已切换",
      "cfg.dirs": "壁纸目录", "cfg.dirsHint": "第一个为保存目录，其余为读取目录",
      "cfg.addDir": "添加目录", "cfg.choose": "选择…", "cfg.covered": "被完全遮挡时",
      "cfg.covered0": "继续播放", "cfg.covered1": "自动暂停", "cfg.covered2": "停止播放",
      "cfg.keep": "保留壁纸", "cfg.keepHint": "退出后保留壁纸快照，下次启动自动恢复壁纸",
      "cfg.player": "默认视频引擎", "cfg.mpvMissing": "未检测到 MPV —— 自动下载后视频播放性能更好",
      "cfg.mpvDownload": "自动下载 MPV", "cfg.mpvCancel": "取消下载", "cfg.mpvProgress": "下载中 {0}%",
      "cfg.mpvDone": "MPV 已就绪", "cfg.mpvFail": "MPV 下载失败：{0}", "cfg.mpvFolder": "打开 MPV 目录",
      "cfg.mode": "外观模式", "cfg.modeSys": "跟随系统", "cfg.modeLight": "浅色", "cfg.modeDark": "深色",
      "cfg.skins": "皮肤", "cfg.skinHint": "皮肤可整体更换界面风格；app 型替换界面，style 型覆盖样式",
      "cfg.skinOpen": "打开皮肤目录", "cfg.skinCurrent": "使用中", "cfg.skinInvalid": "不可用", "cfg.skinApplied": "已应用「{0}」",
      "cfg.skinCustom": "自定义皮肤", "cfg.skinDocHint": "把开发指南全文复制给任意 AI（ChatGPT / Claude 等），按规范生成皮肤文件后放入皮肤目录即可使用。", "cfg.skinDocCopy": "复制全文", "cfg.skinDocCopied": "已复制全文，可粘贴给 AI 生成皮肤",
      "cfg.about": "关于本皮肤", "cfg.reloadHint": "部分选项保存后界面会自动刷新",
      "cfg.update": "更新",
      "upd.uiTitle": "界面热更新", "upd.uiHint": "配置热更新地址后，无需升级程序即可获取新版界面；还原可随时回到随程序分发的内置界面", "upd.uiUrl": "热更新地址", "upd.channelHint": "同时决定界面热更新跟随的清单", "upd.uiUrlHint": "留空跟随更新通道，或填 ui.json 清单地址", "upd.uiAuto": "启动时自动更新界面", "upd.uiActive": "当前使用热更新界面（版本 {0}，应用时间 {1}）", "upd.uiBuiltin": "当前使用内置界面", "upd.uiCheck": "检查更新", "upd.uiApply": "下载并应用", "upd.uiRestore": "还原内置界面", "upd.restoreConfirm": "将删除已下载的热更新界面并还原到随程序分发的内置界面。确定继续吗？", "upd.upToDate": "已是最新版本", "upd.found": "发现新版本 {0}", "upd.progress": "下载中 {0}%", "upd.applied": "界面已更新到 {0}", "upd.restored": "已还原到内置界面", "upd.appTitle": "程序更新", "upd.appHint": "开启自动更新后发现新版本会自动下载，安装始终由你确认", "upd.channel": "更新通道", "upd.chStable": "正式版", "upd.chPreview": "预览版", "upd.chOff": "关闭", "upd.autoDownload": "自动下载新版本", "upd.appUrl": "更新服务器地址", "upd.appCheck": "检查更新", "upd.download": "下载更新", "upd.downloaded": "新版本 {0} 已下载完成", "upd.install": "安装并重启", "upd.later": "暂不安装", "upd.installing": "正在退出并启动安装程序，完成后自动重启", "upd.current": "当前版本 {0}", "upd.readyBar": "发现新版本 {0}，已下载完成",
      "about.title": "关于", "about.logs": "打开日志目录", "about.feedback": "问题反馈", "about.github": "项目主页",
      "about.review": "商店好评", "about.star": "点个 Star", "about.author": "{0} 出品",
      "about.exit": "退出应用", "about.exitConfirm": "退出巨应壁纸？桌面壁纸将被清除（可在 设置→壁纸 中保留）。",
      "about.exited": "已退出", "about.skinBy": "本皮肤由巨应壁纸皮肤系统驱动",
    },
    en: {
      "nav.library": "Library", "nav.local": "Local", "nav.downloads": "Downloads", "nav.hub": "Hub", "nav.settings": "Settings", "nav.about": "About",
      "common.apply": "Apply", "common.allScreens": "All screens", "common.screen": "Screen {0}", "common.primary": "Primary",
      "common.cancel": "Cancel", "common.ok": "OK", "common.delete": "Delete", "common.save": "Save", "common.saving": "Saving…",
      "common.close": "Close", "common.edit": "Edit", "common.create": "Create", "common.location": "Reveal", "common.refresh": "Refresh",
      "common.playing": "Playing", "common.paused": "Paused", "common.idle": "Idle", "common.demo": "Demo mode",
      "common.demoHint": "App not detected — showing sample data", "common.add": "Add", "common.remove": "Remove",
      "common.saved": "Saved", "common.opFailed": "Failed: {0}", "common.done": "Done", "common.back": "Back",
      "card.clickApplyAll": "Click to apply to all screens", "card.clickApplyScreen": "Click to apply to {0}",
      "type.1": "Image", "type.2": "GIF", "type.3": "Video", "type.4": "Web", "type.5": "Exe", "type.6": "Playlist", "type.0": "Auto",
      "lib.title": "Library", "lib.count": "{0} wallpapers", "lib.search": "Search wallpapers…", "lib.empty": "No wallpapers yet",
      "lib.emptyHint": "Hit Create to import a local video or image, or grab one from the Hub",
      "lib.target": "Apply to", "lib.playingBadge": "Now playing",
      "local.title": "Local library", "local.count": "{0} items", "local.target": "Apply to",
      "local.filter": "Type", "local.filterAll": "All types", "local.sort": "Sort",
      "local.sortName": "By name", "local.sortType": "By type", "local.sortTime": "By date created", "local.openDirs": "Open folder",
      "local.newFolder": "New folder", "local.folderNamePh": "Folder name", "local.more": "More options",
      "local.moveTo": "Move to…", "local.moveTitle": "Move to folder", "local.moveCurrent": "Current location",
      "local.moved": "Moved to “{0}”", "local.folderCreated": "Folder created",
      "local.open": "Open", "local.rearrange": "Auto arrange",
      "local.zoomIn": "Zoom in (Ctrl+=)", "local.zoomOut": "Zoom out (Ctrl+-)", "local.zoomReset": "Reset to 100% (Ctrl+0)",
      "local.zoomHint": "Cover zoom: Ctrl+scroll or the bottom-right control · Ctrl+= / Ctrl+- step · Ctrl+0 reset",
      "local.delFolder": "Delete folder",
      "local.delFolderBody": "“{0}” and everything inside will be permanently deleted. This cannot be undone.",
      "local.delFolderCount": "It contains {0} wallpaper(s)",
      "local.folderEmpty": "This folder is empty",
      "local.folderEmptyHint": "Right-click a wallpaper and choose “Move to…”, or drag it onto a folder card",
      "local.searchEmpty": "No matching wallpapers",
      "local.needUpdate": "Folder organizing needs a newer version of Giantapp Wallpaper",
      "local.empty": "No wallpapers yet",
      "local.emptyHint": "Drop videos or images into a wallpaper folder",
      "pv.title": "Preview", "pv.noPreview": "This type can't be previewed",
      "pv.engine": "Video engine: {0}", "pv.engineNote": "MPV can't render inline — previewing with the built-in Web player",
      "pv.mouseOff": "Mouse interaction off",
      "pv.loadFailed": "Failed to load — the format may not be supported by the built-in player",
      "pv.max": "Maximize", "pv.restore": "Restore", "pv.wheelHint": "Scroll to switch previous / next",
      "create.wallpaper": "New wallpaper", "create.playlist": "New playlist", "create.editWallpaper": "Edit wallpaper", "create.editList": "Edit playlist",
      "create.titleField": "Title", "create.titlePh": "Name your {0}", "create.type": "Type",
      "create.file": "Click to pick a file, or drop it here", "create.fileHint": "Image / GIF / video / web page up to 500MB",
      "create.pickFolder": "Pick a folder (web wallpaper)", "create.webPack": "{0} files · {1}", "create.webNeedHtml": "No web page in that folder",
      "create.webAskTitle": "Import web wallpaper", "create.webAskBody": "Include the whole folder? All assets next to this page will be imported too.", "create.webAskYes": "Include whole folder", "create.webAskNo": "This file only",
      "create.webBigTitle": "Large folder", "create.webBigBody": "{0} in total — importing may take a while. Continue?",
      "create.importing": "Importing {0}%", "create.imported": "Imported", "create.reselect": "Replace",
      "create.addMembers": "Add wallpapers", "create.members": "{0} members", "create.membersEmpty": "No members yet — add from your library",
      "create.creating": "Creating…", "create.titleEmpty": "Title is required", "create.noFile": "Pick a file first",
      "create.listEmpty": "A playlist needs at least one member", "create.created": "Created", "create.createFailed": "Create failed: {0}",
      "create.updated": "Saved", "create.coverFailed": "Cover generation failed (skipped)",
      "create.unsaved": "Unsaved changes", "create.unsavedBody": "Close and lose these changes?",
      "create.pickTitle": "Pick members", "create.pickHint": "Click cards to select; playlists cannot nest", "create.selectAll": "Select all",
      "set.title": "Wallpaper settings", "set.sub": "Playback options for “{0}”, applied instantly on save",
      "set.overlayTitle": "Overlays", "set.overlaySub": "Overlay elements for “{0}”, applied instantly on save",
      "set.overlayTime": "Clock", "set.overlayTimeHint": "Show a live system-time clock in the top-right corner",
      "set.duration": "Duration", "set.durationHint": "How long this wallpaper stays in a playlist (hh:mm)",
      "set.playMode": "Play mode", "set.order": "In order", "set.random": "Random",
      "set.mouse": "Mouse interaction", "set.mouseHint": "Let the wallpaper respond to mouse",
      "set.player": "Video engine", "set.engine0": "Default", "set.engine1": "MPV player", "set.engine2": "Web player", "set.engine3": "Embedded MPV player",
      "set.hwdec": "Hardware decoding", "set.hwdecHint": "Greatly reduces CPU usage for video",
      "set.panscan": "Fill & crop", "set.panscanHint": "Crop the frame to fill the screen",
      "set.fit": "Fit", "set.fit0": "Center", "set.fit1": "Tile", "set.fit2": "Stretch", "set.fit3": "Fit", "set.fit4": "Fill", "set.fit5": "Span",
      "set.keep": "Keep wallpaper", "set.keepHint": "Do not restore the original desktop on exit",
      "set.saved": "Settings saved & applied", "set.saveFailed": "Save failed: {0}",
      "dock.stop": "Stop", "dock.pause": "Pause", "dock.resume": "Resume", "dock.prev": "Previous", "dock.next": "Next",
      "dock.volume": "Volume", "dock.audio": "Audio from", "dock.mute": "Mute", "dock.nothing": "The desktop is resting",
      "dock.nothingHint": "Click any wallpaper to apply it", "dock.focus": "Controlling",
      "dock.screensHint": "Click a screen to target it (click again to clear); with no screen picked, controls apply to all screens. Drag a wallpaper onto a screen to play it there.",
      "dock.blankTitle": "Click a wallpaper to apply it, or drag one onto this block",
      "dock.blankHint": "Click a wallpaper to apply it; or drag one onto a screen block to play it on that screen",
      "dl.title": "Downloads", "dl.sub": "Active tasks and history", "dl.active": "Active", "dl.activeEmpty": "No active downloads",
      "dl.emptyHint": "Grab wallpapers from the Hub — downloads will show up here",
      "dl.history": "History", "dl.historyEmpty": "No download history", "dl.clear": "Clear history",
      "dl.clearConfirm": "Clear all download records? Downloaded wallpaper files are kept.", "dl.cleared": "History cleared",
      "dl.cancel": "Cancel", "dl.removed": "Record removed",
      "hub.title": "Hub", "hub.login": "Sign in", "hub.loginHint": "Sign-in happens in a separate window",
      "hub.reload": "Reload", "hub.browser": "Open in browser", "hub.failed": "Failed to load — check your network",
      "cfg.general": "General", "cfg.wallpaper": "Wallpaper", "cfg.appearance": "Appearance",
      "cfg.autoStart": "Launch at startup", "cfg.autoStartHint": "Run automatically after Windows signs in",
      "cfg.hideWindow": "Hide main window on launch", "cfg.hideWindowHint": "Live in tray & desktop only",
      "cfg.headless": "Headless on autostart", "cfg.headlessHint": "No window at all when auto-started (requires launch at startup)",
      "cfg.language": "Language",
      "cfg.langApplied": "Language switched",
      "cfg.dirs": "Wallpaper folders", "cfg.dirsHint": "First one saves new wallpapers, the rest are read-only sources",
      "cfg.addDir": "Add folder", "cfg.choose": "Browse…", "cfg.covered": "When fully covered",
      "cfg.covered0": "Keep playing", "cfg.covered1": "Auto pause", "cfg.covered2": "Stop",
      "cfg.keep": "Keep wallpaper", "cfg.keepHint": "Keep the wallpaper snapshot after exit and restore it on next launch",
      "cfg.player": "Default video engine", "cfg.mpvMissing": "MPV not found — auto-download enables smoother video",
      "cfg.mpvDownload": "Auto-download MPV", "cfg.mpvCancel": "Cancel download", "cfg.mpvProgress": "Downloading {0}%",
      "cfg.mpvDone": "MPV is ready", "cfg.mpvFail": "MPV download failed: {0}", "cfg.mpvFolder": "Open MPV folder",
      "cfg.mode": "Theme mode", "cfg.modeSys": "System", "cfg.modeLight": "Light", "cfg.modeDark": "Dark",
      "cfg.skins": "Skins", "cfg.skinHint": "Skins restyle the whole app; app skins replace the UI, style skins overlay CSS",
      "cfg.skinOpen": "Open skins folder", "cfg.skinCurrent": "In use", "cfg.skinInvalid": "Invalid", "cfg.skinApplied": "Applied “{0}”",
      "cfg.skinCustom": "Custom skin", "cfg.skinDocHint": "Copy this guide to any AI (ChatGPT / Claude…) to generate a skin, then drop the files into the skins folder.", "cfg.skinDocCopy": "Copy all", "cfg.skinDocCopied": "Copied — paste it to your AI to generate a skin",
      "cfg.about": "About this skin", "cfg.reloadHint": "Some options refresh the UI after saving",
      "cfg.update": "Update",
      "upd.uiTitle": "UI Hot Update", "upd.uiHint": "With a hot-update URL configured you get new UI versions without upgrading the app; restore returns to the built-in UI anytime", "upd.uiUrl": "Hot-update URL", "upd.channelHint": "Also decides which UI hot-update manifest is followed", "upd.uiUrlHint": "Leave empty to follow the update channel, or a ui.json manifest URL", "upd.uiAuto": "Update UI automatically at startup", "upd.uiActive": "Using hot-updated UI (version {0}, applied at {1})", "upd.uiBuiltin": "Using the built-in UI", "upd.uiCheck": "Check for updates", "upd.uiApply": "Download and apply", "upd.uiRestore": "Restore built-in UI", "upd.restoreConfirm": "This deletes the downloaded UI and restores the built-in one shipped with the app. Continue?", "upd.upToDate": "You are up to date", "upd.found": "New version {0} found", "upd.progress": "Downloading {0}%", "upd.applied": "UI updated to {0}", "upd.restored": "Restored to the built-in UI", "upd.appTitle": "App Updates", "upd.appHint": "With auto-update on, new versions download automatically; installing always asks you first", "upd.channel": "Update channel", "upd.chStable": "Stable", "upd.chPreview": "Preview", "upd.chOff": "Off", "upd.autoDownload": "Download new versions automatically", "upd.appUrl": "Update server URL", "upd.appCheck": "Check for updates", "upd.download": "Download update", "upd.downloaded": "Version {0} has been downloaded", "upd.install": "Install and restart", "upd.later": "Not now", "upd.installing": "Exiting and launching the installer; the app restarts afterwards", "upd.current": "Current version {0}", "upd.readyBar": "New version {0} downloaded and ready",
      "about.title": "About", "about.logs": "Open log folder", "about.feedback": "Feedback", "about.github": "Homepage",
      "about.review": "Rate the app", "about.star": "Star on GitHub", "about.author": "Made by {0}",
      "about.exit": "Quit app", "about.exitConfirm": "Quit Giantapp Wallpaper? Wallpapers will be cleared (keep them in Settings → Wallpaper).",
      "about.exited": "Bye", "about.skinBy": "Powered by the Giantapp Wallpaper skin system",
    },
    ru: {
      "nav.library": "Библиотека", "nav.local": "Локально", "nav.downloads": "Загрузки", "nav.hub": "Хаб", "nav.settings": "Настройки", "nav.about": "О программе",
      "common.apply": "Применить", "common.allScreens": "Все экраны", "common.screen": "Экран {0}", "common.primary": "Основной",
      "common.cancel": "Отмена", "common.ok": "ОК", "common.delete": "Удалить", "common.save": "Сохранить", "common.saving": "Сохранение…",
      "common.close": "Закрыть", "common.edit": "Изменить", "common.create": "Создать", "common.location": "Открыть расположение", "common.refresh": "Обновить",
      "common.playing": "Воспроизводится", "common.paused": "Пауза", "common.idle": "Ожидание", "common.demo": "Демо-режим",
      "common.demoHint": "Приложение не обнаружено — показаны примерные данные", "common.add": "Добавить", "common.remove": "Убрать",
      "common.saved": "Сохранено", "common.opFailed": "Не удалось: {0}", "common.done": "Готово", "common.back": "Назад",
      "card.clickApplyAll": "Нажмите, чтобы применить ко всем экранам", "card.clickApplyScreen": "Нажмите, чтобы применить к {0}",
      "type.1": "Изображение", "type.2": "GIF", "type.3": "Видео", "type.4": "Веб", "type.5": "Exe", "type.6": "Плейлист", "type.0": "Авто",
      "lib.title": "Библиотека", "lib.count": "{0} обоев", "lib.search": "Поиск обоев…", "lib.empty": "Пока нет обоев",
      "lib.emptyHint": "Нажмите «Создать», чтобы добавить видео или изображение, или скачайте из Хаба",
      "lib.target": "Применить к", "lib.playingBadge": "Воспроизводится",
      "local.title": "Локальная библиотека", "local.count": "{0} эл.", "local.target": "Применить к",
      "local.filter": "Тип", "local.filterAll": "Все типы", "local.sort": "Сортировка",
      "local.sortName": "По имени", "local.sortType": "По типу", "local.sortTime": "По дате создания", "local.openDirs": "Открыть папку",
      "local.newFolder": "Новая папка", "local.folderNamePh": "Название папки", "local.more": "Ещё",
      "local.moveTo": "Переместить в…", "local.moveTitle": "Переместить в папку", "local.moveCurrent": "Текущее расположение",
      "local.moved": "Перемещено в «{0}»", "local.folderCreated": "Папка создана",
      "local.open": "Открыть", "local.rearrange": "Автоупорядочить",
      "local.zoomIn": "Увеличить (Ctrl+=)", "local.zoomOut": "Уменьшить (Ctrl+-)", "local.zoomReset": "Сбросить до 100% (Ctrl+0)",
      "local.zoomHint": "Масштаб обложек: Ctrl+колесо или элемент в правом нижнем углу · Ctrl+= / Ctrl+- шаг · Ctrl+0 сброс",
      "local.delFolder": "Удалить папку",
      "local.delFolderBody": "«{0}» и всё его содержимое будет удалено безвозвратно. Отменить это нельзя.",
      "local.delFolderCount": "Внутри {0} обоев",
      "local.folderEmpty": "Эта папка пуста",
      "local.folderEmptyHint": "Щёлкните обои правой кнопкой и выберите «Переместить в…» или перетащите их на карточку папки",
      "local.searchEmpty": "Подходящих обоев нет",
      "local.needUpdate": "Для управления папками обновите Giantapp Wallpaper до новой версии",
      "local.empty": "Пока нет обоев",
      "local.emptyHint": "Поместите видео или изображения в папку обоев",
      "pv.title": "Предпросмотр", "pv.noPreview": "Этот тип нельзя предпросмотреть",
      "pv.engine": "Видеодвижок: {0}", "pv.engineNote": "MPV не может отображаться внутри — предпросмотр через встроенный веб-плеер",
      "pv.mouseOff": "Взаимодействие с мышью выключено",
      "pv.loadFailed": "Не удалось загрузить — формат может не поддерживаться встроенным плеером",
      "pv.max": "Развернуть", "pv.restore": "Восстановить", "pv.wheelHint": "Колесо мыши — предыдущий / следующий",
      "create.wallpaper": "Создать обои", "create.playlist": "Создать плейлист", "create.editWallpaper": "Изменить обои", "create.editList": "Изменить плейлист",
      "create.titleField": "Название", "create.titlePh": "Придумайте название для {0}", "create.type": "Тип",
      "create.file": "Нажмите, чтобы выбрать файл, или перетащите его сюда", "create.fileHint": "Изображение / GIF / видео / веб-страница (≤ 500 МБ)",
      "create.pickFolder": "Выбрать папку (веб-обои)", "create.webPack": "Файлов: {0} · {1}", "create.webNeedHtml": "В папке нет веб-страниц",
      "create.webAskTitle": "Импорт веб-обоев", "create.webAskBody": "Импортировать всю папку? Ресурсы рядом со страницей тоже будут добавлены", "create.webAskYes": "Вся папка", "create.webAskNo": "Только этот файл",
      "create.webBigTitle": "Большая папка", "create.webBigBody": "Всего {0} — импорт может занять время. Продолжить?",
      "create.importing": "Импорт {0}%", "create.imported": "Импортировано", "create.reselect": "Заменить",
      "create.addMembers": "Добавить обои", "create.members": "Элементов: {0}", "create.membersEmpty": "Пока пусто — добавьте обои из библиотеки",
      "create.creating": "Создание…", "create.titleEmpty": "Укажите название", "create.noFile": "Сначала выберите файл",
      "create.listEmpty": "Плейлист требует хотя бы один элемент", "create.created": "Создано", "create.createFailed": "Не удалось создать: {0}",
      "create.updated": "Сохранено", "create.coverFailed": "Не удалось создать обложку (пропущено, создастся позже автоматически)",
      "create.unsaved": "Есть несохранённые изменения", "create.unsavedBody": "При закрытии изменения будут потеряны. Закрыть?",
      "create.pickTitle": "Выбор элементов", "create.pickHint": "Выбирайте карточки; плейлисты нельзя вкладывать друг в друга", "create.selectAll": "Выбрать все",
      "set.title": "Настройки обоев", "set.sub": "Параметры воспроизведения «{0}», применяются сразу после сохранения",
      "set.overlayTitle": "Наложения", "set.overlaySub": "Наложение для «{0}», применяется сразу после сохранения",
      "set.overlayTime": "Часы", "set.overlayTimeHint": "Показывать часы с системным временем в правом верхнем углу",
      "set.duration": "Длительность", "set.durationHint": "Сколько обои остаются в плейлисте (чч:мм)",
      "set.playMode": "Режим воспроизведения", "set.order": "По порядку", "set.random": "Случайно",
      "set.mouse": "Взаимодействие с мышью", "set.mouseHint": "Разрешить обоям реагировать на мышь",
      "set.player": "Видеодвижок", "set.engine0": "По умолчанию", "set.engine1": "MPV-плеер", "set.engine2": "Веб-плеер", "set.engine3": "Встроенный MPV-плеер",
      "set.hwdec": "Аппаратное декодирование", "set.hwdecHint": "Заметно снижает нагрузку на CPU при воспроизведении видео",
      "set.panscan": "Заполнение с кадрированием", "set.panscanHint": "Обрезать кадр, чтобы заполнить весь экран",
      "set.fit": "Подгонка", "set.fit0": "По центру", "set.fit1": "Плитка", "set.fit2": "Растянуть", "set.fit3": "Вписать", "set.fit4": "Заполнить", "set.fit5": "На несколько экранов",
      "set.keep": "Оставить обои", "set.keepHint": "Не восстанавливать исходный рабочий стол при выходе",
      "set.saved": "Настройки сохранены и применены", "set.saveFailed": "Не удалось сохранить: {0}",
      "dock.stop": "Стоп", "dock.pause": "Пауза", "dock.resume": "Продолжить", "dock.prev": "Предыдущий", "dock.next": "Следующий",
      "dock.volume": "Громкость", "dock.audio": "Звук из", "dock.mute": "Без звука", "dock.nothing": "Рабочий стол отдыхает",
      "dock.nothingHint": "Щёлкните любые обои, чтобы применить", "dock.focus": "Управление",
      "dock.screensHint": "Щёлкните экран, чтобы выбрать его (повторный щелчок снимает выбор); без выбора действие применяется ко всем экранам; перетащите обои на экран, чтобы играть там",
      "dock.blankTitle": "Щёлкните обои, чтобы применить, или перетащите их сюда",
      "dock.blankHint": "Щёлкните обои в библиотеке, чтобы применить; или перетащите их на экран, чтобы воспроизвести там",
      "dl.title": "Загрузки", "dl.sub": "Активные задачи и история", "dl.active": "Активные", "dl.activeEmpty": "Нет активных загрузок",
      "dl.emptyHint": "Скачивайте обои из Хаба — загрузки появятся здесь",
      "dl.history": "История", "dl.historyEmpty": "Истории загрузок нет", "dl.clear": "Очистить историю",
      "dl.clearConfirm": "Очистить все записи загрузок? Скачанные файлы обоев сохранятся.", "dl.cleared": "История очищена",
      "dl.cancel": "Отменить", "dl.removed": "Запись удалена",
      "hub.title": "Хаб", "hub.login": "Войти", "hub.loginHint": "Вход выполняется в отдельном окне",
      "hub.reload": "Обновить", "hub.browser": "Открыть в браузере", "hub.failed": "Не удалось загрузить — проверьте сеть",
      "cfg.general": "Общие", "cfg.wallpaper": "Обои", "cfg.appearance": "Внешний вид",
      "cfg.autoStart": "Запуск при включении", "cfg.autoStartHint": "Запускать автоматически после входа в Windows",
      "cfg.hideWindow": "Скрывать главное окно при запуске", "cfg.hideWindowHint": "Только трей и рабочий стол",
      "cfg.headless": "Фоновый режим при автозапуске", "cfg.headlessHint": "Никаких окон при автозапуске (требуется запуск при включении)",
      "cfg.language": "Язык", "cfg.langApplied": "Язык переключён",
      "cfg.dirs": "Папки обоев", "cfg.dirsHint": "Первая — для сохранения новых, остальные — источники для чтения",
      "cfg.addDir": "Добавить папку", "cfg.choose": "Выбрать…", "cfg.covered": "При полном перекрытии",
      "cfg.covered0": "Продолжать воспроизведение", "cfg.covered1": "Автопауза", "cfg.covered2": "Остановить",
      "cfg.keep": "Оставить обои", "cfg.keepHint": "Сохранить снимок обоев после выхода и восстановить при следующем запуске",
      "cfg.player": "Видеодвижок по умолчанию", "cfg.mpvMissing": "MPV не найден — автоматическая загрузка улучшит воспроизведение видео",
      "cfg.mpvDownload": "Скачать MPV автоматически", "cfg.mpvCancel": "Отменить загрузку", "cfg.mpvProgress": "Загрузка {0}%",
      "cfg.mpvDone": "MPV готов", "cfg.mpvFail": "Не удалось загрузить MPV: {0}", "cfg.mpvFolder": "Открыть папку MPV",
      "cfg.mode": "Режим оформления", "cfg.modeSys": "Системный", "cfg.modeLight": "Светлый", "cfg.modeDark": "Тёмный",
      "cfg.skins": "Скины", "cfg.skinHint": "Скины меняют стиль всего приложения; скины типа app заменяют интерфейс, типа style — только стили",
      "cfg.skinOpen": "Открыть папку скинов", "cfg.skinCurrent": "Используется", "cfg.skinInvalid": "Недействителен", "cfg.skinApplied": "Применён «{0}»",
      "cfg.skinCustom": "Свой скин", "cfg.skinDocHint": "Скопируйте руководство целиком в любую ИИ (ChatGPT / Claude…), сгенерируйте скин по спецификации и положите папку в каталог скинов.", "cfg.skinDocCopy": "Копировать всё", "cfg.skinDocCopied": "Скопировано — вставьте в ИИ, чтобы создать скин",
      "cfg.about": "Об этом скине", "cfg.reloadHint": "Некоторые параметры после сохранения обновляют интерфейс",
      "cfg.update": "Обновления",
      "upd.uiTitle": "Горячее обновление интерфейса", "upd.uiHint": "После настройки адреса горячего обновления новые версии интерфейса доступны без обновления программы; возврат к встроенному интерфейсу — в любой момент", "upd.uiUrl": "Адрес горячего обновления", "upd.channelHint": "Также определяет манифест горячего обновления интерфейса", "upd.uiUrlHint": "Пусто — следовать каналу обновлений, или адрес ui.json", "upd.uiAuto": "Обновлять интерфейс при запуске", "upd.uiActive": "Используется обновлённый интерфейс (версия {0}, применено {1})", "upd.uiBuiltin": "Используется встроенный интерфейс", "upd.uiCheck": "Проверить обновления", "upd.uiApply": "Скачать и применить", "upd.uiRestore": "Вернуть встроенный интерфейс", "upd.restoreConfirm": "Загруженный интерфейс будет удалён, восстановится встроенный интерфейс из поставки программы. Продолжить?", "upd.upToDate": "У вас последняя версия", "upd.found": "Найдена новая версия {0}", "upd.progress": "Загрузка {0}%", "upd.applied": "Интерфейс обновлён до {0}", "upd.restored": "Возвращён встроенный интерфейс", "upd.appTitle": "Обновления программы", "upd.appHint": "При включённом автообновлении новые версии загружаются автоматически; установка всегда требует подтверждения", "upd.channel": "Канал обновлений", "upd.chStable": "Стабильный", "upd.chPreview": "Предпросмотр", "upd.chOff": "Выключен", "upd.autoDownload": "Автоматически загружать новые версии", "upd.appUrl": "Адрес сервера обновлений", "upd.appCheck": "Проверить обновления", "upd.download": "Скачать обновление", "upd.downloaded": "Версия {0} загружена", "upd.install": "Установить и перезапустить", "upd.later": "Не сейчас", "upd.installing": "Приложение закрывается и запускается установщик; после завершения будет перезапуск", "upd.current": "Текущая версия {0}", "upd.readyBar": "Новая версия {0} загружена и готова",
      "about.title": "О программе", "about.logs": "Открыть папку журналов", "about.feedback": "Обратная связь", "about.github": "Страница проекта",
      "about.review": "Оценить в магазине", "about.star": "Поставить звезду", "about.author": "Сделано {0}",
      "about.exit": "Выйти из приложения", "about.exitConfirm": "Выйти из Giantapp Wallpaper? Обои будут удалены с рабочего стола (можно сохранить в Настройки → Обои).",
      "about.exited": "До встречи", "about.skinBy": "Работает на системе скинов Giantapp Wallpaper",
    },
    es: {
      "nav.library": "Biblioteca", "nav.local": "Local", "nav.downloads": "Descargas", "nav.hub": "Hub", "nav.settings": "Ajustes", "nav.about": "Acerca de",
      "common.apply": "Aplicar", "common.allScreens": "Todas las pantallas", "common.screen": "Pantalla {0}", "common.primary": "Principal",
      "common.cancel": "Cancelar", "common.ok": "Aceptar", "common.delete": "Eliminar", "common.save": "Guardar", "common.saving": "Guardando…",
      "common.close": "Cerrar", "common.edit": "Editar", "common.create": "Crear", "common.location": "Abrir ubicación", "common.refresh": "Actualizar",
      "common.playing": "Reproduciendo", "common.paused": "En pausa", "common.idle": "Inactivo", "common.demo": "Modo demo",
      "common.demoHint": "Aplicación no detectada — mostrando datos de ejemplo", "common.add": "Agregar", "common.remove": "Quitar",
      "common.saved": "Guardado", "common.opFailed": "Error: {0}", "common.done": "Listo", "common.back": "Atrás",
      "card.clickApplyAll": "Clic para aplicar a todas las pantallas", "card.clickApplyScreen": "Clic para aplicar a {0}",
      "type.1": "Imagen", "type.2": "GIF", "type.3": "Video", "type.4": "Web", "type.5": "Exe", "type.6": "Lista", "type.0": "Auto",
      "lib.title": "Biblioteca", "lib.count": "{0} fondos", "lib.search": "Buscar fondos…", "lib.empty": "Aún no hay fondos",
      "lib.emptyHint": "Pulsa Crear para importar un video o imagen local, o descarga uno del Hub",
      "lib.target": "Aplicar a", "lib.playingBadge": "Reproduciendo",
      "local.title": "Biblioteca local", "local.count": "{0} elem.", "local.target": "Aplicar a",
      "local.filter": "Tipo", "local.filterAll": "Todos los tipos", "local.sort": "Ordenar",
      "local.sortName": "Por nombre", "local.sortType": "Por tipo", "local.sortTime": "Por fecha de creación", "local.openDirs": "Abrir carpeta",
      "local.newFolder": "Nueva carpeta", "local.folderNamePh": "Nombre de la carpeta", "local.more": "Más opciones",
      "local.moveTo": "Mover a…", "local.moveTitle": "Mover a carpeta", "local.moveCurrent": "Ubicación actual",
      "local.moved": "Movido a «{0}»", "local.folderCreated": "Carpeta creada",
      "local.open": "Abrir", "local.rearrange": "Ordenar automáticamente",
      "local.zoomIn": "Acercar (Ctrl+=)", "local.zoomOut": "Alejar (Ctrl+-)", "local.zoomReset": "Restablecer al 100% (Ctrl+0)",
      "local.zoomHint": "Zoom de miniaturas: Ctrl+rueda o el control inferior derecho · Ctrl+= / Ctrl+- paso · Ctrl+0 restablecer",
      "local.delFolder": "Eliminar carpeta",
      "local.delFolderBody": "«{0}» y todo su contenido se eliminarán permanentemente. No se puede deshacer.",
      "local.delFolderCount": "Contiene {0} fondo(s)",
      "local.folderEmpty": "Esta carpeta está vacía",
      "local.folderEmptyHint": "Clic derecho en un fondo y elige «Mover a…», o arrástralo a una tarjeta de carpeta",
      "local.searchEmpty": "Sin fondos coincidentes",
      "local.needUpdate": "Organizar carpetas requiere actualizar Giantapp Wallpaper a una versión nueva",
      "local.empty": "Aún no hay fondos",
      "local.emptyHint": "Coloca videos o imágenes en la carpeta de fondos",
      "pv.title": "Vista previa", "pv.noPreview": "Este tipo no admite vista previa",
      "pv.engine": "Motor de video: {0}", "pv.engineNote": "MPV no puede mostrarse integrado — se previsualiza con el reproductor web incorporado",
      "pv.mouseOff": "Interacción del ratón desactivada",
      "pv.loadFailed": "Error al cargar — el formato puede no ser compatible con el reproductor incorporado",
      "pv.max": "Maximizar", "pv.restore": "Restaurar", "pv.wheelHint": "Rueda del ratón para anterior / siguiente",
      "create.wallpaper": "Nuevo fondo", "create.playlist": "Nueva lista", "create.editWallpaper": "Editar fondo", "create.editList": "Editar lista",
      "create.titleField": "Título", "create.titlePh": "Ponle nombre a tu {0}", "create.type": "Tipo",
      "create.file": "Haz clic para elegir un archivo, o suéltalo aquí", "create.fileHint": "Imagen / GIF / video / página web (≤ 500 MB)",
      "create.pickFolder": "Elegir carpeta (fondo web)", "create.webPack": "{0} archivos · {1}", "create.webNeedHtml": "No hay página web en esa carpeta",
      "create.webAskTitle": "Importar fondo web", "create.webAskBody": "¿Incluir toda la carpeta? También se importarán los recursos junto a esta página", "create.webAskYes": "Incluir toda la carpeta", "create.webAskNo": "Solo este archivo",
      "create.webBigTitle": "Carpeta grande", "create.webBigBody": "{0} en total — la importación puede tardar. ¿Continuar?",
      "create.importing": "Importando {0}%", "create.imported": "Importado", "create.reselect": "Reemplazar",
      "create.addMembers": "Agregar fondos", "create.members": "{0} miembros", "create.membersEmpty": "Aún no hay miembros — agrega desde tu biblioteca",
      "create.creating": "Creando…", "create.titleEmpty": "El título es obligatorio", "create.noFile": "Elige un archivo primero",
      "create.listEmpty": "Una lista necesita al menos un miembro", "create.created": "Creado", "create.createFailed": "Error al crear: {0}",
      "create.updated": "Guardado", "create.coverFailed": "Error al generar la portada (omitido)",
      "create.unsaved": "Cambios sin guardar", "create.unsavedBody": "¿Cerrar y perder estos cambios?",
      "create.pickTitle": "Elegir miembros", "create.pickHint": "Haz clic en las tarjetas para seleccionar; las listas no se pueden anidar", "create.selectAll": "Seleccionar todo",
      "set.title": "Ajustes del fondo", "set.sub": "Opciones de reproducción de «{0}», se aplican al guardar",
      "set.overlayTitle": "Superposiciones", "set.overlaySub": "Superposición de «{0}», se aplica al guardar",
      "set.overlayTime": "Reloj", "set.overlayTimeHint": "Muestra un reloj con la hora del sistema en la esquina superior derecha",
      "set.duration": "Duración", "set.durationHint": "Cuánto tiempo permanece este fondo en la lista (hh:mm)",
      "set.playMode": "Modo de reproducción", "set.order": "En orden", "set.random": "Aleatorio",
      "set.mouse": "Interacción del ratón", "set.mouseHint": "Permitir que el fondo reaccione al ratón",
      "set.player": "Motor de video", "set.engine0": "Predeterminado", "set.engine1": "Reproductor MPV", "set.engine2": "Reproductor web", "set.engine3": "Reproductor MPV integrado",
      "set.hwdec": "Decodificación por hardware", "set.hwdecHint": "Reduce mucho el uso de CPU al reproducir video",
      "set.panscan": "Rellenar y recortar", "set.panscanHint": "Recorta la imagen para llenar toda la pantalla",
      "set.fit": "Ajuste", "set.fit0": "Centrar", "set.fit1": "Mosaico", "set.fit2": "Estirar", "set.fit3": "Ajustar", "set.fit4": "Rellenar", "set.fit5": "Expandir",
      "set.keep": "Mantener fondo", "set.keepHint": "No restaurar el escritorio original al salir",
      "set.saved": "Ajustes guardados y aplicados", "set.saveFailed": "Error al guardar: {0}",
      "dock.stop": "Detener", "dock.pause": "Pausa", "dock.resume": "Reanudar", "dock.prev": "Anterior", "dock.next": "Siguiente",
      "dock.volume": "Volumen", "dock.audio": "Audio de", "dock.mute": "Silencio", "dock.nothing": "El escritorio está descansando",
      "dock.nothingHint": "Haz clic en cualquier fondo para aplicarlo", "dock.focus": "Controlando",
      "dock.screensHint": "Haz clic en una pantalla para elegirla (clic de nuevo para quitar); sin pantalla elegida, los controles afectan a todas; arrastra un fondo a una pantalla para reproducirlo allí",
      "dock.blankTitle": "Haz clic en un fondo para aplicarlo, o arrástralo a este bloque",
      "dock.blankHint": "Haz clic en un fondo de la biblioteca para aplicarlo; o arrástralo a una pantalla para reproducirlo en ella",
      "dl.title": "Descargas", "dl.sub": "Tareas activas e historial", "dl.active": "Activas", "dl.activeEmpty": "Sin descargas activas",
      "dl.emptyHint": "Descarga fondos del Hub — aparecerán aquí",
      "dl.history": "Historial", "dl.historyEmpty": "Sin historial de descargas", "dl.clear": "Borrar historial",
      "dl.clearConfirm": "¿Borrar todos los registros de descarga? Los archivos de fondos descargados se conservan.", "dl.cleared": "Historial borrado",
      "dl.cancel": "Cancelar", "dl.removed": "Registro eliminado",
      "hub.title": "Hub", "hub.login": "Iniciar sesión", "hub.loginHint": "El inicio de sesión se realiza en una ventana aparte",
      "hub.reload": "Recargar", "hub.browser": "Abrir en el navegador", "hub.failed": "Error al cargar — revisa tu red",
      "cfg.general": "General", "cfg.wallpaper": "Fondo de pantalla", "cfg.appearance": "Apariencia",
      "cfg.autoStart": "Iniciar con Windows", "cfg.autoStartHint": "Ejecutarse automáticamente al iniciar sesión en Windows",
      "cfg.hideWindow": "Ocultar ventana principal al iniciar", "cfg.hideWindowHint": "Solo en la bandeja y el escritorio",
      "cfg.headless": "Segundo plano en el autoarranque", "cfg.headlessHint": "Sin ninguna ventana al autoiniciarse (requiere iniciar con Windows)",
      "cfg.language": "Idioma", "cfg.langApplied": "Idioma cambiado",
      "cfg.dirs": "Carpetas de fondos", "cfg.dirsHint": "La primera guarda los fondos nuevos, las demás son solo de lectura",
      "cfg.addDir": "Agregar carpeta", "cfg.choose": "Elegir…", "cfg.covered": "Al estar totalmente cubierto",
      "cfg.covered0": "Seguir reproduciendo", "cfg.covered1": "Pausa automática", "cfg.covered2": "Detener",
      "cfg.keep": "Mantener fondo", "cfg.keepHint": "Conserva la instantánea del fondo al salir y la restaura en el próximo inicio",
      "cfg.player": "Motor de video predeterminado", "cfg.mpvMissing": "MPV no encontrado — la descarga automática mejora el video",
      "cfg.mpvDownload": "Descargar MPV automáticamente", "cfg.mpvCancel": "Cancelar descarga", "cfg.mpvProgress": "Descargando {0}%",
      "cfg.mpvDone": "MPV está listo", "cfg.mpvFail": "Error al descargar MPV: {0}", "cfg.mpvFolder": "Abrir carpeta de MPV",
      "cfg.mode": "Modo de apariencia", "cfg.modeSys": "Sistema", "cfg.modeLight": "Claro", "cfg.modeDark": "Oscuro",
      "cfg.skins": "Skins", "cfg.skinHint": "Las skins cambian el estilo de toda la app; las de tipo app reemplazan la interfaz, las de tipo style solo sobrescriben estilos",
      "cfg.skinOpen": "Abrir carpeta de skins", "cfg.skinCurrent": "En uso", "cfg.skinInvalid": "No válido", "cfg.skinApplied": "Aplicada «{0}»",
      "cfg.skinCustom": "Skin personalizada", "cfg.skinDocHint": "Copia esta guía a cualquier IA (ChatGPT / Claude…) para generar una skin, luego coloca los archivos en la carpeta de skins.", "cfg.skinDocCopy": "Copiar todo", "cfg.skinDocCopied": "Copiado — pégalo en tu IA para generar una skin",
      "cfg.about": "Acerca de esta skin", "cfg.reloadHint": "Algunas opciones actualizan la interfaz después de guardar",
      "cfg.update": "Actualizaciones",
      "upd.uiTitle": "Actualización en caliente de la interfaz", "upd.uiHint": "Con una URL de actualización en caliente obtiene nuevas versiones de la interfaz sin actualizar la aplicación; restaurar vuelve a la interfaz integrada en cualquier momento", "upd.uiUrl": "URL de actualización en caliente", "upd.channelHint": "También determina el manifiesto de actualización en caliente seguido", "upd.uiUrlHint": "Vacío = seguir el canal de actualización, o URL ui.json", "upd.uiAuto": "Actualizar la interfaz al iniciar", "upd.uiActive": "Usando la interfaz actualizada (versión {0}, aplicada el {1})", "upd.uiBuiltin": "Usando la interfaz integrada", "upd.uiCheck": "Buscar actualizaciones", "upd.uiApply": "Descargar y aplicar", "upd.uiRestore": "Restaurar interfaz integrada", "upd.restoreConfirm": "Se eliminará la interfaz descargada y se restaurará la incluida con la aplicación. ¿Continuar?", "upd.upToDate": "Ya tiene la última versión", "upd.found": "Nueva versión {0} disponible", "upd.progress": "Descargando {0} %", "upd.applied": "Interfaz actualizada a {0}", "upd.restored": "Se restauró la interfaz integrada", "upd.appTitle": "Actualizaciones de la aplicación", "upd.appHint": "Con la actualización automática, las nuevas versiones se descargan solas; instalar siempre requiere su confirmación", "upd.channel": "Canal de actualización", "upd.chStable": "Estable", "upd.chPreview": "Vista previa", "upd.chOff": "Desactivado", "upd.autoDownload": "Descargar nuevas versiones automáticamente", "upd.appUrl": "URL del servidor de actualizaciones", "upd.appCheck": "Buscar actualizaciones", "upd.download": "Descargar actualización", "upd.downloaded": "La versión {0} se ha descargado", "upd.install": "Instalar y reiniciar", "upd.later": "Ahora no", "upd.installing": "Cerrando y lanzando el instalador; la aplicación se reiniciará después", "upd.current": "Versión actual {0}", "upd.readyBar": "Nueva versión {0} descargada y lista",
      "about.title": "Acerca de", "about.logs": "Abrir carpeta de registros", "about.feedback": "Comentarios", "about.github": "Página del proyecto",
      "about.review": "Valorar la app", "about.star": "Dar una estrella", "about.author": "Creado por {0}",
      "about.exit": "Salir de la aplicación", "about.exitConfirm": "¿Salir de Giantapp Wallpaper? Los fondos se quitarán (puedes conservarlos en Ajustes → Fondo de pantalla).",
      "about.exited": "¡Hasta pronto!", "about.skinBy": "Impulsado por el sistema de skins de Giantapp Wallpaper",
    },
    "zh-Hant": {
      "nav.library": "桌布庫", "nav.local": "本機庫", "nav.downloads": "下載", "nav.hub": "社群", "nav.settings": "設定", "nav.about": "關於",
      "common.apply": "套用", "common.allScreens": "全部螢幕", "common.screen": "螢幕 {0}", "common.primary": "主螢幕",
      "common.cancel": "取消", "common.ok": "確定", "common.delete": "刪除", "common.save": "儲存", "common.saving": "儲存中…",
      "common.close": "關閉", "common.edit": "編輯", "common.create": "建立", "common.location": "開啟位置", "common.refresh": "重新整理",
      "common.playing": "播放中", "common.paused": "已暫停", "common.idle": "閒置", "common.demo": "示範模式",
      "common.demoHint": "未偵測到應用程式環境，正在顯示模擬資料", "common.add": "新增", "common.remove": "移除",
      "common.saved": "已儲存", "common.opFailed": "操作失敗：{0}", "common.done": "完成", "common.back": "返回",
      "card.clickApplyAll": "單擊套用到全部螢幕", "card.clickApplyScreen": "單擊套用到{0}",
      "type.1": "圖片", "type.2": "動圖", "type.3": "影片", "type.4": "Web", "type.5": "Exe", "type.6": "清單", "type.0": "自動偵測",
      "lib.title": "桌布庫", "lib.count": "{0} 個桌布", "lib.search": "搜尋桌布…", "lib.empty": "還沒有桌布",
      "lib.emptyHint": "點擊右上角「建立」匯入本機影片或圖片，或從社群下載",
      "lib.target": "套用到", "lib.playingBadge": "正在播放",
      "local.title": "本機庫", "local.count": "{0} 項", "local.target": "套用到",
      "local.filter": "類型", "local.filterAll": "全部類型", "local.sort": "排序",
      "local.sortName": "按名稱", "local.sortType": "按類型", "local.sortTime": "按建立時間", "local.openDirs": "開啟目錄",
      "local.newFolder": "新建資料夾", "local.folderNamePh": "資料夾名稱", "local.more": "更多選項",
      "local.moveTo": "移動到…", "local.moveTitle": "移動到資料夾", "local.moveCurrent": "目前位置",
      "local.moved": "已移動到「{0}」", "local.folderCreated": "資料夾已建立",
      "local.open": "開啟", "local.rearrange": "自動整理",
      "local.zoomIn": "放大（Ctrl+=）", "local.zoomOut": "縮小（Ctrl+-）", "local.zoomReset": "重設為 100%（Ctrl+0）",
      "local.zoomHint": "封面縮放：Ctrl+滾輪 或右下角控制項調整 · Ctrl+= / Ctrl+- 步進 · Ctrl+0 重設",
      "local.delFolder": "刪除資料夾",
      "local.delFolderBody": "「{0}」和其中的全部內容將被永久刪除，此操作無法復原。",
      "local.delFolderCount": "其中包含 {0} 個桌布",
      "local.folderEmpty": "這個資料夾是空的",
      "local.folderEmptyHint": "右鍵桌布選擇「移動到…」，或直接把桌布拖到資料夾卡片上",
      "local.searchEmpty": "沒有符合的桌布",
      "local.needUpdate": "資料夾整理需要先更新巨應桌布到新版本",
      "local.empty": "還沒有桌布",
      "local.emptyHint": "把影片或圖片放進桌布目錄即可",
      "pv.title": "預覽", "pv.noPreview": "該類型不支援預覽",
      "pv.engine": "影片引擎：{0}", "pv.engineNote": "MPV 引擎無法內嵌預覽，已改用內建 Web 播放器呈現",
      "pv.mouseOff": "滑鼠互動已關閉",
      "pv.loadFailed": "載入失敗：目前格式可能不受內建播放器支援",
      "pv.max": "放大", "pv.restore": "還原", "pv.wheelHint": "滾輪上下切換上一個 / 下一個",
      "create.wallpaper": "建立桌布", "create.playlist": "建立播放清單", "create.editWallpaper": "編輯桌布", "create.editList": "編輯清單",
      "create.titleField": "標題", "create.titlePh": "幫{0}取個名字", "create.type": "類型",
      "create.file": "點擊選擇檔案，或把檔案拖到這裡", "create.fileHint": "支援圖片 / 動圖 / 影片 / 網頁（≤ 500MB）",
      "create.pickFolder": "選擇資料夾（Web 桌布）", "create.webPack": "{0} 個檔案 · {1}", "create.webNeedHtml": "資料夾裡沒有網頁檔案",
      "create.webAskTitle": "匯入 Web 桌布", "create.webAskBody": "是否包含整個資料夾？將同時匯入該網頁所在目錄的全部資源", "create.webAskYes": "包含整個資料夾", "create.webAskNo": "僅此檔案",
      "create.webBigTitle": "資料夾較大", "create.webBigBody": "共 {0}，匯入可能需要一些時間，確定繼續嗎？",
      "create.importing": "匯入中 {0}%", "create.imported": "已匯入", "create.reselect": "重新選擇",
      "create.addMembers": "新增桌布", "create.members": "成員 {0}", "create.membersEmpty": "還沒有成員，點擊「新增桌布」從庫中選擇",
      "create.creating": "建立中…", "create.titleEmpty": "標題不能為空", "create.noFile": "請先選擇檔案",
      "create.listEmpty": "播放清單至少需要一個成員", "create.created": "建立成功", "create.createFailed": "建立失敗：{0}",
      "create.updated": "已儲存", "create.coverFailed": "封面產生失敗（已跳過，稍後可自動產生）",
      "create.unsaved": "有未儲存的修改", "create.unsavedBody": "關閉後將遺失這些修改，確定關閉嗎？",
      "create.pickTitle": "選擇成員", "create.pickHint": "點擊卡片選擇，播放清單不能嵌套播放清單", "create.selectAll": "全選",
      "set.title": "桌布設定", "set.sub": "「{0}」的播放參數，儲存後立即生效",
      "set.overlayTitle": "疊加設定", "set.overlaySub": "「{0}」的畫面疊加，儲存後立即生效",
      "set.overlayTime": "時間時鐘", "set.overlayTimeHint": "在畫面右上角顯示即時系統時間",
      "set.duration": "播放時長", "set.durationHint": "該桌布在播放清單中停留的時間（時:分）",
      "set.playMode": "播放模式", "set.order": "順序播放", "set.random": "隨機播放",
      "set.mouse": "滑鼠互動", "set.mouseHint": "允許桌布回應滑鼠移動與點擊",
      "set.player": "影片引擎", "set.engine0": "預設", "set.engine1": "MPV 播放器", "set.engine2": "Web 播放器", "set.engine3": "內嵌 MPV 播放器",
      "set.hwdec": "硬體解碼", "set.hwdecHint": "顯著降低播放影片時的 CPU 佔用",
      "set.panscan": "鋪滿拉伸", "set.panscanHint": "裁切畫面以鋪滿整個螢幕",
      "set.fit": "契合度", "set.fit0": "置中", "set.fit1": "平鋪", "set.fit2": "拉伸", "set.fit3": "適應", "set.fit4": "填滿", "set.fit5": "跨螢幕",
      "set.keep": "保留桌布", "set.keepHint": "離開應用程式時不還原原桌面桌布",
      "set.saved": "設定已儲存並生效", "set.saveFailed": "儲存失敗：{0}",
      "dock.stop": "停止", "dock.pause": "暫停", "dock.resume": "繼續播放", "dock.prev": "上一項", "dock.next": "下一項",
      "dock.volume": "音量", "dock.audio": "音源", "dock.mute": "靜音", "dock.nothing": "桌面正在休息",
      "dock.nothingHint": "點擊任意桌布即可套用", "dock.focus": "正在控制",
      "dock.screensHint": "點擊選擇要操作的螢幕（再點取消）；未選螢幕時操作作用於全部螢幕；把桌布拖到螢幕區塊上即可在該螢幕播放",
      "dock.blankTitle": "點擊桌布生效，或拖桌布到此區塊播放",
      "dock.blankHint": "點擊庫中桌布即可生效；也可把桌布拖到此螢幕區塊上，直接在該螢幕播放",
      "dl.title": "下載", "dl.sub": "下載任務與歷史記錄", "dl.active": "進行中", "dl.activeEmpty": "暫無下載任務",
      "dl.emptyHint": "從社群發現喜歡的桌布，下載記錄會顯示在這裡",
      "dl.history": "歷史記錄", "dl.historyEmpty": "暫無下載記錄", "dl.clear": "清空記錄",
      "dl.clearConfirm": "將清空全部下載記錄，不會刪除已下載的桌布檔案。確定清空嗎？", "dl.cleared": "記錄已清空",
      "dl.cancel": "取消任務", "dl.removed": "記錄已刪除",
      "hub.title": "社群", "hub.login": "登入帳號", "hub.loginHint": "將在獨立視窗中完成登入",
      "hub.reload": "重新載入", "hub.browser": "在瀏覽器開啟", "hub.failed": "頁面載入失敗，請檢查網路",
      "cfg.general": "一般", "cfg.wallpaper": "桌布", "cfg.appearance": "外觀",
      "cfg.autoStart": "開機啟動", "cfg.autoStartHint": "登入 Windows 後自動執行",
      "cfg.hideWindow": "啟動時隱藏主視窗", "cfg.hideWindowHint": "啟動後只在工具列通知區與桌面生效",
      "cfg.headless": "開機自啟時背景執行", "cfg.headlessHint": "自啟時不顯示任何視窗（需先開啟開機啟動）",
      "cfg.language": "語言", "cfg.langApplied": "語言已切換",
      "cfg.dirs": "桌布目錄", "cfg.dirsHint": "第一個為儲存目錄，其餘為讀取目錄",
      "cfg.addDir": "新增目錄", "cfg.choose": "選擇…", "cfg.covered": "被完全遮擋時",
      "cfg.covered0": "繼續播放", "cfg.covered1": "自動暫停", "cfg.covered2": "停止播放",
      "cfg.keep": "保留桌布", "cfg.keepHint": "離開後保留桌布快照，下次啟動自動還原桌布",
      "cfg.player": "預設影片引擎", "cfg.mpvMissing": "未偵測到 MPV —— 自動下載後影片播放效能更好",
      "cfg.mpvDownload": "自動下載 MPV", "cfg.mpvCancel": "取消下載", "cfg.mpvProgress": "下載中 {0}%",
      "cfg.mpvDone": "MPV 已就緒", "cfg.mpvFail": "MPV 下載失敗：{0}", "cfg.mpvFolder": "開啟 MPV 目錄",
      "cfg.mode": "外觀模式", "cfg.modeSys": "跟隨系統", "cfg.modeLight": "淺色", "cfg.modeDark": "深色",
      "cfg.skins": "皮膚", "cfg.skinHint": "皮膚可整體更換介面風格；app 型替換介面，style 型覆蓋樣式",
      "cfg.skinOpen": "開啟皮膚目錄", "cfg.skinCurrent": "使用中", "cfg.skinInvalid": "不可用", "cfg.skinApplied": "已套用「{0}」",
      "cfg.skinCustom": "自訂皮膚", "cfg.skinDocHint": "把開發指南全文複製給任意 AI（ChatGPT / Claude 等），按規範產生皮膚檔案後放入皮膚目錄即可使用。", "cfg.skinDocCopy": "複製全文", "cfg.skinDocCopied": "已複製全文，可貼給 AI 產生皮膚",
      "cfg.about": "關於此皮膚", "cfg.reloadHint": "部分選項儲存後介面會自動重新整理",
      "cfg.update": "更新",
      "upd.uiTitle": "介面熱更新", "upd.uiHint": "設定熱更新位址後，無需升級程式即可取得新版介面；還原可隨時回到隨程式發佈的內建介面", "upd.uiUrl": "熱更新位址", "upd.channelHint": "同時決定介面熱更新跟隨的清單", "upd.uiUrlHint": "留空跟隨更新通道，或填 ui.json 清單位址", "upd.uiAuto": "啟動時自動更新介面", "upd.uiActive": "目前使用熱更新介面（版本 {0}，套用時間 {1}）", "upd.uiBuiltin": "目前使用內建介面", "upd.uiCheck": "檢查更新", "upd.uiApply": "下載並套用", "upd.uiRestore": "還原內建介面", "upd.restoreConfirm": "將刪除已下載的熱更新介面並還原到隨程式發佈的內建介面。確定要繼續嗎？", "upd.upToDate": "已是最新版本", "upd.found": "發現新版本 {0}", "upd.progress": "下載中 {0}%", "upd.applied": "介面已更新到 {0}", "upd.restored": "已還原到內建介面", "upd.appTitle": "程式更新", "upd.appHint": "開啟自動更新後發現新版本會自動下載，安裝始終由你確認", "upd.channel": "更新通道", "upd.chStable": "正式版", "upd.chPreview": "預覽版", "upd.chOff": "關閉", "upd.autoDownload": "自動下載新版本", "upd.appUrl": "更新伺服器位址", "upd.appCheck": "檢查更新", "upd.download": "下載更新", "upd.downloaded": "新版本 {0} 已下載完成", "upd.install": "安裝並重新啟動", "upd.later": "暫不安裝", "upd.installing": "正在結束並啟動安裝程式，完成後自動重新啟動", "upd.current": "目前版本 {0}", "upd.readyBar": "發現新版本 {0}，已下載完成",
      "about.title": "關於", "about.logs": "開啟記錄檔目錄", "about.feedback": "問題回饋", "about.github": "專案首頁",
      "about.review": "商店好評", "about.star": "給個 Star", "about.author": "{0} 出品",
      "about.exit": "結束應用程式", "about.exitConfirm": "要結束巨應桌布嗎？桌面桌布將被清除（可在 設定→桌布 中保留）。",
      "about.exited": "已結束", "about.skinBy": "本皮膚由巨應桌布皮膚系統驅動",
    },
    ja: {
      "nav.library": "ライブラリ", "nav.local": "ローカル", "nav.downloads": "ダウンロード", "nav.hub": "コミュニティ", "nav.settings": "設定", "nav.about": "このアプリについて",
      "common.apply": "適用", "common.allScreens": "すべての画面", "common.screen": "画面 {0}", "common.primary": "メイン",
      "common.cancel": "キャンセル", "common.ok": "OK", "common.delete": "削除", "common.save": "保存", "common.saving": "保存中…",
      "common.close": "閉じる", "common.edit": "編集", "common.create": "作成", "common.location": "場所を開く", "common.refresh": "更新",
      "common.playing": "再生中", "common.paused": "一時停止中", "common.idle": "待機中", "common.demo": "デモモード",
      "common.demoHint": "アプリ環境が検出されないため、サンプルデータを表示中", "common.add": "追加", "common.remove": "削除",
      "common.saved": "保存しました", "common.opFailed": "操作に失敗：{0}", "common.done": "完了", "common.back": "戻る",
      "card.clickApplyAll": "クリックですべての画面に適用", "card.clickApplyScreen": "クリックで{0}に適用",
      "type.1": "画像", "type.2": "GIF", "type.3": "動画", "type.4": "Web", "type.5": "Exe", "type.6": "プレイリスト", "type.0": "自動判定",
      "lib.title": "ライブラリ", "lib.count": "壁紙 {0} 件", "lib.search": "壁紙を検索…", "lib.empty": "壁紙がまだありません",
      "lib.emptyHint": "右上の「作成」から動画や画像を読み込むか、コミュニティからダウンロードしましょう",
      "lib.target": "適用先", "lib.playingBadge": "再生中",
      "local.title": "ローカル", "local.count": "{0} 件", "local.target": "適用先",
      "local.filter": "種類", "local.filterAll": "すべての種類", "local.sort": "並べ替え",
      "local.sortName": "名前順", "local.sortType": "種類順", "local.sortTime": "作成日順", "local.openDirs": "フォルダを開く",
      "local.newFolder": "新しいフォルダ", "local.folderNamePh": "フォルダ名", "local.more": "その他の操作",
      "local.moveTo": "移動先…", "local.moveTitle": "フォルダへ移動", "local.moveCurrent": "現在の場所",
      "local.moved": "「{0}」へ移動しました", "local.folderCreated": "フォルダを作成しました",
      "local.open": "開く", "local.rearrange": "自動整理",
      "local.zoomIn": "拡大（Ctrl+=）", "local.zoomOut": "縮小（Ctrl+-）", "local.zoomReset": "100% に戻す（Ctrl+0）",
      "local.zoomHint": "サムネイルの拡大率：Ctrl+スクロール または右下の操作部で調整 · Ctrl+= / Ctrl+- で段階変更 · Ctrl+0 でリセット",
      "local.delFolder": "フォルダを削除",
      "local.delFolderBody": "「{0}」とその中身がすべて完全に削除されます。この操作は取り消せません。",
      "local.delFolderCount": "壁紙が {0} 件入っています",
      "local.folderEmpty": "このフォルダは空です",
      "local.folderEmptyHint": "壁紙を右クリックして「移動先…」を選ぶか、フォルダカードへドラッグしてください",
      "local.searchEmpty": "一致する壁紙がありません",
      "local.needUpdate": "フォルダ整理には最新版の Giantapp Wallpaper への更新が必要です",
      "local.empty": "壁紙がまだありません",
      "local.emptyHint": "壁紙フォルダに動画や画像を入れてください",
      "pv.title": "プレビュー", "pv.noPreview": "この種類はプレビューできません",
      "pv.engine": "動画エンジン：{0}", "pv.engineNote": "MPV エンジンは埋め込みプレビューできないため、内蔵 Web プレーヤーで表示しています",
      "pv.mouseOff": "マウス操作はオフです",
      "pv.loadFailed": "読み込みに失敗しました：この形式は内蔵プレーヤーで非対応の可能性があります",
      "pv.max": "拡大", "pv.restore": "元に戻す", "pv.wheelHint": "スクロールで前 / 次へ切り替え",
      "create.wallpaper": "壁紙を作成", "create.playlist": "プレイリストを作成", "create.editWallpaper": "壁紙を編集", "create.editList": "プレイリストを編集",
      "create.titleField": "タイトル", "create.titlePh": "{0}に名前をつける", "create.type": "種類",
      "create.file": "クリックしてファイルを選択、またはここにドロップ", "create.fileHint": "画像 / GIF / 動画 / ウェブページ（≤ 500MB）",
      "create.pickFolder": "フォルダを選択（Web 壁紙）", "create.webPack": "{0} ファイル · {1}", "create.webNeedHtml": "フォルダにウェブページがありません",
      "create.webAskTitle": "Web 壁紙を読み込む", "create.webAskBody": "フォルダごと読み込みますか？このページと同じ場所にあるリソースも一緒に取り込みます", "create.webAskYes": "フォルダごと", "create.webAskNo": "このファイルだけ",
      "create.webBigTitle": "フォルダが大きめです", "create.webBigBody": "合計 {0}。読み込みに時間がかかる可能性があります。続けますか？",
      "create.importing": "読み込み中 {0}%", "create.imported": "読み込みました", "create.reselect": "選び直す",
      "create.addMembers": "壁紙を追加", "create.members": "メンバー {0}", "create.membersEmpty": "メンバーがいません。「壁紙を追加」からライブラリ内で選んでください",
      "create.creating": "作成中…", "create.titleEmpty": "タイトルは必須です", "create.noFile": "先にファイルを選んでください",
      "create.listEmpty": "プレイリストには最低 1 つのメンバーが必要です", "create.created": "作成しました", "create.createFailed": "作成に失敗：{0}",
      "create.updated": "保存しました", "create.coverFailed": "サムネイルの生成に失敗しました（スキップ、後で自動生成されます）",
      "create.unsaved": "未保存の変更があります", "create.unsavedBody": "閉じると変更は失われます。閉じますか？",
      "create.pickTitle": "メンバーを選択", "create.pickHint": "カードをクリックして選択。プレイリストの入れ子はできません", "create.selectAll": "すべて選択",
      "set.title": "壁紙の設定", "set.sub": "「{0}」の再生パラメータ。保存するとすぐ反映されます",
      "set.overlayTitle": "オーバーレイ設定", "set.overlaySub": "「{0}」の画面オーバーレイ。保存するとすぐ反映されます",
      "set.overlayTime": "時計", "set.overlayTimeHint": "画面の右上にシステム時刻の時計を表示します",
      "set.duration": "再生時間", "set.durationHint": "プレイリストでこの壁紙が表示される時間（時:分）",
      "set.playMode": "再生モード", "set.order": "順番に再生", "set.random": "ランダム再生",
      "set.mouse": "マウス操作", "set.mouseHint": "壁紙がマウスの動きやクリックに反応するようにします",
      "set.player": "動画エンジン", "set.engine0": "既定", "set.engine1": "MPV プレーヤー", "set.engine2": "Web プレーヤー", "set.engine3": "内蔵 MPV プレーヤー",
      "set.hwdec": "ハードウェアデコード", "set.hwdecHint": "動画再生時の CPU 負荷を大幅に下げます",
      "set.panscan": "画面いっぱいに拡大", "set.panscanHint": "画面をクロップして全画面に合わせます",
      "set.fit": "表示サイズ", "set.fit0": "中央", "set.fit1": "タイル", "set.fit2": "引き伸ばし", "set.fit3": "合わせる", "set.fit4": "引き伸ばし（余白埋め）", "set.fit5": "またぐ",
      "set.keep": "壁紙を保持", "set.keepHint": "アプリ終了時に元のデスクトップ壁紙へ戻しません",
      "set.saved": "設定を保存して反映しました", "set.saveFailed": "保存に失敗：{0}",
      "dock.stop": "停止", "dock.pause": "一時停止", "dock.resume": "再生", "dock.prev": "前へ", "dock.next": "次へ",
      "dock.volume": "音量", "dock.audio": "音源", "dock.mute": "ミュート", "dock.nothing": "デスクトップは休憩中です",
      "dock.nothingHint": "好きな壁紙をクリックすると適用されます", "dock.focus": "操作中",
      "dock.screensHint": "操作する画面をクリックで選択（再クリックで解除）。未選択時はすべての画面に作用します。壁紙を画面ブロックへドラッグすると、その画面で再生します",
      "dock.blankTitle": "壁紙をクリックで適用、またはここへドラッグして再生",
      "dock.blankHint": "ライブラリの壁紙をクリックで適用。画面ブロックへドラッグすれば、その画面で直接再生できます",
      "dl.title": "ダウンロード", "dl.sub": "ダウンロードタスクと履歴", "dl.active": "実行中", "dl.activeEmpty": "実行中のダウンロードはありません",
      "dl.emptyHint": "コミュニティからお気に入りの壁紙を探しましょう。ダウンロード履歴がここに表示されます",
      "dl.history": "履歴", "dl.historyEmpty": "ダウンロード履歴はありません", "dl.clear": "履歴を消去",
      "dl.clearConfirm": "すべてのダウンロード履歴を消去します。ダウンロード済みの壁紙ファイルは削除されません。よろしいですか？", "dl.cleared": "履歴を消去しました",
      "dl.cancel": "タスクをキャンセル", "dl.removed": "記録を削除しました",
      "hub.title": "コミュニティ", "hub.login": "ログイン", "hub.loginHint": "別ウィンドウでログインします",
      "hub.reload": "再読み込み", "hub.browser": "ブラウザーで開く", "hub.failed": "ページを読み込めませんでした。ネットワークを確認してください",
      "cfg.general": "全般", "cfg.wallpaper": "壁紙", "cfg.appearance": "外観",
      "cfg.autoStart": "起動時に開始", "cfg.autoStartHint": "Windows にサインインしたら自動で起動します",
      "cfg.hideWindow": "起動時にメインウィンドウを隠す", "cfg.hideWindowHint": "起動後はタスクトレイとデスクトップだけ有効",
      "cfg.headless": "自動起動時にバックグラウンド実行", "cfg.headlessHint": "自動起動時はウィンドウを一切表示しません（先に「起動時に開始」をオンにしてください）",
      "cfg.language": "言語", "cfg.langApplied": "言語を切り替えました",
      "cfg.dirs": "壁紙フォルダ", "cfg.dirsHint": "1 つ目が保存先、残りは読み込み用です",
      "cfg.addDir": "フォルダを追加", "cfg.choose": "選択…", "cfg.covered": "完全に隠れたとき",
      "cfg.covered0": "再生を続ける", "cfg.covered1": "自動一時停止", "cfg.covered2": "停止する",
      "cfg.keep": "壁紙を保持", "cfg.keepHint": "終了後も壁紙のスナップショットを保持し、次回起動時に自動で復元します",
      "cfg.player": "既定の動画エンジン", "cfg.mpvMissing": "MPV が見つかりません —— 自動ダウンロードすると動画再生の性能が向上します",
      "cfg.mpvDownload": "MPV を自動ダウンロード", "cfg.mpvCancel": "ダウンロードをキャンセル", "cfg.mpvProgress": "ダウンロード中 {0}%",
      "cfg.mpvDone": "MPV が利用可能です", "cfg.mpvFail": "MPV のダウンロードに失敗：{0}", "cfg.mpvFolder": "MPV フォルダを開く",
      "cfg.mode": "外観モード", "cfg.modeSys": "システムに従う", "cfg.modeLight": "ライト", "cfg.modeDark": "ダーク",
      "cfg.skins": "スキン", "cfg.skinHint": "スキンでアプリ全体の見た目を切り替えられます。app 型は UI を置き換え、style 型はスタイルのみ上書きします",
      "cfg.skinOpen": "スキンフォルダを開く", "cfg.skinCurrent": "使用中", "cfg.skinInvalid": "利用不可", "cfg.skinApplied": "「{0}」を適用しました",
      "cfg.skinCustom": "カスタムスキン", "cfg.skinDocHint": "開発ガイドの全文を任意の AI（ChatGPT / Claude など）に貼り付けてスキンを生成し、フォルダをスキンフォルダに入れてください。", "cfg.skinDocCopy": "全文をコピー", "cfg.skinDocCopied": "コピーしました。AI に貼り付けてスキンを生成できます",
      "cfg.about": "このスキンについて", "cfg.reloadHint": "一部の設定は保存後に画面へ自動反映されます",
      "cfg.update": "更新",
      "upd.uiTitle": "UI ホットアップデート", "upd.uiHint": "ホットアップデート URL を設定すれば、アップグレードせずに新しい UI を取得できます。復元で同梱の内蔵 UI にいつでも戻せます", "upd.uiUrl": "ホットアップデート URL", "upd.channelHint": "UI ホットアップデートのマニフェストもこのチャンネルに追従", "upd.uiUrlHint": "空欄で更新チャンネルに追従、または ui.json の URL", "upd.uiAuto": "起動時に UI を自動更新", "upd.uiActive": "ホットアップデート UI を使用中（バージョン {0}、適用日時 {1}）", "upd.uiBuiltin": "内蔵 UI を使用中", "upd.uiCheck": "更新を確認", "upd.uiApply": "ダウンロードして適用", "upd.uiRestore": "内蔵 UI に復元", "upd.restoreConfirm": "ダウンロード済みの UI を削除し、アプリ同梱の内蔵 UI に戻します。続行しますか？", "upd.upToDate": "最新です", "upd.found": "新バージョン {0} が見つかりました", "upd.progress": "ダウンロード中 {0}%", "upd.applied": "UI を {0} に更新しました", "upd.restored": "内蔵 UI に復元しました", "upd.appTitle": "アプリの更新", "upd.appHint": "自動更新が有効な場合、新バージョンは自動ダウンロードされ、インストールは必ず確認後に実行されます", "upd.channel": "更新チャンネル", "upd.chStable": "安定版", "upd.chPreview": "プレビュー版", "upd.chOff": "オフ", "upd.autoDownload": "新バージョンを自動ダウンロード", "upd.appUrl": "更新サーバー URL", "upd.appCheck": "更新を確認", "upd.download": "更新をダウンロード", "upd.downloaded": "新バージョン {0} のダウンロードが完了しました", "upd.install": "インストールして再起動", "upd.later": "後で", "upd.installing": "終了してインストーラーを起動しています。完了後に自動で再起動します", "upd.current": "現在のバージョン {0}", "upd.readyBar": "新バージョン {0} のダウンロードが完了",
      "about.title": "このアプリについて", "about.logs": "ログフォルダを開く", "about.feedback": "フィードバック", "about.github": "プロジェクトページ",
      "about.review": "ストアで高評価", "about.star": "スターをつける", "about.author": "{0} 制作",
      "about.exit": "アプリを終了", "about.exitConfirm": "Giantapp Wallpaper を終了しますか？デスクトップの壁紙は解除されます（設定 → 壁紙 で保持できます）。",
      "about.exited": "またね！", "about.skinBy": "このスキンは Giantapp Wallpaper スキンシステムで動作しています",
    },
    de: {
      "nav.library": "Bibliothek", "nav.local": "Lokal", "nav.downloads": "Downloads", "nav.hub": "Hub", "nav.settings": "Einstellungen", "nav.about": "Über",
      "common.apply": "Anwenden", "common.allScreens": "Alle Bildschirme", "common.screen": "Bildschirm {0}", "common.primary": "Primär",
      "common.cancel": "Abbrechen", "common.ok": "OK", "common.delete": "Löschen", "common.save": "Speichern", "common.saving": "Speichern…",
      "common.close": "Schließen", "common.edit": "Bearbeiten", "common.create": "Erstellen", "common.location": "Speicherort öffnen", "common.refresh": "Aktualisieren",
      "common.playing": "Wird abgespielt", "common.paused": "Pausiert", "common.idle": "Inaktiv", "common.demo": "Demomodus",
      "common.demoHint": "App nicht erkannt — Beispieldaten werden angezeigt", "common.add": "Hinzufügen", "common.remove": "Entfernen",
      "common.saved": "Gespeichert", "common.opFailed": "Fehlgeschlagen: {0}", "common.done": "Fertig", "common.back": "Zurück",
      "card.clickApplyAll": "Klicken, um auf alle Bildschirme anzuwenden", "card.clickApplyScreen": "Klicken, um auf {0} anzuwenden",
      "type.1": "Bild", "type.2": "GIF", "type.3": "Video", "type.4": "Web", "type.5": "Exe", "type.6": "Wiedergabeliste", "type.0": "Auto",
      "lib.title": "Bibliothek", "lib.count": "{0} Wallpapers", "lib.search": "Wallpapers durchsuchen…", "lib.empty": "Noch keine Wallpapers",
      "lib.emptyHint": "Klicke auf Erstellen, um ein lokales Video oder Bild zu importieren, oder lade eines aus dem Hub",
      "lib.target": "Anwenden auf", "lib.playingBadge": "Wird abgespielt",
      "local.title": "Lokale Bibliothek", "local.count": "{0} Einträge", "local.target": "Anwenden auf",
      "local.filter": "Typ", "local.filterAll": "Alle Typen", "local.sort": "Sortieren",
      "local.sortName": "Nach Name", "local.sortType": "Nach Typ", "local.sortTime": "Nach Erstellungsdatum", "local.openDirs": "Ordner öffnen",
      "local.newFolder": "Neuer Ordner", "local.folderNamePh": "Ordnername", "local.more": "Weitere Optionen",
      "local.moveTo": "Verschieben nach…", "local.moveTitle": "In Ordner verschieben", "local.moveCurrent": "Aktueller Speicherort",
      "local.moved": "Nach „{0}“ verschoben", "local.folderCreated": "Ordner erstellt",
      "local.open": "Öffnen", "local.rearrange": "Automatisch ordnen",
      "local.zoomIn": "Vergrößern (Ctrl+=)", "local.zoomOut": "Verkleinern (Ctrl+-)", "local.zoomReset": "Auf 100% zurücksetzen (Ctrl+0)",
      "local.zoomHint": "Vorschaugröße: Ctrl+Mausrad oder Bedienelement unten rechts · Ctrl+= / Ctrl+- schrittweise · Ctrl+0 zurücksetzen",
      "local.delFolder": "Ordner löschen",
      "local.delFolderBody": "„{0}“ und der gesamte Inhalt werden endgültig gelöscht. Dies kann nicht rückgängig gemacht werden.",
      "local.delFolderCount": "Enthält {0} Wallpaper(s)",
      "local.folderEmpty": "Dieser Ordner ist leer",
      "local.folderEmptyHint": "Rechtsklick auf ein Wallpaper und „Verschieben nach…“ wählen, oder auf eine Ordnerkachel ziehen",
      "local.searchEmpty": "Keine passenden Wallpapers",
      "local.needUpdate": "Zum Ordnen von Ordnern ist eine neuere Version von Giantapp Wallpaper nötig",
      "local.empty": "Noch keine Wallpapers",
      "local.emptyHint": "Lege Videos oder Bilder im Wallpaper-Ordner ab",
      "pv.title": "Vorschau", "pv.noPreview": "Dieser Typ kann nicht in der Vorschau angezeigt werden",
      "pv.engine": "Video-Engine: {0}", "pv.engineNote": "MPV kann keine eingebettete Vorschau — gerendert wird mit dem integrierten Web-Player",
      "pv.mouseOff": "Mausinteraktion aus",
      "pv.loadFailed": "Laden fehlgeschlagen — das Format wird vom integrierten Player womöglich nicht unterstützt",
      "pv.max": "Maximieren", "pv.restore": "Wiederherstellen", "pv.wheelHint": "Mausrad für vorheriges / nächstes",
      "create.wallpaper": "Neues Wallpaper", "create.playlist": "Neue Wiedergabeliste", "create.editWallpaper": "Wallpaper bearbeiten", "create.editList": "Wiedergabeliste bearbeiten",
      "create.titleField": "Titel", "create.titlePh": "Benenne dein {0}", "create.type": "Typ",
      "create.file": "Klicke, um eine Datei zu wählen, oder ziehe sie hierher", "create.fileHint": "Bild / GIF / Video / Webseite (≤ 500 MB)",
      "create.pickFolder": "Ordner wählen (Web-Wallpaper)", "create.webPack": "{0} Dateien · {1}", "create.webNeedHtml": "Keine Webseite in diesem Ordner",
      "create.webAskTitle": "Web-Wallpaper importieren", "create.webAskBody": "Ganzen Ordner einbeziehen? Alle Ressourcen neben der Seite werden mit importiert", "create.webAskYes": "Ganzen Ordner einbeziehen", "create.webAskNo": "Nur diese Datei",
      "create.webBigTitle": "Großer Ordner", "create.webBigBody": "Insgesamt {0} — der Import kann eine Weile dauern. Fortfahren?",
      "create.importing": "Importiere {0}%", "create.imported": "Importiert", "create.reselect": "Erneut wählen",
      "create.addMembers": "Wallpapers hinzufügen", "create.members": "{0} Mitglieder", "create.membersEmpty": "Noch keine Mitglieder — aus der Bibliothek hinzufügen",
      "create.creating": "Wird erstellt…", "create.titleEmpty": "Titel ist erforderlich", "create.noFile": "Zuerst eine Datei wählen",
      "create.listEmpty": "Eine Wiedergabeliste braucht mindestens ein Mitglied", "create.created": "Erstellt", "create.createFailed": "Erstellen fehlgeschlagen: {0}",
      "create.updated": "Gespeichert", "create.coverFailed": "Vorschaubild fehlgeschlagen (übersprungen)",
      "create.unsaved": "Ungespeicherte Änderungen", "create.unsavedBody": "Schließen und Änderungen verwerfen?",
      "create.pickTitle": "Mitglieder wählen", "create.pickHint": "Karten anklicken zum Auswählen; Wiedergabelisten lassen sich nicht verschachteln", "create.selectAll": "Alle auswählen",
      "set.title": "Wallpaper-Einstellungen", "set.sub": "Wiedergabeoptionen für „{0}“, gelten sofort beim Speichern",
      "set.overlayTitle": "Overlays", "set.overlaySub": "Overlays für „{0}“, gelten sofort beim Speichern",
      "set.overlayTime": "Uhr", "set.overlayTimeHint": "Zeigt eine Uhr mit der Systemzeit in der oberen rechten Ecke",
      "set.duration": "Dauer", "set.durationHint": "Wie lange dieses Wallpaper in der Wiedergabeliste bleibt (Std:Min)",
      "set.playMode": "Wiedergabemodus", "set.order": "Der Reihe nach", "set.random": "Zufällig",
      "set.mouse": "Mausinteraktion", "set.mouseHint": "Wallpaper darf auf die Maus reagieren",
      "set.player": "Video-Engine", "set.engine0": "Standard", "set.engine1": "MPV-Player", "set.engine2": "Web-Player", "set.engine3": "Integrierter MPV-Player",
      "set.hwdec": "Hardware-Dekodierung", "set.hwdecHint": "Reduziert die CPU-Last bei Videos deutlich",
      "set.panscan": "Füllen & Zuschneiden", "set.panscanHint": "Bild zuschneiden, um den ganzen Bildschirm zu füllen",
      "set.fit": "Anpassung", "set.fit0": "Zentriert", "set.fit1": "Kacheln", "set.fit2": "Strecken", "set.fit3": "Einpassen", "set.fit4": "Füllen", "set.fit5": "Überbrücken",
      "set.keep": "Wallpaper behalten", "set.keepHint": "Original-Desktop beim Beenden nicht wiederherstellen",
      "set.saved": "Einstellungen gespeichert & angewendet", "set.saveFailed": "Speichern fehlgeschlagen: {0}",
      "dock.stop": "Stopp", "dock.pause": "Pause", "dock.resume": "Weiter", "dock.prev": "Zurück", "dock.next": "Weiter",
      "dock.volume": "Lautstärke", "dock.audio": "Ton von", "dock.mute": "Stumm", "dock.nothing": "Der Desktop ruht sich aus",
      "dock.nothingHint": "Klicke ein Wallpaper an, um es anzuwenden", "dock.focus": "Steuert",
      "dock.screensHint": "Klicke einen Bildschirm an, um ihn zu wählen (nochmals klicken zum Aufheben); ohne Auswahl wirken die Steuerelemente auf allen; ziehe ein Wallpaper auf einen Bildschirm, um es dort abzuspielen",
      "dock.blankTitle": "Klicke ein Wallpaper an, oder ziehe es in diesen Block",
      "dock.blankHint": "Klicke ein Wallpaper aus der Bibliothek an; oder ziehe es auf einen Bildschirmblock, um es dort abzuspielen",
      "dl.title": "Downloads", "dl.sub": "Aktive Aufgaben und Verlauf", "dl.active": "Aktiv", "dl.activeEmpty": "Keine aktiven Downloads",
      "dl.emptyHint": "Hol dir Wallpapers aus dem Hub — Downloads erscheinen hier",
      "dl.history": "Verlauf", "dl.historyEmpty": "Kein Download-Verlauf", "dl.clear": "Verlauf leeren",
      "dl.clearConfirm": "Alle Download-Einträge leeren? Heruntergeladene Wallpaper-Dateien bleiben erhalten.", "dl.cleared": "Verlauf geleert",
      "dl.cancel": "Abbrechen", "dl.removed": "Eintrag entfernt",
      "hub.title": "Hub", "hub.login": "Anmelden", "hub.loginHint": "Die Anmeldung erfolgt in einem eigenen Fenster",
      "hub.reload": "Neu laden", "hub.browser": "Im Browser öffnen", "hub.failed": "Laden fehlgeschlagen — Netzwerk prüfen",
      "cfg.general": "Allgemein", "cfg.wallpaper": "Wallpaper", "cfg.appearance": "Erscheinungsbild",
      "cfg.autoStart": "Mit Windows starten", "cfg.autoStartHint": "Automatisch nach der Windows-Anmeldung starten",
      "cfg.hideWindow": "Hauptfenster beim Start verbergen", "cfg.hideWindowHint": "Nur in Tray & Desktop aktiv",
      "cfg.headless": "Kopflos beim Autostart", "cfg.headlessHint": "Gar kein Fenster beim Autostart (erfordert „Mit Windows starten“)",
      "cfg.language": "Sprache", "cfg.langApplied": "Sprache gewechselt",
      "cfg.dirs": "Wallpaper-Ordner", "cfg.dirsHint": "Der erste speichert neue Wallpapers, die restlichen sind nur Lesequellen",
      "cfg.addDir": "Ordner hinzufügen", "cfg.choose": "Auswählen…", "cfg.covered": "Bei voller Verdeckung",
      "cfg.covered0": "Weiter abspielen", "cfg.covered1": "Automatisch pausieren", "cfg.covered2": "Stopp",
      "cfg.keep": "Wallpaper behalten", "cfg.keepHint": "Wallpaper-Snapshot nach dem Beenden behalten und beim nächsten Start wiederherstellen",
      "cfg.player": "Standard-Video-Engine", "cfg.mpvMissing": "MPV nicht gefunden — Auto-Download sorgt für flüssigeres Video",
      "cfg.mpvDownload": "MPV automatisch herunterladen", "cfg.mpvCancel": "Download abbrechen", "cfg.mpvProgress": "Wird geladen {0}%",
      "cfg.mpvDone": "MPV ist bereit", "cfg.mpvFail": "MPV-Download fehlgeschlagen: {0}", "cfg.mpvFolder": "MPV-Ordner öffnen",
      "cfg.mode": "Designmodus", "cfg.modeSys": "System", "cfg.modeLight": "Hell", "cfg.modeDark": "Dunkel",
      "cfg.skins": "Skins", "cfg.skinHint": "Skins gestalten die ganze App um; app-Skins ersetzen die Oberfläche, style-Skins überschreiben nur Stile",
      "cfg.skinOpen": "Skin-Ordner öffnen", "cfg.skinCurrent": "In Verwendung", "cfg.skinInvalid": "Ungültig", "cfg.skinApplied": "„{0}“ angewendet",
      "cfg.skinCustom": "Eigener Skin", "cfg.skinDocHint": "Kopiere diesen Leitfaden in eine beliebige KI (ChatGPT / Claude …), lass dir einen Skin erzeugen und lege die Dateien in den Skin-Ordner.", "cfg.skinDocCopy": "Alles kopieren", "cfg.skinDocCopied": "Kopiert — zum Erzeugen eines Skins in die KI einfügen",
      "cfg.about": "Über diesen Skin", "cfg.reloadHint": "Manche Optionen aktualisieren die Oberfläche nach dem Speichern",
      "cfg.update": "Aktualisierungen",
      "upd.uiTitle": "UI-Hotfix-Update", "upd.uiHint": "Mit konfigurierter Hot-Update-URL erhalten Sie neue Oberflächenversionen ohne App-Upgrade; Wiederherstellen kehrt jederzeit zur eingebauten Oberfläche zurück", "upd.uiUrl": "Hot-Update-URL", "upd.channelHint": "Bestimmt auch das verfolgte UI-Hotfix-Manifest", "upd.uiUrlHint": "Leer = Update-Kanal folgen, oder ui.json-URL", "upd.uiAuto": "Oberfläche beim Start automatisch aktualisieren", "upd.uiActive": "Hot-Update-Oberfläche aktiv (Version {0}, angewendet am {1})", "upd.uiBuiltin": "Eingebaute Oberfläche aktiv", "upd.uiCheck": "Nach Updates suchen", "upd.uiApply": "Herunterladen und anwenden", "upd.uiRestore": "Eingebaute Oberfläche wiederherstellen", "upd.restoreConfirm": "Die geladene Oberfläche wird gelöscht und die mit der App ausgelieferte wiederhergestellt. Fortfahren?", "upd.upToDate": "Sie sind auf dem neuesten Stand", "upd.found": "Neue Version {0} gefunden", "upd.progress": "Wird geladen {0} %", "upd.applied": "Oberfläche auf {0} aktualisiert", "upd.restored": "Zur eingebauten Oberfläche zurückgekehrt", "upd.appTitle": "App-Aktualisierungen", "upd.appHint": "Bei aktivierter Auto-Aktualisierung werden neue Versionen automatisch geladen; die Installation erfordert stets Ihre Bestätigung", "upd.channel": "Update-Kanal", "upd.chStable": "Stabil", "upd.chPreview": "Vorschau", "upd.chOff": "Aus", "upd.autoDownload": "Neue Versionen automatisch herunterladen", "upd.appUrl": "Update-Server-URL", "upd.appCheck": "Nach Updates suchen", "upd.download": "Update herunterladen", "upd.downloaded": "Version {0} wurde geladen", "upd.install": "Installieren und neu starten", "upd.later": "Später", "upd.installing": "App wird beendet und Installer gestartet; danach startet die App neu", "upd.current": "Aktuelle Version {0}", "upd.readyBar": "Neue Version {0} geladen und bereit",
      "about.title": "Über", "about.logs": "Protokollordner öffnen", "about.feedback": "Feedback", "about.github": "Projektseite",
      "about.review": "App bewerten", "about.star": "Stern auf GitHub", "about.author": "Gemacht von {0}",
      "about.exit": "App beenden", "about.exitConfirm": "Giantapp Wallpaper beenden? Wallpapers werden entfernt (in Einstellungen → Wallpaper behaltbar).",
      "about.exited": "Bis bald", "about.skinBy": "Angetrieben vom Skin-System von Giantapp Wallpaper",
    },
    fr: {
      "nav.library": "Bibliothèque", "nav.local": "Local", "nav.downloads": "Téléchargements", "nav.hub": "Hub", "nav.settings": "Paramètres", "nav.about": "À propos",
      "common.apply": "Appliquer", "common.allScreens": "Tous les écrans", "common.screen": "Écran {0}", "common.primary": "Principal",
      "common.cancel": "Annuler", "common.ok": "OK", "common.delete": "Supprimer", "common.save": "Enregistrer", "common.saving": "Enregistrement…",
      "common.close": "Fermer", "common.edit": "Modifier", "common.create": "Créer", "common.location": "Ouvrir l'emplacement", "common.refresh": "Actualiser",
      "common.playing": "Lecture en cours", "common.paused": "En pause", "common.idle": "Inactif", "common.demo": "Mode démo",
      "common.demoHint": "Application non détectée — affichage de données d'exemple", "common.add": "Ajouter", "common.remove": "Retirer",
      "common.saved": "Enregistré", "common.opFailed": "Échec : {0}", "common.done": "Terminé", "common.back": "Retour",
      "card.clickApplyAll": "Cliquez pour appliquer à tous les écrans", "card.clickApplyScreen": "Cliquez pour appliquer à {0}",
      "type.1": "Image", "type.2": "GIF", "type.3": "Vidéo", "type.4": "Web", "type.5": "Exe", "type.6": "Liste", "type.0": "Auto",
      "lib.title": "Bibliothèque", "lib.count": "{0} fonds d'écran", "lib.search": "Rechercher des fonds…", "lib.empty": "Aucun fond d'écran pour l'instant",
      "lib.emptyHint": "Cliquez sur Créer pour importer une vidéo ou une image locale, ou téléchargez depuis le Hub",
      "lib.target": "Appliquer à", "lib.playingBadge": "En lecture",
      "local.title": "Bibliothèque locale", "local.count": "{0} éléments", "local.target": "Appliquer à",
      "local.filter": "Type", "local.filterAll": "Tous les types", "local.sort": "Trier",
      "local.sortName": "Par nom", "local.sortType": "Par type", "local.sortTime": "Par date de création", "local.openDirs": "Ouvrir le dossier",
      "local.newFolder": "Nouveau dossier", "local.folderNamePh": "Nom du dossier", "local.more": "Plus d'options",
      "local.moveTo": "Déplacer vers…", "local.moveTitle": "Déplacer vers un dossier", "local.moveCurrent": "Emplacement actuel",
      "local.moved": "Déplacé vers « {0} »", "local.folderCreated": "Dossier créé",
      "local.open": "Ouvrir", "local.rearrange": "Ranger automatiquement",
      "local.zoomIn": "Zoom avant (Ctrl+=)", "local.zoomOut": "Zoom arrière (Ctrl+-)", "local.zoomReset": "Réinitialiser à 100 % (Ctrl+0)",
      "local.zoomHint": "Zoom des miniatures : Ctrl+molette ou le contrôle en bas à droite · Ctrl+= / Ctrl+- par pas · Ctrl+0 réinitialiser",
      "local.delFolder": "Supprimer le dossier",
      "local.delFolderBody": "« {0} » et tout son contenu seront définitivement supprimés. Action irréversible.",
      "local.delFolderCount": "Il contient {0} fond(s) d'écran",
      "local.folderEmpty": "Ce dossier est vide",
      "local.folderEmptyHint": "Clic droit sur un fond d'écran puis « Déplacer vers… », ou glissez-le sur une carte de dossier",
      "local.searchEmpty": "Aucun fond d'écran correspondant",
      "local.needUpdate": "Le rangement des dossiers nécessite une version plus récente de Giantapp Wallpaper",
      "local.empty": "Aucun fond d'écran pour l'instant",
      "local.emptyHint": "Placez des vidéos ou des images dans le dossier des fonds d'écran",
      "pv.title": "Aperçu", "pv.noPreview": "Ce type ne peut pas être prévisualisé",
      "pv.engine": "Moteur vidéo : {0}", "pv.engineNote": "MPV ne peut pas s'afficher en intégré — aperçu via le lecteur Web intégré",
      "pv.mouseOff": "Interaction souris désactivée",
      "pv.loadFailed": "Échec du chargement — le format n'est peut-être pas pris en charge par le lecteur intégré",
      "pv.max": "Agrandir", "pv.restore": "Restaurer", "pv.wheelHint": "Molette pour passer au précédent / suivant",
      "create.wallpaper": "Nouveau fond d'écran", "create.playlist": "Nouvelle liste", "create.editWallpaper": "Modifier le fond d'écran", "create.editList": "Modifier la liste",
      "create.titleField": "Titre", "create.titlePh": "Nommez votre {0}", "create.type": "Type",
      "create.file": "Cliquez pour choisir un fichier, ou déposez-le ici", "create.fileHint": "Image / GIF / vidéo / page web (≤ 500 Mo)",
      "create.pickFolder": "Choisir un dossier (fond web)", "create.webPack": "{0} fichiers · {1}", "create.webNeedHtml": "Aucune page web dans ce dossier",
      "create.webAskTitle": "Importer un fond web", "create.webAskBody": "Inclure tout le dossier ? Les ressources à côté de la page seront aussi importées", "create.webAskYes": "Inclure tout le dossier", "create.webAskNo": "Ce fichier seulement",
      "create.webBigTitle": "Dossier volumineux", "create.webBigBody": "{0} au total — l'import peut prendre du temps. Continuer ?",
      "create.importing": "Import {0} %", "create.imported": "Importé", "create.reselect": "Remplacer",
      "create.addMembers": "Ajouter des fonds", "create.members": "{0} membres", "create.membersEmpty": "Aucun membre — ajoutez depuis votre bibliothèque",
      "create.creating": "Création…", "create.titleEmpty": "Le titre est obligatoire", "create.noFile": "Choisissez d'abord un fichier",
      "create.listEmpty": "Une liste nécessite au moins un membre", "create.created": "Créé", "create.createFailed": "Échec de la création : {0}",
      "create.updated": "Enregistré", "create.coverFailed": "Échec de la miniature (ignoré)",
      "create.unsaved": "Modifications non enregistrées", "create.unsavedBody": "Fermer et perdre ces modifications ?",
      "create.pickTitle": "Choisir les membres", "create.pickHint": "Cliquez sur les cartes pour sélectionner ; les listes ne peuvent pas s'imbriquer", "create.selectAll": "Tout sélectionner",
      "set.title": "Réglages du fond d'écran", "set.sub": "Options de lecture de « {0} », appliquées dès l'enregistrement",
      "set.overlayTitle": "Superpositions", "set.overlaySub": "Superposition pour « {0} », appliquée dès l'enregistrement",
      "set.overlayTime": "Horloge", "set.overlayTimeHint": "Affiche une horloge (heure système) dans le coin supérieur droit",
      "set.duration": "Durée", "set.durationHint": "Durée de présence de ce fond d'écran dans la liste (hh:mm)",
      "set.playMode": "Mode de lecture", "set.order": "Dans l'ordre", "set.random": "Aléatoire",
      "set.mouse": "Interaction souris", "set.mouseHint": "Autoriser le fond d'écran à réagir à la souris",
      "set.player": "Moteur vidéo", "set.engine0": "Par défaut", "set.engine1": "Lecteur MPV", "set.engine2": "Lecteur Web", "set.engine3": "Lecteur MPV intégré",
      "set.hwdec": "Décodage matériel", "set.hwdecHint": "Réduit fortement l'utilisation du CPU pour la vidéo",
      "set.panscan": "Remplir & recadrer", "set.panscanHint": "Recadre l'image pour remplir tout l'écran",
      "set.fit": "Ajustement", "set.fit0": "Centrer", "set.fit1": "Mosaïque", "set.fit2": "Étirer", "set.fit3": "Ajuster", "set.fit4": "Remplir", "set.fit5": "Étendre",
      "set.keep": "Conserver le fond", "set.keepHint": "Ne pas restaurer le bureau d'origine en quittant",
      "set.saved": "Réglages enregistrés et appliqués", "set.saveFailed": "Échec de l'enregistrement : {0}",
      "dock.stop": "Arrêter", "dock.pause": "Pause", "dock.resume": "Reprendre", "dock.prev": "Précédent", "dock.next": "Suivant",
      "dock.volume": "Volume", "dock.audio": "Son de", "dock.mute": "Muet", "dock.nothing": "Le bureau se repose",
      "dock.nothingHint": "Cliquez sur un fond d'écran pour l'appliquer", "dock.focus": "Contrôle en cours",
      "dock.screensHint": "Cliquez sur un écran pour le cibler (recliquez pour annuler) ; sans écran ciblé, les commandes s'appliquent à tous ; glissez un fond d'écran sur un écran pour le lire dessus",
      "dock.blankTitle": "Cliquez sur un fond d'écran pour l'appliquer, ou glissez-le dans ce bloc",
      "dock.blankHint": "Cliquez sur un fond de la bibliothèque pour l'appliquer ; ou glissez-le sur un écran pour le lire dessus",
      "dl.title": "Téléchargements", "dl.sub": "Tâches actives et historique", "dl.active": "Actifs", "dl.activeEmpty": "Aucun téléchargement actif",
      "dl.emptyHint": "Piochez des fonds d'écran dans le Hub — ils apparaîtront ici",
      "dl.history": "Historique", "dl.historyEmpty": "Aucun historique de téléchargement", "dl.clear": "Effacer l'historique",
      "dl.clearConfirm": "Effacer tout l'historique de téléchargement ? Les fichiers de fonds déjà téléchargés sont conservés.", "dl.cleared": "Historique effacé",
      "dl.cancel": "Annuler", "dl.removed": "Entrée supprimée",
      "hub.title": "Hub", "hub.login": "Se connecter", "hub.loginHint": "La connexion se fait dans une fenêtre séparée",
      "hub.reload": "Recharger", "hub.browser": "Ouvrir dans le navigateur", "hub.failed": "Échec du chargement — vérifiez votre réseau",
      "cfg.general": "Général", "cfg.wallpaper": "Fond d'écran", "cfg.appearance": "Apparence",
      "cfg.autoStart": "Lancer au démarrage", "cfg.autoStartHint": "Démarrer automatiquement après la session Windows",
      "cfg.hideWindow": "Masquer la fenêtre principale au lancement", "cfg.hideWindowHint": "Uniquement dans la zone de notification et le bureau",
      "cfg.headless": "Arrière-plan au démarrage auto", "cfg.headlessHint": "Aucune fenêtre au démarrage automatique (nécessite « Lancer au démarrage »)",
      "cfg.language": "Langue", "cfg.langApplied": "Langue modifiée",
      "cfg.dirs": "Dossiers de fonds d'écran", "cfg.dirsHint": "Le premier enregistre les nouveaux fonds, les autres sont des sources en lecture",
      "cfg.addDir": "Ajouter un dossier", "cfg.choose": "Parcourir…", "cfg.covered": "Quand totalement masqué",
      "cfg.covered0": "Continuer la lecture", "cfg.covered1": "Pause automatique", "cfg.covered2": "Arrêter",
      "cfg.keep": "Conserver le fond", "cfg.keepHint": "Conserve la capture du fond d'écran après la fermeture et la restaure au prochain lancement",
      "cfg.player": "Moteur vidéo par défaut", "cfg.mpvMissing": "MPV introuvable — le téléchargement automatique améliore la vidéo",
      "cfg.mpvDownload": "Télécharger MPV automatiquement", "cfg.mpvCancel": "Annuler le téléchargement", "cfg.mpvProgress": "Téléchargement {0} %",
      "cfg.mpvDone": "MPV est prêt", "cfg.mpvFail": "Échec du téléchargement de MPV : {0}", "cfg.mpvFolder": "Ouvrir le dossier MPV",
      "cfg.mode": "Mode d'apparence", "cfg.modeSys": "Système", "cfg.modeLight": "Clair", "cfg.modeDark": "Sombre",
      "cfg.skins": "Habillages", "cfg.skinHint": "Les habillages changent tout le style de l'app ; type app remplace l'interface, type style ne surcharge que les styles",
      "cfg.skinOpen": "Ouvrir le dossier des habillages", "cfg.skinCurrent": "En cours", "cfg.skinInvalid": "Non valide", "cfg.skinApplied": "« {0} » appliqué",
      "cfg.skinCustom": "Habillage personnalisé", "cfg.skinDocHint": "Copiez ce guide dans une IA (ChatGPT / Claude…) pour générer un habillage, puis déposez les fichiers dans le dossier des habillages.", "cfg.skinDocCopy": "Tout copier", "cfg.skinDocCopied": "Copié — collez-le à votre IA pour générer un habillage",
      "cfg.about": "À propos de cet habillage", "cfg.reloadHint": "Certaines options actualisent l'interface après enregistrement",
      "cfg.update": "Mises à jour",
      "upd.uiTitle": "Mise à jour à chaud de l'interface", "upd.uiHint": "Avec une URL de mise à jour à chaud, obtenez les nouvelles versions de l'interface sans mettre à jour l'application ; la restauration revient à l'interface intégrée à tout moment", "upd.uiUrl": "URL de mise à jour à chaud", "upd.channelHint": "Détermine aussi le manifeste de mise à jour à chaud suivi", "upd.uiUrlHint": "Vide = suivre le canal de mise à jour, ou URL ui.json", "upd.uiAuto": "Mettre à jour l'interface au démarrage", "upd.uiActive": "Interface mise à jour à chaud active (version {0}, appliquée le {1})", "upd.uiBuiltin": "Interface intégrée active", "upd.uiCheck": "Rechercher des mises à jour", "upd.uiApply": "Télécharger et appliquer", "upd.uiRestore": "Restaurer l'interface intégrée", "upd.restoreConfirm": "L'interface téléchargée sera supprimée et l'interface intégrée livrée avec l'application sera restaurée. Continuer ?", "upd.upToDate": "Vous êtes à jour", "upd.found": "Nouvelle version {0} trouvée", "upd.progress": "Téléchargement {0} %", "upd.applied": "Interface mise à jour vers {0}", "upd.restored": "Restauré à l'interface intégrée", "upd.appTitle": "Mises à jour de l'application", "upd.appHint": "Avec la mise à jour automatique, les nouvelles versions sont téléchargées automatiquement ; l'installation requiert toujours votre confirmation", "upd.channel": "Canal de mise à jour", "upd.chStable": "Stable", "upd.chPreview": "Aperçu", "upd.chOff": "Désactivé", "upd.autoDownload": "Télécharger automatiquement les nouvelles versions", "upd.appUrl": "URL du serveur de mise à jour", "upd.appCheck": "Rechercher des mises à jour", "upd.download": "Télécharger la mise à jour", "upd.downloaded": "La version {0} a été téléchargée", "upd.install": "Installer et redémarrer", "upd.later": "Plus tard", "upd.installing": "Fermeture et lancement du programme d'installation ; l'application redémarrera ensuite", "upd.current": "Version actuelle {0}", "upd.readyBar": "Nouvelle version {0} téléchargée et prête",
      "about.title": "À propos", "about.logs": "Ouvrir le dossier des journaux", "about.feedback": "Commentaires", "about.github": "Page du projet",
      "about.review": "Noter l'app", "about.star": "Mettre une étoile", "about.author": "Réalisé par {0}",
      "about.exit": "Quitter l'application", "about.exitConfirm": "Quitter Giantapp Wallpaper ? Les fonds d'écran seront retirés (conservables dans Paramètres → Fond d'écran).",
      "about.exited": "À bientôt", "about.skinBy": "Propulsé par le système d'habillages de Giantapp Wallpaper",
    },
    "pt-BR": {
      "nav.library": "Biblioteca", "nav.local": "Local", "nav.downloads": "Downloads", "nav.hub": "Hub", "nav.settings": "Configurações", "nav.about": "Sobre",
      "common.apply": "Aplicar", "common.allScreens": "Todas as telas", "common.screen": "Tela {0}", "common.primary": "Principal",
      "common.cancel": "Cancelar", "common.ok": "OK", "common.delete": "Excluir", "common.save": "Salvar", "common.saving": "Salvando…",
      "common.close": "Fechar", "common.edit": "Editar", "common.create": "Criar", "common.location": "Abrir local", "common.refresh": "Atualizar",
      "common.playing": "Reproduzindo", "common.paused": "Pausado", "common.idle": "Ocioso", "common.demo": "Modo demonstração",
      "common.demoHint": "Aplicativo não detectado — exibindo dados de exemplo", "common.add": "Adicionar", "common.remove": "Remover",
      "common.saved": "Salvo", "common.opFailed": "Falha: {0}", "common.done": "Concluído", "common.back": "Voltar",
      "card.clickApplyAll": "Clique para aplicar a todas as telas", "card.clickApplyScreen": "Clique para aplicar à {0}",
      "type.1": "Imagem", "type.2": "GIF", "type.3": "Vídeo", "type.4": "Web", "type.5": "Exe", "type.6": "Lista", "type.0": "Auto",
      "lib.title": "Biblioteca", "lib.count": "{0} papéis de parede", "lib.search": "Pesquisar papéis de parede…", "lib.empty": "Nenhum papel de parede ainda",
      "lib.emptyHint": "Clique em Criar para importar um vídeo ou imagem local, ou baixe um do Hub",
      "lib.target": "Aplicar a", "lib.playingBadge": "Reproduzindo",
      "local.title": "Biblioteca local", "local.count": "{0} itens", "local.target": "Aplicar a",
      "local.filter": "Tipo", "local.filterAll": "Todos os tipos", "local.sort": "Ordenar",
      "local.sortName": "Por nome", "local.sortType": "Por tipo", "local.sortTime": "Por data de criação", "local.openDirs": "Abrir pasta",
      "local.newFolder": "Nova pasta", "local.folderNamePh": "Nome da pasta", "local.more": "Mais opções",
      "local.moveTo": "Mover para…", "local.moveTitle": "Mover para pasta", "local.moveCurrent": "Local atual",
      "local.moved": "Movido para “{0}”", "local.folderCreated": "Pasta criada",
      "local.open": "Abrir", "local.rearrange": "Organizar automaticamente",
      "local.zoomIn": "Ampliar (Ctrl+=)", "local.zoomOut": "Reduzir (Ctrl+-)", "local.zoomReset": "Redefinir para 100% (Ctrl+0)",
      "local.zoomHint": "Zoom das capas: Ctrl+rolagem ou o controle no canto inferior direito · Ctrl+= / Ctrl+- passo · Ctrl+0 redefine",
      "local.delFolder": "Excluir pasta",
      "local.delFolderBody": "“{0}” e todo o seu conteúdo serão excluídos permanentemente. Não dá para desfazer.",
      "local.delFolderCount": "Contém {0} papel(es) de parede",
      "local.folderEmpty": "Esta pasta está vazia",
      "local.folderEmptyHint": "Clique com o botão direito num papel de parede e escolha “Mover para…”, ou arraste-o para um cartão de pasta",
      "local.searchEmpty": "Nenhum papel de parede correspondente",
      "local.needUpdate": "Organizar pastas requer atualizar o Giantapp Wallpaper para uma versão mais recente",
      "local.empty": "Nenhum papel de parede ainda",
      "local.emptyHint": "Coloque vídeos ou imagens na pasta de papéis de parede",
      "pv.title": "Prévia", "pv.noPreview": "Este tipo não pode ser pré-visualizado",
      "pv.engine": "Motor de vídeo: {0}", "pv.engineNote": "O MPV não pode ser exibido embutido — prévia com o player Web integrado",
      "pv.mouseOff": "Interação do mouse desligada",
      "pv.loadFailed": "Falha ao carregar — o formato pode não ser suportado pelo player integrado",
      "pv.max": "Maximizar", "pv.restore": "Restaurar", "pv.wheelHint": "Use a rolagem para alternar anterior / próximo",
      "create.wallpaper": "Novo papel de parede", "create.playlist": "Nova lista", "create.editWallpaper": "Editar papel de parede", "create.editList": "Editar lista",
      "create.titleField": "Título", "create.titlePh": "Dê um nome ao seu {0}", "create.type": "Tipo",
      "create.file": "Clique para escolher um arquivo, ou arraste-o até aqui", "create.fileHint": "Imagem / GIF / vídeo / página web (≤ 500 MB)",
      "create.pickFolder": "Escolher pasta (papel de parede web)", "create.webPack": "{0} arquivos · {1}", "create.webNeedHtml": "Nenhuma página web nessa pasta",
      "create.webAskTitle": "Importar papel de parede web", "create.webAskBody": "Incluir a pasta inteira? Os recursos ao lado da página também serão importados", "create.webAskYes": "Incluir a pasta inteira", "create.webAskNo": "Somente este arquivo",
      "create.webBigTitle": "Pasta grande", "create.webBigBody": "{0} no total — a importação pode demorar. Continuar?",
      "create.importing": "Importando {0}%", "create.imported": "Importado", "create.reselect": "Trocar",
      "create.addMembers": "Adicionar papéis de parede", "create.members": "{0} membros", "create.membersEmpty": "Nenhum membro ainda — adicione da sua biblioteca",
      "create.creating": "Criando…", "create.titleEmpty": "O título é obrigatório", "create.noFile": "Escolha um arquivo primeiro",
      "create.listEmpty": "Uma lista precisa de pelo menos um membro", "create.created": "Criado", "create.createFailed": "Falha ao criar: {0}",
      "create.updated": "Salvo", "create.coverFailed": "Falha ao gerar capa (ignorado)",
      "create.unsaved": "Alterações não salvas", "create.unsavedBody": "Fechar e perder estas alterações?",
      "create.pickTitle": "Escolher membros", "create.pickHint": "Clique nos cartões para selecionar; listas não podem ser aninhadas", "create.selectAll": "Selecionar tudo",
      "set.title": "Configurações do papel de parede", "set.sub": "Opções de reprodução de “{0}”, aplicadas na hora ao salvar",
      "set.overlayTitle": "Sobreposições", "set.overlaySub": "Sobreposição de “{0}”, aplicada na hora ao salvar",
      "set.overlayTime": "Relógio", "set.overlayTimeHint": "Mostra um relógio com a hora do sistema no canto superior direito",
      "set.duration": "Duração", "set.durationHint": "Quanto tempo este papel de parede fica na lista (hh:mm)",
      "set.playMode": "Modo de reprodução", "set.order": "Em ordem", "set.random": "Aleatório",
      "set.mouse": "Interação do mouse", "set.mouseHint": "Permitir que o papel de parede reaja ao mouse",
      "set.player": "Motor de vídeo", "set.engine0": "Padrão", "set.engine1": "Player MPV", "set.engine2": "Player Web", "set.engine3": "Player MPV integrado",
      "set.hwdec": "Decodificação por hardware", "set.hwdecHint": "Reduz bastante o uso de CPU ao reproduzir vídeo",
      "set.panscan": "Preencher e cortar", "set.panscanHint": "Corta a imagem para preencher toda a tela",
      "set.fit": "Ajuste", "set.fit0": "Centralizar", "set.fit1": "Mosaico", "set.fit2": "Esticar", "set.fit3": "Ajustar", "set.fit4": "Preencher", "set.fit5": "Estender",
      "set.keep": "Manter papel de parede", "set.keepHint": "Não restaurar a área de trabalho original ao sair",
      "set.saved": "Configurações salvas e aplicadas", "set.saveFailed": "Falha ao salvar: {0}",
      "dock.stop": "Parar", "dock.pause": "Pausar", "dock.resume": "Retomar", "dock.prev": "Anterior", "dock.next": "Próximo",
      "dock.volume": "Volume", "dock.audio": "Áudio de", "dock.mute": "Mudo", "dock.nothing": "A área de trabalho está descansando",
      "dock.nothingHint": "Clique em qualquer papel de parede para aplicá-lo", "dock.focus": "Controlando",
      "dock.screensHint": "Clique numa tela para escolhê-la (clique de novo para cancelar); sem tela escolhida, os controles valem para todas; arraste um papel de parede para uma tela para reproduzi-lo nela",
      "dock.blankTitle": "Clique num papel de parede para aplicar, ou arraste um para este bloco",
      "dock.blankHint": "Clique num papel de parede da biblioteca para aplicar; ou arraste-o para um bloco de tela para reproduzi-lo nela",
      "dl.title": "Downloads", "dl.sub": "Tarefas ativas e histórico", "dl.active": "Ativos", "dl.activeEmpty": "Nenhum download ativo",
      "dl.emptyHint": "Baixe papéis de parede do Hub — eles aparecerão aqui",
      "dl.history": "Histórico", "dl.historyEmpty": "Sem histórico de downloads", "dl.clear": "Limpar histórico",
      "dl.clearConfirm": "Limpar todos os registros de download? Os arquivos de papéis de parede baixados são mantidos.", "dl.cleared": "Histórico limpo",
      "dl.cancel": "Cancelar", "dl.removed": "Registro removido",
      "hub.title": "Hub", "hub.login": "Entrar", "hub.loginHint": "O login é feito numa janela separada",
      "hub.reload": "Recarregar", "hub.browser": "Abrir no navegador", "hub.failed": "Falha ao carregar — verifique sua rede",
      "cfg.general": "Geral", "cfg.wallpaper": "Papel de parede", "cfg.appearance": "Aparência",
      "cfg.autoStart": "Iniciar com o Windows", "cfg.autoStartHint": "Executar automaticamente após entrar no Windows",
      "cfg.hideWindow": "Ocultar a janela principal ao iniciar", "cfg.hideWindowHint": "Fica só na bandeja e na área de trabalho",
      "cfg.headless": "Segundo plano no início automático", "cfg.headlessHint": "Sem nenhuma janela ao iniciar automaticamente (requer “Iniciar com o Windows”)",
      "cfg.language": "Idioma", "cfg.langApplied": "Idioma alterado",
      "cfg.dirs": "Pastas de papéis de parede", "cfg.dirsHint": "A primeira salva novos papéis de parede, as demais são só de leitura",
      "cfg.addDir": "Adicionar pasta", "cfg.choose": "Escolher…", "cfg.covered": "Quando totalmente coberto",
      "cfg.covered0": "Continuar reproduzindo", "cfg.covered1": "Pausar automaticamente", "cfg.covered2": "Parar",
      "cfg.keep": "Manter papel de parede", "cfg.keepHint": "Mantém a captura do papel de parede ao sair e a restaura no próximo início",
      "cfg.player": "Motor de vídeo padrão", "cfg.mpvMissing": "MPV não encontrado — o download automático melhora o vídeo",
      "cfg.mpvDownload": "Baixar MPV automaticamente", "cfg.mpvCancel": "Cancelar download", "cfg.mpvProgress": "Baixando {0}%",
      "cfg.mpvDone": "MPV está pronto", "cfg.mpvFail": "Falha ao baixar o MPV: {0}", "cfg.mpvFolder": "Abrir pasta do MPV",
      "cfg.mode": "Modo de aparência", "cfg.modeSys": "Sistema", "cfg.modeLight": "Claro", "cfg.modeDark": "Escuro",
      "cfg.skins": "Skins", "cfg.skinHint": "Skins mudam o estilo do app inteiro; do tipo app substituem a interface, do tipo style só sobrescrevem estilos",
      "cfg.skinOpen": "Abrir pasta de skins", "cfg.skinCurrent": "Em uso", "cfg.skinInvalid": "Inválida", "cfg.skinApplied": "“{0}” aplicada",
      "cfg.skinCustom": "Skin personalizada", "cfg.skinDocHint": "Copie este guia para qualquer IA (ChatGPT / Claude…) para gerar uma skin, depois coloque os arquivos na pasta de skins.", "cfg.skinDocCopy": "Copiar tudo", "cfg.skinDocCopied": "Copiado — cole na sua IA para gerar uma skin",
      "cfg.about": "Sobre esta skin", "cfg.reloadHint": "Algumas opções atualizam a interface depois de salvar",
      "cfg.update": "Atualizações",
      "upd.uiTitle": "Atualização rápida da interface", "upd.uiHint": "Com uma URL de atualização rápida configurada, você obtém novas versões da interface sem atualizar o aplicativo; restaurar devolve a interface integrada a qualquer momento", "upd.uiUrl": "URL de atualização rápida", "upd.channelHint": "Também determina o manifesto de atualização rápida seguido", "upd.uiUrlHint": "Vazio = seguir o canal de atualização, ou URL ui.json", "upd.uiAuto": "Atualizar a interface ao iniciar", "upd.uiActive": "Usando a interface atualizada (versão {0}, aplicada em {1})", "upd.uiBuiltin": "Usando a interface integrada", "upd.uiCheck": "Verificar atualizações", "upd.uiApply": "Baixar e aplicar", "upd.uiRestore": "Restaurar interface integrada", "upd.restoreConfirm": "A interface baixada será excluída e a interface integrada do aplicativo será restaurada. Continuar?", "upd.upToDate": "Você já está na versão mais recente", "upd.found": "Nova versão {0} encontrada", "upd.progress": "Baixando {0}%", "upd.applied": "Interface atualizada para {0}", "upd.restored": "Restaurado para a interface integrada", "upd.appTitle": "Atualizações do aplicativo", "upd.appHint": "Com a atualização automática, novas versões são baixadas automaticamente; instalar sempre pede sua confirmação", "upd.channel": "Canal de atualização", "upd.chStable": "Estável", "upd.chPreview": "Prévia", "upd.chOff": "Desativado", "upd.autoDownload": "Baixar novas versões automaticamente", "upd.appUrl": "URL do servidor de atualização", "upd.appCheck": "Verificar atualizações", "upd.download": "Baixar atualização", "upd.downloaded": "A versão {0} foi baixada", "upd.install": "Instalar e reiniciar", "upd.later": "Agora não", "upd.installing": "Encerrando e iniciando o instalador; o aplicativo reiniciará depois", "upd.current": "Versão atual {0}", "upd.readyBar": "Nova versão {0} baixada e pronta",
      "about.title": "Sobre", "about.logs": "Abrir pasta de logs", "about.feedback": "Feedback", "about.github": "Página do projeto",
      "about.review": "Avaliar o app", "about.star": "Dar uma estrela", "about.author": "Feito por {0}",
      "about.exit": "Sair do aplicativo", "about.exitConfirm": "Sair do Giantapp Wallpaper? Os papéis de parede serão removidos (dá para mantê-los em Configurações → Papel de parede).",
      "about.exited": "Até logo!", "about.skinBy": "Impulsionado pelo sistema de skins do Giantapp Wallpaper",
    },
  };

  function rawT(key) {
    const d = DICTS[state.lang] || DICTS.en;
    return d[key] !== undefined ? d[key] : (DICTS.en[key] !== undefined ? DICTS.en[key] : key);
  }
  function t(key) {
    let s = rawT(key);
    for (let i = 1; i < arguments.length; i++) s = s.split(`{${i - 1}}`).join(String(arguments[i]));
    return s;
  }

  // ---------------------------------------------------------------- 状态
  const state = {
    lang: "zh",
    wallpapers: [],
    status: null,          // PlayingStatus
    downloads: [],
    history: [],
    cfg: null,             // { General, Wallpaper, Appearance }
    screens: [],           // status.screens 快捷引用
    hubTarget: null,       // navigate 事件带来的社区 deep link
  };

  const defaultSetting = () => ({
    duration: null,
    enableMouseEvent: true,
    hardwareDecoding: true,
    isPanScan: true,
    videoPlayer: 0,
    playMode: 0,
    fit: 4,
    keepWallpaper: true,
  });

  // ---------------------------------------------------------------- 小工具
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
      else if (key === "dataset" && typeof value === "object") Object.assign(node.dataset, value);
      else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child === undefined || child === null || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function pretty(value) { try { return JSON.stringify(value); } catch { return String(value); } }

  let toastBox = null;
  function toast(message, kind) {
    if (demo) console.log(`[toast:${kind || "info"}]`, message);
    if (!toastBox) { toastBox = el("div", { class: "sc-toasts" }); document.body.append(toastBox); }
    const item = el("div", { class: `sc-toast ${kind === "err" ? "is-err" : kind === "ok" ? "is-ok" : ""}` }, message);
    toastBox.append(item);
    setTimeout(() => { item.classList.add("is-out"); setTimeout(() => item.remove(), 300); }, kind === "err" ? 6000 : 3000);
  }

  function errText(error) {
    const s = typeof error === "string" ? error : pretty(error);
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  }

  /** 执行 ApiResult 调用：失败 toast 并返回 null，成功返回 data */
  async function call(promise, okMessage) {
    if (demo) { if (okMessage) toast(okMessage.replace(/^已|^设置已.*/, "演示模式：") , "ok"); return null; }
    const res = await promise;
    if (res && res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
    if (okMessage) toast(okMessage, "ok");
    return res ? res.data : null;
  }

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function fmtBytes(n) {
    if (n === undefined || n === null || isNaN(n)) return "?";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0, v = n;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const pad = (x) => String(x).padStart(2, "0");
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  }

  function typeName(type) { return t(`type.${type}`); }

  // ---------------------------------------------------------------- 确认框
  function confirmDlg({ title, body, okText, cancelText, danger }) {
    return new Promise((resolve) => {
      const close = (val) => { overlay.remove(); window.removeEventListener("keydown", onKey); resolve(val); };
      const onKey = (e) => { if (e.key === "Escape") close(false); if (e.key === "Enter") close(true); };
      const overlay = el("div", { class: "sc-modal-overlay" },
        el("div", { class: "sc-modal" },
          el("div", { class: "sc-modal-title" }, title),
          body ? el("div", { class: "sc-modal-body" }, body) : null,
          el("div", { class: "sc-modal-actions" },
            el("button", { class: "sc-btn", onclick: () => close(false) }, cancelText || t("common.cancel")),
            el("button", { class: `sc-btn ${danger ? "is-danger" : "is-primary"}`, onclick: () => close(true) }, okText || t("common.ok")),
          ),
        ));
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
      window.addEventListener("keydown", onKey);
      document.body.append(overlay);
    });
  }

  // ---------------------------------------------------------------- 配置
  async function loadConfig() {
    if (demo) { state.cfg = mockConfig(); return; }
    const [g, w, a, u] = await Promise.all([
      client.api.getConfig("General"),
      client.api.getConfig("Wallpaper"),
      client.api.getConfig("Appearance"),
      client.api.getConfig("Update"),
    ]);
    state.cfg = {
      General: g.data || {},
      Wallpaper: w.data || {},
      Appearance: a.data || {},
      Update: u.data || {},
    };
  }

  /** 整组读取 → merge → 整组写回（setConfig 是整组替换，绝不能只写单字段） */
  async function saveConfig(group, patch) {
    if (!state.cfg) return;
    state.cfg[group] = { ...state.cfg[group], ...patch };
    if (demo) { emit("config", group); return; }
    await client.api.setConfig(group, state.cfg[group]);
    if (group === "Appearance") { /* 后端会广播 appearance-changed → loadConfig */ }
    emit("config", group);
  }

  function applyLang(lan) {
    state.lang = ["zh", "en", "ru", "es", "zh-Hant", "ja", "de", "fr", "pt-BR"].includes(lan) ? lan : "en";
    document.documentElement.lang = state.lang;
    emit("lang", state.lang);
  }

  async function switchLang(lan) {
    applyLang(lan);
    if (!demo) await saveConfig("General", { currentLan: lan });
    toast(t("cfg.langApplied"), "ok");
  }

  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function resolvedMode() {
    const mode = (state.cfg && state.cfg.Appearance.mode) || "system";
    if (mode === "system") return darkQuery && darkQuery.matches ? "dark" : "light";
    return mode;
  }
  function applyMode() {
    document.documentElement.dataset.mode = resolvedMode();
    emit("mode", resolvedMode());
  }
  async function setMode(mode) {
    await saveConfig("Appearance", { mode });
    applyMode();
  }
  if (darkQuery) darkQuery.addEventListener("change", () => { if ((state.cfg?.Appearance.mode || "system") === "system") applyMode(); });

  // ---------------------------------------------------------------- 数据刷新
  async function refreshWallpapers() {
    if (demo) return;
    const res = await client.api.getWallpapers();
    if (!res.error) { state.wallpapers = res.data || []; emit("wallpapers", state.wallpapers); }
  }
  async function refreshStatus() {
    if (demo) return;
    const res = await client.api.getPlayingStatus();
    if (!res.error) { state.status = res.data || null; state.screens = state.status ? state.status.screens || [] : []; emit("status", state.status); }
  }
  async function refreshDownloads() {
    if (demo) return;
    const res = await client.api.getDownloadStatus();
    if (!res.error) { state.downloads = res.data ? res.data.items || [] : []; emit("downloads", state.downloads); }
  }
  async function refreshHistory() {
    if (demo) return;
    const res = await client.api.getDownloadHistory();
    if (!res.error) { state.history = res.data || []; emit("history", state.history); }
  }
  async function refreshAll() {
    await Promise.all([refreshWallpapers(), refreshStatus(), refreshDownloads(), refreshHistory(), loadConfig()]);
  }

  // ---------------------------------------------------------------- 播放控制
  /** 播放中文件集合（含播放列表成员展开）——判断某壁纸是否在播 */
  function playingSet() {
    const st = state.status;
    if (!st) return new Set();
    return new Set(st.wallpapers.flatMap((w) => [w.filePath, ...((w.meta && w.meta.wallpapers) || []).map((m) => m.filePath)].filter(Boolean)));
  }
  function screenIndexOf(w) {
    const idx = w && w.runningInfo && w.runningInfo.screenIndexes && w.runningInfo.screenIndexes.length ? w.runningInfo.screenIndexes[0] : -1;
    return idx;
  }
  function canPause(w) {
    const type = w && w.meta ? w.meta.type : undefined;
    return type === undefined || type === null || type === 3 || type === 6;
  }
  function findPlayingWallpaper(w) {
    // w 是播放列表时返回后端视角的当前项（含 runningInfo）
    const st = state.status;
    if (!st || !w) return null;
    return st.wallpapers.find((x) => x.filePath === w.filePath)
      || ((w.meta && w.meta.wallpapers) || []).find((m) => st.wallpapers.some((x) => x.filePath === m.filePath)) || null;
  }

  async function applyWallpaper(wallpaper, screenIndexes) {
    const target = JSON.parse(JSON.stringify(wallpaper));
    target.runningInfo = { screenIndexes: screenIndexes || [], isPaused: false };
    if (demo) { mockApply(target); toast(`${t("common.demo")} · ${t("common.apply")}`, "ok"); emit("status", state.status); return true; }
    const res = await client.api.showWallpaper(target);
    if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return false; }
    refreshStatus();
    return true;
  }
  async function pause(screenIndex) { if (demo) return mockPause(true); await client.api.pauseWallpaper(screenIndex); refreshStatus(); }
  async function resume(screenIndex) { if (demo) return mockPause(false); await client.api.resumeWallpaper(screenIndex); refreshStatus(); }
  async function stop(screenIndex) {
    if (demo) return mockStop(screenIndex);
    await client.api.stopWallpaper(screenIndex);
    refreshStatus();
  }
  async function prevIn(w) { if (demo) return mockShift(-1); await client.api.playPrevInPlaylist(w); refreshStatus(); }
  async function nextIn(w) { if (demo) return mockShift(1); await client.api.playNextInPlaylist(w); refreshStatus(); }
  async function setVolume(volume, screenIndex) {
    if (demo) { if (state.status) state.status.volume = volume; emit("status", state.status); return; }
    await client.api.setVolume(volume, screenIndex);
    refreshStatus();
  }

  // 进度轮询：遵守「设置后 2 秒不回读 / 暂停冻结 / -1 无效」规则。
  // timeScreen 指定轮询目标屏（Dock 选中屏幕时按屏取进度）；-1 = 不指定，由后端取播放中壁纸
  let lastSeekAt = 0;
  let tickerTimer = null;
  const tickerCbs = new Set();
  let timeScreen = -1;
  function setTimeScreen(i) { timeScreen = typeof i === "number" ? i : -1; }
  function startTicker() {
    if (tickerTimer) return;
    tickerTimer = setInterval(async () => {
      if (document.hidden || (document).shell_hidden) return;
      if (!tickerCbs.size) return; // 没有订阅者（如进度未显示）就不发轮询请求
      if (demo) { mockTick(); const payload = mockTime(); tickerCbs.forEach((fn) => fn(payload)); return; }
      if (!state.status || !state.status.wallpapers.length) { tickerCbs.forEach((fn) => fn(null)); return; }
      if (Date.now() - lastSeekAt < 2000) return;
      const allPaused = state.status.wallpapers.every((w) => w.runningInfo && w.runningInfo.isPaused);
      if (allPaused) return;
      const res = await client.api.getWallpaperTime(timeScreen >= 0 ? timeScreen : undefined);
      const tp = res && res.data ? res.data : null;
      if (!tp || tp.position < 0 || tp.duration <= 0) { tickerCbs.forEach((fn) => fn(null)); return; }
      tickerCbs.forEach((fn) => fn(tp));
    }, 1000);
  }
  function onTime(fn) { tickerCbs.add(fn); return () => tickerCbs.delete(fn); }
  async function seek(seconds, screenIndex) {
    lastSeekAt = Date.now();
    if (demo) { mockSeek(seconds); return; }
    await client.api.setProgress(seconds, typeof screenIndex === "number" && screenIndex >= 0 ? screenIndex : undefined);
  }

  // ---------------------------------------------------------------- 上传 / 封面 / 创建
  function uploadBlobBase64(fileName, base64) {
    return client.api.uploadToTmp(fileName, base64);
  }

  /** 分块 base64 编码：每 32KB 拼一段，避免 String.fromCharCode 栈溢出；onProgress 按字节 0-100 */
  function fileToBase64(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = new Uint8Array(reader.result);
          const STEP = 0x8000;
          let binary = "";
          for (let offset = 0; offset < buffer.length; offset += STEP) {
            binary += String.fromCharCode.apply(null, buffer.subarray(offset, Math.min(offset + STEP, buffer.length)));
            if (onProgress) onProgress(Math.floor((offset / buffer.length) * 100));
          }
          resolve(btoa(binary));
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error("read file failed"));
      reader.readAsArrayBuffer(file);
    });
  }

  function uploadBlobBase64(fileName, base64) {
    return client.api.uploadToTmp(fileName, base64);
  }

  /** 上传单个文件：整文件单次调用 uploadToTmp（后端为覆盖写，分块多次调用会只剩最后一块）。
   * 编码占 0-90，上传落 90-100。 */
  async function uploadFile(file, onProgress) {
    if (demo) {
      return new Promise((resolve) => {
        let p = 0;
        const timer = setInterval(() => {
          p += 12 + Math.random() * 20;
          if (p >= 100) { clearInterval(timer); onProgress && onProgress(100); resolve(`mock://media/${encodeURIComponent(file.name)}`); }
          else onProgress && onProgress(Math.floor(p));
        }, 120);
      });
    }
    const base64 = await fileToBase64(file, (p) => onProgress && onProgress(Math.floor(p * 0.9)));
    const res = await client.api.uploadToTmp(file.name, base64);
    if (res.error || !res.data) throw new Error(pretty(res.error));
    if (onProgress) onProgress(100);
    return res.data;
  }

  /** 整包上传 Web 壁纸文件夹：把目录内全部文件按相对路径上传到 tmp 的 prefix 子目录。
   * files: [{ rel, file }]；onProgress 按字节聚合 0-95。返回 prefix，失败返回 null。 */
  async function uploadWebFolder(files, prefix, onProgress) {
    const total = files.reduce((s, it) => s + (it.file.size || 0), 0) || 1;
    let done = 0;
    for (const it of files) {
      try {
        const base64 = await fileToBase64(it.file, (p) => onProgress && onProgress(Math.floor(((done + (it.file.size * p) / 100) / total) * 95)));
        const res = await client.api.uploadToTmp(`${prefix}/${it.rel}`, base64);
        if (res.error || !res.data) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
      } catch (e) { toast(t("common.opFailed", errText(e)), "err"); return null; }
      done += it.file.size || 0;
      if (onProgress) onProgress(Math.floor((done / total) * 95));
    }
    return prefix;
  }

  /** 把已上传到 tmp 的 Web 壁纸文件夹落库为整目录型壁纸。entry = "<prefix>/<入口 html 相对路径>"。 */
  async function createWebWallpaperFolder({ entry, title, setting }) {
    if (demo) { toast(`${t("common.demo")} · ${t("create.wallpaper")}`, "ok"); return true; }
    const res = await client.api.createWallpaperFolder({ entry, title, setting: setting || defaultSetting() });
    if (res.error) { toast(t("create.createFailed", errText(res.error)), "err"); return false; }
    await refreshWallpapers();
    return true;
  }

  /** 异常大文件夹阈值：超过需用户二次确认 */
  const WEB_FOLDER_LARGE = 100 * 1024 * 1024;

  /** 统计 Web 壁纸文件夹（总体积 / 文件数 / 入口），异常大（>100MB）弹二次确认。
   *  返回 stat；取消 / 失败返回 null。demo 返回 null。 */
  async function statWebFolder(dir) {
    if (demo) return null;
    const res = await client.api.webFolderStat(dir);
    if (res.error || !res.data) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
    const stat = res.data;
    if (stat.totalSize > WEB_FOLDER_LARGE) {
      const ok = await confirm({ title: t("create.webBigTitle"), body: t("create.webBigBody", fmtBytes(stat.totalSize)) });
      if (!ok) return null;
    }
    return stat;
  }

  /** 把本地 Web 壁纸文件夹直接导入：后端整包复制进 tmp → 落库（不经前端逐文件 base64 上传）。 */
  async function importWebFolder({ dir, entry, title }) {
    if (demo) { toast(`${t("common.demo")} · ${t("create.wallpaper")}`, "ok"); return true; }
    const copied = await client.api.copyWebFolderToTmp(dir);
    if (copied.error || !copied.data) { toast(t("common.opFailed", errText(copied.error)), "err"); return false; }
    return await createWebWallpaperFolder({ entry: `${copied.data}/${entry}`, title });
  }

  /** 从预览元素（video/img）截 500px 宽 JPEG 封面，返回 base64（不含前缀）或 null */
  function captureCover(elm) {
    try {
      const isVideo = elm.tagName === "VIDEO";
      const w = isVideo ? elm.videoWidth : elm.naturalWidth;
      const h = isVideo ? elm.videoHeight : elm.naturalHeight;
      if (!w || !h) return null;
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = Math.max(1, Math.round((h / w) * 500));
      canvas.getContext("2d").drawImage(elm, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    } catch (e) { console.warn("captureCover:", e); return null; }
  }

  async function uploadCover(base64) {
    if (!base64) return "";
    const name = `cover-${Date.now()}.jpg`;
    const res = await uploadBlobBase64(name, base64);
    return res.error || !res.data ? "" : res.data;
  }

  /** 播放列表占位文件（库里 .playlist 即占位文本） */
  async function uploadPlaylistPlaceholder() {
    const name = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.playlist`;
    const placeholder = "占位符，表示当前是一个播放列表";
    if (demo) return `mock://media/${name}`;
    const res = await uploadBlobBase64(name, btoa(unescape(encodeURIComponent(placeholder))));
    if (res.error || !res.data) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
    return res.data;
  }

  /** 3x3 成员封面拼接（最多 9 张；失败返回 null） */
  async function generatePlaylistCover(memberCoverUrls) {
    try {
      const urls = memberCoverUrls.filter(Boolean).slice(0, 9);
      if (!urls.length) return null;
      const cell = 320;
      const canvas = document.createElement("canvas");
      canvas.width = cell * 3; canvas.height = cell * 3;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await Promise.all(urls.map((url, i) => new Promise((done) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { ctx.drawImage(img, (i % 3) * cell, Math.floor(i / 3) * cell, cell, cell); done(); };
        img.onerror = () => done();
        img.src = url;
      })));
      return demo ? mockCoverDataURL(500, 280, "playlist") : (await uploadCover(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]));
    } catch (e) { console.warn("generatePlaylistCover:", e); return null; }
  }

  /** 原生对话框选本地文件，后端直接复制进 tmp（不经前端 base64 中转，大文件也秒级完成）。
   *  返回 { path, name, tmpUrl }；取消 / 失败返回 null。仅客户端模式可用，demo 返回 null。 */
  async function pickLocalMedia(filters) {
    if (demo) return null;
    const picked = await client.shell.showFileDialog(filters);
    if (picked.error || !picked.data) return null;
    const path = picked.data;
    const res = await client.api.copyToTmp(path);
    if (res.error || !res.data) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
    const name = path.split(/[\\/]/).pop() || "file";
    return { path, name, tmpUrl: res.data };
  }

  /** 创建媒体壁纸：上传 → 截封面 → createWallpaperNew；type 可显式指定（如 4 = Web），缺省自动检测。
   *  local = pickLocalMedia 的结果（后端已把源文件复制进 tmp），给了就跳过前端上传。 */
  async function createMediaWallpaper({ title, file, local, previewEl, type, onProgress }) {
    const fileUrl = local ? local.tmpUrl : await uploadFile(file, onProgress);
    let coverUrl = "";
    const base64 = previewEl ? captureCover(previewEl) : null;
    if (base64) coverUrl = await uploadCover(base64);
    // 预览在但截图失败 = canvas 受污染（media.localhost 跨源），落库后 mpv 会兜底生成封面，不必惊扰
    else if (!demo && type !== 4 && !previewEl) toast(t("create.coverFailed"));
    const srcName = (file || local || {}).name || "";
    const payload = {
      fileUrl,
      coverUrl,
      meta: { title: title || srcName.replace(/\.[^.]+$/, ""), type: type || 0, playIndex: 0, wallpapers: [] },
      setting: defaultSetting(),
      runningInfo: { screenIndexes: [], isPaused: false },
    };
    if (demo) { mockCreate(payload); return true; }
    const res = await client.api.createWallpaperNew(payload);
    if (res.error) { toast(t("create.createFailed", errText(res.error)), "err"); return false; }
    await refreshWallpapers();
    return true;
  }

  /** 创建播放列表 */
  async function createPlaylist({ title, members }) {
    const fileUrl = await uploadPlaylistPlaceholder();
    if (!fileUrl) return false;
    const coverUrl = (await generatePlaylistCover(members.map((m) => m.coverUrl))) || "";
    const payload = {
      fileUrl,
      coverUrl,
      meta: { title: title || t("create.playlist"), type: 6, playIndex: 0, wallpapers: members },
      setting: defaultSetting(),
      runningInfo: { screenIndexes: [], isPaused: false },
    };
    if (demo) { mockCreate(payload); return true; }
    const res = await client.api.createWallpaperNew(payload);
    if (res.error) { toast(t("create.createFailed", errText(res.error)), "err"); return false; }
    await refreshWallpapers();
    return true;
  }

  /** 更新壁纸（title / 成员 / 替换文件后） */
  async function updateWallpaper(wallpaper) {
    if (demo) { mockUpdate(wallpaper); return true; }
    const res = await client.api.updateWallpaperNew(JSON.parse(JSON.stringify(wallpaper)), wallpaper.fileUrl || "");
    if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return false; }
    await refreshWallpapers();
    return true;
  }

  async function saveWallpaperSetting(wallpaper, setting) {
    const target = JSON.parse(JSON.stringify(wallpaper));
    target.setting = setting;
    if (demo) { mockUpdate(target); toast(t("set.saved"), "ok"); return true; }
    const res = await client.api.setWallpaperSetting(setting, target);
    if (res.error) { toast(t("set.saveFailed", errText(res.error)), "err"); return false; }
    toast(t("set.saved"), "ok");
    await refreshWallpapers();
    return true;
  }

  async function deleteWallpaper(wallpaper) {
    if (demo) { mockDelete(wallpaper); return true; }
    const res = await client.api.deleteWallpaper(JSON.parse(JSON.stringify(wallpaper)));
    if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return false; }
    await Promise.all([refreshWallpapers(), refreshStatus()]);
    return true;
  }

  async function reveal(wallpaper) {
    if (!wallpaper.filePath) { toast(t("common.opFailed", "no filePath"), "err"); return; }
    if (demo) { toast(`${t("common.demo")} · ${t("common.location")}`, "ok"); return; }
    await client.api.explore(wallpaper.filePath);
  }

  // ---------------------------------------------------------------- 下载
  async function cancelDownload(id) {
    if (demo) { state.downloads = state.downloads.filter((d) => d.id !== id); emit("downloads", state.downloads); return; }
    await client.api.cancelDownloadWallpaper(id);
    refreshDownloads();
  }
  async function clearHistory() {
    if (demo) { state.history = []; emit("history", state.history); return; }
    const res = await client.api.clearDownloadHistory();
    if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return; }
    toast(t("dl.cleared"), "ok");
    await refreshHistory();
  }
  async function removeHistory(id) {
    if (demo) { state.history = state.history.filter((h) => h.id !== id); emit("history", state.history); return; }
    const res = await client.api.removeDownloadHistoryItem(id);
    if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return; }
    await refreshHistory();
  }

  // ---------------------------------------------------------------- 文件夹整理
  /** 旧版应用 SDK 没有目录接口时，从壁纸数据推导子文件夹（根层级返回库根目录；空文件夹不可见）。 */
  function legacyFolders(dir) {
    const roots = ((state.cfg && state.cfg.Wallpaper && state.cfg.Wallpaper.directories) || []).filter(Boolean);
    if (!dir) return roots;
    const root = String(dir).toLowerCase().replace(/\//g, "\\").replace(/\\+$/, "");
    const set = new Set();
    for (const w of state.wallpapers) {
      const d = String(w.dir || "").toLowerCase().replace(/\//g, "\\").replace(/\\+$/, "");
      if (d.startsWith(`${root}\\`) && !d.slice(root.length + 1).includes("\\")) set.add(w.dir);
    }
    return [...set];
  }
  /** 列出子文件夹；dir 为空串时返回库根目录。接口缺失或失败时退化为按壁纸数据推导。 */
  async function listFolders(dir) {
    if (demo) return mockListFolders(dir);
    if (typeof client.api.listFolders !== "function") return legacyFolders(dir);
    try {
      const res = await client.api.listFolders(dir);
      if (res.error) return legacyFolders(dir);
      return res.data || [];
    } catch (e) { return legacyFolders(dir); }
  }
  /** 新建文件夹，返回完整路径；失败 toast 并返回 null。 */
  async function createFolder(parent, name) {
    if (demo) return mockCreateFolder(parent, name);
    if (typeof client.api.createFolder !== "function") { toast(t("local.needUpdate"), "err"); return null; }
    try {
      const res = await client.api.createFolder(parent, name);
      if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
      return res.data;
    } catch (e) { toast(t("common.opFailed", errText(e)), "err"); return null; }
  }
  /** 移动壁纸到目标文件夹，返回新文件路径；失败 toast 并返回 null。 */
  async function moveWallpaper(wallpaper, targetDir) {
    if (demo) return mockMoveWallpaper(wallpaper, targetDir);
    if (typeof client.api.moveWallpaper !== "function") { toast(t("local.needUpdate"), "err"); return null; }
    try {
      const res = await client.api.moveWallpaper(wallpaper.filePath, targetDir);
      if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
      return res.data;
    } catch (e) { toast(t("common.opFailed", errText(e)), "err"); return null; }
  }
  /** 读取文件夹的桌面式布局（条目名 → {c,r} 槽位）；接口缺失或失败返回空表。 */
  async function getFolderLayout(dir) {
    if (demo) return mockGetLayout(dir);
    if (typeof client.api.getFolderLayout !== "function") return {};
    try {
      const res = await client.api.getFolderLayout(dir);
      return res.error ? {} : (res.data || {});
    } catch (e) { return {}; }
  }
  /** 保存文件夹的桌面式布局；接口缺失或失败静默跳过（旧版仅本次会话内存生效）。 */
  async function saveFolderLayout(dir, layout) {
    if (demo) { mockSaveLayout(dir, layout); return; }
    if (typeof client.api.saveFolderLayout !== "function") return;
    try { await client.api.saveFolderLayout(dir, layout); } catch (e) { /* 位置记忆失败可忽略 */ }
  }
  /** 移动子文件夹到目标文件夹，返回新路径；失败 toast 并返回 null。 */
  async function moveFolder(source, targetDir) {
    if (demo) return mockMoveFolder(source, targetDir);
    if (typeof client.api.moveFolder !== "function") { toast(t("local.needUpdate"), "err"); return null; }
    try {
      const res = await client.api.moveFolder(source, targetDir);
      if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return null; }
      return res.data;
    } catch (e) { toast(t("common.opFailed", errText(e)), "err"); return null; }
  }
  /** 删除库内子文件夹（递归；确认由界面层负责），返回是否成功。 */
  async function deleteFolder(dir) {
    if (demo) return mockDeleteFolder(dir);
    if (typeof client.api.deleteFolder !== "function") { toast(t("local.needUpdate"), "err"); return false; }
    try {
      const res = await client.api.deleteFolder(dir);
      if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return false; }
      return res.data === true;
    } catch (e) { toast(t("common.opFailed", errText(e)), "err"); return false; }
  }

  // ---------------------------------------------------------------- mpv / 皮肤 / 系统
  async function mpvStatus() {
    if (demo) return { available: true, path: "C:\\demo\\mpv\\mpv.exe", downloading: false };
    const res = await client.api.getMpvStatus();
    return res.error ? null : res.data;
  }
  async function mpvDownload() {
    if (demo) { toast(`${t("common.demo")} · ${t("cfg.mpvDownload")}`, "ok"); return; }
    await client.api.downloadMpv();
  }
  async function mpvCancel() { if (!demo) await client.api.cancelDownloadMpv(); }
  async function mpvFolder() {
    if (demo) { toast(`${t("common.demo")} · ${t("cfg.mpvFolder")}`, "ok"); return; }
    await client.api.openMpvFolder();
  }
  function onMpvEvent(cb) {
    if (demo) return () => {};
    return client.on("mpv-download-event", (p) => cb(p));
  }

  async function listSkins() {
    if (demo) {
      const skin = (id, name, description) => ({ id, name, version: meta.version, author: "GiantappMan", description, type: "app", entry: "index.html", builtin: id === "default", valid: true, invalidReason: null });
      return [
        skin("default", "巨应壁纸默认皮肤", "内置默认界面"),
        skin("aurora", "璃光 Aurora", "玻璃拟态 · 暗夜极光"),
        skin("paper", "素笺 Paper Ink", "纸感编辑部极简"),
        skin("term", "终端 Term", "单色荧光 HUD 极客终端"),
        skin("cupertino", "月霜 Cupertino", "macOS 菜单栏与程序坞"),
        skin("material", "拾色 Material", "Material 3 色调表面"),
        skin("linear", "曜石 Linear", "曜黑发丝线 SaaS 风"),
        skin("bento", "便当 Bento", "Bento Grid 模块卡片"),
        skin("brutal", "新粗野 Brutal", "硬边框硬阴影撞色"),
        skin("liquid", "流光 Liquid", "液态玻璃悬浮胶囊"),
        skin("fluent", "云母 Fluent", "Windows 11 云母质感"),
      ];
    }
    const res = await client.api.listSkins();
    return res.error ? [] : res.data || [];
  }
  async function applySkin(id) {
    if (demo) { toast(`${t("common.demo")} · ${id}`, "ok"); return true; }
    const res = await client.api.setActiveSkin(id);
    if (res.error) { toast(t("common.opFailed", errText(res.error)), "err"); return false; }
    await saveConfig("Appearance", { skin: id });
    return true;
  }
  async function openSkinsFolder() {
    if (demo) { toast(`${t("common.demo")}`, "ok"); return; }
    await client.api.openSkinsFolder();
  }

  /** 自定义皮肤开发指南全文（后端内嵌的 Markdown，见 docs/5.自定义皮肤指南.md） */
  async function customSkinDoc() {
    if (demo) return `# ${t("cfg.skinCustom")}\n\n${t("cfg.skinDocHint")}`;
    try {
      return await window.__TAURI__.core.invoke("get_custom_skin_doc");
    } catch (e) {
      toast(t("common.opFailed", errText(e)), "err");
      return null;
    }
  }

  /** 写剪贴板：优先 async Clipboard API，失败回退 execCommand */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.append(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch { return false; }
    }
  }

  /** 「自定义皮肤」弹窗：指南全文 + 一键复制（粘贴给 AI 生成皮肤） */
  async function showCustomSkinDoc() {
    const doc = await customSkinDoc();
    if (doc === null) return;
    const overlay = el("div", { class: "sc-modal-overlay" },
      el("div", { class: "sc-modal sc-modal-doc" },
        el("div", { class: "sc-modal-title" }, t("cfg.skinCustom")),
        el("div", { class: "sc-modal-body sc-doc-hint" }, t("cfg.skinDocHint")),
        el("pre", { class: "sc-doc-pre", tabIndex: 0 }, doc),
        el("div", { class: "sc-modal-actions" },
          el("button", { class: "sc-btn", onclick: () => openSkinsFolder() }, t("cfg.skinOpen")),
          el("button", {
            class: "sc-btn is-primary",
            onclick: async () => {
              const ok = await copyText(doc);
              toast(ok ? t("cfg.skinDocCopied") : t("common.opFailed", "clipboard"), ok ? "ok" : "err");
            },
          }, t("cfg.skinDocCopy")),
          el("button", { class: "sc-btn", onclick: () => overlay.remove() }, t("common.close")))));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.append(overlay);
  }

  function openUrl(url) {
    if (demo) { window.open(url, "_blank"); return; }
    client.api.openUrl(url);
  }
  async function openStoreReview() {
    const fallback = "https://apps.microsoft.com/detail/9NBLGGH4ZD4C";
    if (demo) { toast(`${t("common.demo")}`, "ok"); return; }
    await client.api.openStoreReview(fallback);
  }
  async function openLogs() {
    if (demo) { toast(`${t("common.demo")}`, "ok"); return; }
    await client.api.openLogFolder();
  }
  async function exitApp() {
    if (demo) { toast(`${t("common.demo")} · ${t("about.exit")}`, "ok"); return; }
    await client.api.exitApp();
  }

  const HUB_ADDRESS = "https://wallpaper.giantapp.cn";
  function hubUrl(target) {
    if (target) return `${HUB_ADDRESS}?target=${encodeURIComponent(target)}`;
    const lang = state.lang;
    const mode = document.documentElement.dataset.mode || "dark";
    return `${HUB_ADDRESS}/${lang}/explorer?mode=${mode}`;
  }
  function communityLogin() {
    if (demo) { toast(`${t("common.demo")} · ${t("hub.login")}`, "ok"); return; }
    client.api.openCommunityWindow(HUB_ADDRESS);
  }

  // ---------------------------------------------------------------- 演示模式 mock
  function mockCoverDataURL(w, h, kind, hue) {
    const h1 = (hue * 47) % 360, h2 = (h1 + 60 + ((hue * 13) % 80)) % 360;
    const shapes = {
      0: `<circle cx="70%" cy="30%" r="90" fill="hsla(${h2},85%,72%,.65)"/><circle cx="30%" cy="70%" r="130" fill="hsla(${h1},75%,62%,.45)"/>`,
      1: `<path d="M0 ${h * 0.7} Q ${w * 0.25} ${h * 0.4} ${w * 0.5} ${h * 0.65} T ${w} ${h * 0.55} V ${h} H 0 Z" fill="hsla(${h2},80%,68%,.7)"/>`,
      2: `<rect x="15%" y="20%" width="30%" height="60%" rx="24" fill="hsla(${h1},72%,64%,.55)" transform="rotate(-8 50 50)"/><rect x="52%" y="30%" width="26%" height="50%" rx="24" fill="hsla(${h2},78%,70%,.55)" transform="rotate(6 50 50)"/>`,
      3: `<polygon points="${w / 2},18 ${w * 0.88},${h / 2} ${w / 2},${h - 18} ${w * 0.12},${h / 2}" fill="hsla(${h2},88%,76%,.85)"/>`,
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},62%,40%)"/><stop offset="1" stop-color="hsl(${h2},70%,56%)"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${shapes[kind % 4]}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function mockConfig() {
    return {
      General: { autoStart: false, hideWindow: false, autoStartHeadless: false, currentLan: navigator.language && navigator.language.startsWith("zh") ? "zh" : "en" },
      Wallpaper: { directories: ["D:\\LiveWallpaper", "E:\\壁纸库"], coveredBehavior: 1, defaultVideoPlayer: 2, keepWallpaper: false },
      Appearance: { theme: "zinc", mode: (window.SKIN_META && window.SKIN_META.mode) || "dark", skin: (window.SKIN_META && window.SKIN_META.id) || "fluent" },
      Update: { uiUrl: "", uiAuto: true, uiActive: false, appUrl: "", appChannel: "stable", appAutoDownload: true },
    };
  }

  function mockData() {
    const mk = (i, title, type, kind, sub = "") => {
      const base = sub ? `D:\\LiveWallpaper\\${sub}` : "D:\\LiveWallpaper";
      return {
        dir: base, fileName: `${title}.mp4`, filePath: `${base}\\${title}.mp4`,
        fileUrl: demo ? mockCoverDataURL(600, 400, kind, i + 3) : "",
        coverUrl: mockCoverDataURL(500, 280, kind, i + 3), coverPath: "",
        meta: { id: `mock-${i}`, title, description: "", type, playIndex: 0, wallpapers: [] },
        setting: defaultSetting(),
        runningInfo: { screenIndexes: [], isPaused: false },
      };
    };
    const list = [
      mk(0, "霓虹雨夜 · Neon Rain", 3, 0), mk(1, "Aurora Falls", 3, 1), mk(2, "森林晨雾 Forest Mist", 1, 2, "风景"),
      mk(3, "赛博都市 Cyber City", 3, 3, "赛博"), mk(4, "海浪白噪 Ocean Waves", 2, 1), mk(5, "水墨山川 Ink Mountains", 1, 2, "风景"),
      mk(6, "流光星轨 Star Trails", 3, 0), mk(7, "粉黛晚霞 Sunset Glow", 1, 1),
    ];
    const playlist = {
      dir: "D:\\LiveWallpaper", fileName: "深夜工作台.playlist", filePath: "D:\\LiveWallpaper\\深夜工作台.playlist",
      fileUrl: "mock://media/x.playlist", coverUrl: mockCoverDataURL(500, 280, 3, 9), coverPath: "",
      meta: { id: "mock-list", title: "深夜工作台 · Night Shift", description: "", type: 6, playIndex: 1, wallpapers: [list[1], list[3], list[6]] },
      setting: { ...defaultSetting(), playMode: 0 },
      runningInfo: { screenIndexes: [0], isPaused: false },
    };
    const second = mk(8, "极光冰原 Glacier", 1, 2);
    second.runningInfo = { screenIndexes: [1], isPaused: true };
    return [...list, playlist, second];
  }

  function mockStatus() {
    return {
      screens: [
        { index: 0, bitsPerPixel: 32, bounds: "0, 0, 2560, 1440", deviceName: "DELL U2723QE", primary: true, workingArea: "0, 0, 2560, 1392" },
        { index: 1, bitsPerPixel: 32, bounds: "2560, 0, 1920, 1080", deviceName: "HDMI 1", primary: false, workingArea: "2560, 0, 1920, 1032" },
      ],
      wallpapers: [],
      audioScreenIndex: 0,
      volume: 60,
      coveredScreens: [],
    };
  }

  function mockApply(target) {
    const src = state.wallpapers.find((w) => w.filePath === target.filePath) || target;
    state.status.wallpapers = state.status.wallpapers.filter((w) => !w.filePath.startsWith(target.filePath));
    state.status.wallpapers.unshift(JSON.parse(JSON.stringify({ ...src, runningInfo: target.runningInfo })));
  }
  function mockPause(paused) {
    state.status.wallpapers.forEach((w) => { w.runningInfo.isPaused = paused; });
    emit("status", state.status);
  }
  function mockStop(screenIndex) {
    state.status.wallpapers = screenIndex === undefined || screenIndex < 0
      ? []
      : state.status.wallpapers.filter((w) => !(w.runningInfo.screenIndexes || []).includes(screenIndex));
    emit("status", state.status);
  }
  function mockShift(delta) {
    const pl = state.status.wallpapers.find((w) => w.meta && w.meta.type === 6);
    if (!pl) return;
    const n = pl.meta.wallpapers.length;
    pl.meta.playIndex = ((pl.meta.playIndex || 0) + delta + n) % n;
    emit("status", state.status);
  }
  let mockPos = 42, mockDur = 214;
  function mockTick() { mockPos = (mockPos + 1) % mockDur; }
  function mockTime() { return { position: mockPos, duration: mockDur }; }
  function mockSeek(sec) { mockPos = Math.max(0, Math.min(mockDur - 1, Math.floor(sec))); }
  function mockCreate(payload) {
    state.wallpapers.unshift({
      dir: "D:\\LiveWallpaper", fileName: `${payload.meta.title}.mp4`, filePath: `D:\\LiveWallpaper\\${payload.meta.title}`,
      fileUrl: demo ? mockCoverDataURL(600, 400, 0, state.wallpapers.length + 5) : "", coverUrl: mockCoverDataURL(500, 280, 0, state.wallpapers.length + 5), coverPath: "",
      meta: JSON.parse(JSON.stringify(payload.meta)), setting: payload.setting, runningInfo: { screenIndexes: [], isPaused: false },
    });
    emit("wallpapers", state.wallpapers);
  }
  function mockUpdate(wallpaper) {
    const i = state.wallpapers.findIndex((w) => w.filePath === wallpaper.filePath);
    if (i >= 0) state.wallpapers[i] = JSON.parse(JSON.stringify(wallpaper));
    emit("wallpapers", state.wallpapers);
  }
  function mockDelete(wallpaper) {
    state.wallpapers = state.wallpapers.filter((w) => w.filePath !== wallpaper.filePath);
    state.status.wallpapers = state.status.wallpapers.filter((w) => w.filePath !== wallpaper.filePath);
    emit("wallpapers", state.wallpapers);
    emit("status", state.status);
  }

  // ---------- 文件夹整理（演示） ----------
  let demoEmptyFolders = [];
  const normWin = (p) => String(p || "").toLowerCase().replace(/\//g, "\\").replace(/\\+$/, "");
  function mockChildFolders(dir) {
    const root = normWin(dir);
    const set = new Set();
    for (const w of state.wallpapers) {
      const d = normWin(w.dir);
      if (d.startsWith(`${root}\\`) && !d.slice(root.length + 1).includes("\\")) set.add(w.dir);
    }
    for (const d of demoEmptyFolders) {
      const n = normWin(d);
      if (n.startsWith(`${root}\\`) && !n.slice(root.length + 1).includes("\\")) set.add(d);
    }
    return [...set];
  }
  function mockListFolders(dir) {
    if (!dir) return (mockConfig().Wallpaper.directories || []).filter(Boolean);
    return mockChildFolders(dir);
  }
  function mockCreateFolder(parent, name) {
    const p = `${parent}\\${name.trim()}`;
    demoEmptyFolders.push(p);
    return p;
  }
  function mockMoveWallpaper(wallpaper, targetDir) {
    const oldPath = wallpaper.filePath;
    const item = state.wallpapers.find((x) => x.filePath === oldPath);
    if (!item) return null;
    item.dir = targetDir;
    item.filePath = `${targetDir}\\${item.fileName}`;
    demoEmptyFolders = demoEmptyFolders.filter((d) => normWin(d) !== normWin(targetDir));
    for (const pl of state.wallpapers) {
      if (!(pl.meta && pl.meta.type === 6)) continue;
      for (const m of pl.meta.wallpapers || []) {
        if (m.filePath === oldPath) { m.filePath = item.filePath; m.dir = targetDir; }
      }
    }
    emit("wallpapers", state.wallpapers);
    return item.filePath;
  }
  const demoLayouts = {}; // 演示模式的布局表（按目录记忆，仅本次会话）
  function mockGetLayout(dir) { return demoLayouts[normWin(dir)] || {}; }
  function mockSaveLayout(dir, layout) { demoLayouts[normWin(dir)] = layout || {}; }
  function mockMoveFolder(source, targetDir) {
    const name = String(source).split(/[\\/]/).filter(Boolean).pop() || "";
    demoEmptyFolders = demoEmptyFolders.filter((d) => normWin(d) !== normWin(source));
    demoEmptyFolders.push(`${targetDir}\\${name}`);
    return `${targetDir}\\${name}`;
  }
  function mockDeleteFolder(dir) {
    const n = normWin(dir);
    demoEmptyFolders = demoEmptyFolders.filter((d) => !normWin(d).startsWith(n));
    state.wallpapers = state.wallpapers.filter((w) => !normWin(w.dir).startsWith(n));
    delete demoLayouts[n];
    emit("wallpapers", state.wallpapers);
    return true;
  }

  function mockInit() {
    state.cfg = mockConfig();
    state.wallpapers = mockData();
    state.status = mockStatus();
    state.screens = state.status.screens || []; // 与 refreshStatus 的口径一致（此前演示模式拿不到屏幕列表）
    state.status.wallpapers = state.wallpapers.filter((w) => (w.runningInfo.screenIndexes || []).length);
    state.downloads = [
      { id: "dl-1", desc: "赛博朋克 2077 主题包.mp4", percent: 42, totalBytes: 892344832, receivedBytes: 374784829, isDownloading: true, isDownloadCompleted: false, IsCanceled: false },
      { id: "dl-2", desc: "动态极光 4K.gif", percent: 87, totalBytes: 42831040, receivedBytes: 37263104, isDownloading: true, isDownloadCompleted: false, IsCanceled: false },
    ];
    state.history = [
      { id: "h-1", title: "雨夜霓虹 4K", filePath: "D:\\LiveWallpaper\\neon-rain.mp4", coverPath: "", totalBytes: 356515840, completedAt: Date.now() - 86400000 * 2, coverUrl: mockCoverDataURL(500, 280, 0, 4), fileUrl: "" },
      { id: "h-2", title: "深海巨浪 Slow TV", filePath: "D:\\LiveWallpaper\\wave.mp4", coverPath: "", totalBytes: 1243461632, completedAt: Date.now() - 86400000 * 9, coverUrl: mockCoverDataURL(500, 280, 1, 7), fileUrl: "" },
      { id: "h-3", title: "蒸汽波城市", filePath: "D:\\LiveWallpaper\\vapor.mp4", coverPath: "", totalBytes: 524288000, completedAt: Date.now() - 86400000 * 21, coverUrl: mockCoverDataURL(500, 280, 3, 11), fileUrl: "" },
    ];
    emit("wallpapers", state.wallpapers);
    emit("status", state.status);
    emit("downloads", state.downloads);
    emit("history", state.history);
  }

  // ---------------------------------------------------------------- 启动
  async function boot(ready) {
    if (demo) {
      mockInit();
      applyLang(state.cfg.General.currentLan);
      applyMode();
      startTicker();
      ready();
      return;
    }
    client.api.initEvents();
    client.on("playing-status-changed", () => refreshStatus());
    // 下载完成 -> 新文件入库，刷新本地库。进度/失败/取消不触发全库重扫；
    // 完成事件在 30s 状态清理时还会重发一次，按 id 去重，同 id 重新下载时重置。
    // 注意：client.on 回调参数是已解包的事件 payload（见 SDK on()），不是原始事件
    const importedIds = new Set();
    client.on("download-status-changed", (p) => {
      refreshDownloads();
      refreshHistory();
      let completed = false;
      for (const it of (p && p.items) || []) {
        if (it.isDownloading && !it.IsCanceled) { importedIds.delete(it.id); continue; }
        if (it.isDownloadCompleted && !it.IsCanceled && !importedIds.has(it.id)) {
          importedIds.add(it.id);
          completed = true;
        }
      }
      if (completed) refreshWallpapers();
    });
    client.on("skins-changed", () => emit("skins"));
    client.on("appearance-changed", async () => { await loadConfig(); applyMode(); emit("config", "Appearance"); });
    client.on("system-theme-changed", () => applyMode());
    client.on("hub-session-changed", () => emit("hub-session"));
    client.on("navigate", (p) => {
      p = p || {};
      if (p.target) { state.hubTarget = p.target; emit("nav", { view: "hub" }); }
      else if (p.path) {
        const map = { "/": "library", "/hub": "hub", "/downloads": "downloads", "/settings": "settings", "/about": "about" };
        emit("nav", { view: map[p.path] || "library" });
      }
    });
    client.on("mpv-download-event", () => emit("mpv"));
    // 更新事件（界面热更新 / 程序更新）：解包后转发 SC 总线（app.js 订阅渲染进度与安装提示）
    client.on("ui-update-event", (p) => emit("ui-update", p));
    client.on("app-update-event", (p) => emit("app-update", p));
    // 接管 refresh-page（index.html 已设 skipAutoRefresh 关闭 SDK 内置整页
    // reload）：壁纸配置/库数据变化原地软刷新避免闪屏；皮肤文件热更等其余
    // 来源（payload 无 reason）仍整页 reload，skin:// 重新读盘
    client.on("refresh-page", async (p) => {
      if (p && p.reason === "wallpaper-config") {
        await refreshAll();
        emit("config", "Wallpaper");
        return;
      }
      window.location.reload();
    });

    await loadConfig();
    applyLang(state.cfg.General && state.cfg.General.currentLan);
    applyMode();
    startTicker();
    await Promise.all([refreshWallpapers(), refreshStatus(), refreshDownloads(), refreshHistory()]);
    ready();
    client.shell.hideLoading();
  }

  window.SC = {
    // 元信息 / 环境
    meta, client, demo, inClient,
    // 状态与订阅
    state, on, emit,
    // i18n
    t, setLang: switchLang, lang: () => state.lang,
    // 模式
    resolvedMode, applyMode, setMode,
    // DOM / 工具
    el, toast, call, confirm: confirmDlg, debounce, fmtBytes, fmtTime, typeName, errText, pretty,
    // 数据刷新
    refreshAll,
    // 播放
    playingSet, screenIndexOf, canPause, findPlayingWallpaper,
    applyWallpaper, pause, resume, stop, prevIn, nextIn, setVolume,
    onTime, seek, setTimeScreen,
    // 创建 / 编辑
    defaultSetting, uploadFile, uploadWebFolder, createWebWallpaperFolder, captureCover, uploadCover, generatePlaylistCover,
    createMediaWallpaper, createPlaylist, updateWallpaper, saveWallpaperSetting, deleteWallpaper, reveal,
    pickLocalMedia, statWebFolder, importWebFolder, demo,
    // 下载
    cancelDownload, clearHistory, removeHistory,
    // 文件夹整理
    listFolders, createFolder, moveWallpaper, getFolderLayout, saveFolderLayout, moveFolder, deleteFolder,
    // mpv
    mpvStatus, mpvDownload, mpvCancel, mpvFolder, onMpvEvent,
    // 皮肤
    listSkins, applySkin, openSkinsFolder, showCustomSkinDoc,
    // 系统 / 链接
    openUrl, openStoreReview, openLogs, exitApp, hubUrl, communityLogin,
    HUB_ADDRESS,
    saveConfig,
    /** 底层命令透传（更新等新增命令面；仅 inClient 下可用，调用方自行判 demo） */
    invoke: (cmd, args) => window.__TAURI__.core.invoke(cmd, args),
    boot,
  };
})();
