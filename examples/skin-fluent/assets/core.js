/**
 * 皮肤共享引擎 SkinCore（官方皮肤共用，逻辑与 skin-dev / 默认皮肤对齐）。
 *
 * 职责：状态缓存与订阅、i18n（zh/en，ru/es 回退 en）、播放控制与进度轮询规则、
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
      "type.1": "图片", "type.2": "动图", "type.3": "视频", "type.4": "Web", "type.5": "Exe", "type.6": "列表", "type.0": "自动检测",
      "lib.title": "壁纸库", "lib.count": "{0} 个壁纸", "lib.search": "搜索壁纸…", "lib.empty": "还没有壁纸",
      "lib.emptyHint": "点击右上角「创建」导入本地视频或图片，或从社区下载",
      "lib.target": "应用到", "lib.playingBadge": "正在播放",
      "local.title": "本地库", "local.count": "{0} 项", "local.target": "应用到",
      "local.filter": "类型", "local.filterAll": "全部类型", "local.sort": "排序",
      "local.sortName": "按名称", "local.sortType": "按类型", "local.openDirs": "打开目录",
      "local.newFolder": "新建文件夹", "local.folderNamePh": "文件夹名称",
      "local.moveTo": "移动到…", "local.moveTitle": "移动到文件夹", "local.moveCurrent": "当前位置",
      "local.moved": "已移动到「{0}」", "local.folderCreated": "文件夹已创建",
      "local.open": "打开", "local.rearrange": "自动整理",
      "local.delFolder": "删除文件夹",
      "local.delFolderBody": "「{0}」和其中的全部内容将被永久删除，此操作无法撤销。",
      "local.delFolderCount": "其中包含 {0} 个壁纸",
      "local.folderEmpty": "这个文件夹是空的",
      "local.folderEmptyHint": "右键壁纸选择「移动到…」，或直接把壁纸拖到文件夹卡片上",
      "local.searchEmpty": "没有匹配的壁纸",
      "local.needUpdate": "文件夹整理需要先更新巨应壁纸到新版本",
      "local.empty": "目录里还没有壁纸文件",
      "local.emptyHint": "把视频或图片放进壁纸目录就会出现在这里；也可到 设置 → 壁纸 检查目录配置",
      "create.wallpaper": "创建壁纸", "create.playlist": "创建播放列表", "create.editWallpaper": "编辑壁纸", "create.editList": "编辑列表",
      "create.titleField": "标题", "create.titlePh": "给{0}起个名字", "create.type": "类型",
      "create.file": "点击选择文件，或把文件拖到这里", "create.fileHint": "支持图片 / 动图 / 视频（≤ 500MB）",
      "create.importing": "导入中 {0}%", "create.imported": "已导入", "create.reselect": "重新选择",
      "create.addMembers": "添加壁纸", "create.members": "成员 {0}", "create.membersEmpty": "还没有成员，点击「添加壁纸」从库中选择",
      "create.creating": "创建中…", "create.titleEmpty": "标题不能为空", "create.noFile": "请先选择文件",
      "create.listEmpty": "播放列表至少需要一个成员", "create.created": "创建成功", "create.createFailed": "创建失败：{0}",
      "create.updated": "已保存", "create.coverFailed": "封面生成失败（已跳过，稍后可自动生成）",
      "create.unsaved": "有未保存的修改", "create.unsavedBody": "关闭后将丢失这些修改，确定关闭吗？",
      "create.pickTitle": "选择成员", "create.pickHint": "点击卡片选择，播放列表不能嵌套播放列表", "create.selectAll": "全选",
      "set.title": "壁纸设置", "set.sub": "「{0}」的播放参数，保存后立即生效",
      "set.duration": "播放时长", "set.durationHint": "该壁纸在播放列表中停留的时间（时:分）",
      "set.playMode": "播放模式", "set.order": "顺序播放", "set.random": "随机播放",
      "set.mouse": "鼠标交互", "set.mouseHint": "允许壁纸响应鼠标移动与点击",
      "set.player": "视频引擎", "set.engine0": "默认", "set.engine1": "MPV 播放器", "set.engine2": "系统播放器",
      "set.hwdec": "硬件解码", "set.hwdecHint": "显著降低播放视频时的 CPU 占用",
      "set.panscan": "铺满拉伸", "set.panscanHint": "裁剪画面以铺满整个屏幕",
      "set.fit": "契合度", "set.fit0": "居中", "set.fit1": "平铺", "set.fit2": "拉伸", "set.fit3": "适应", "set.fit4": "填充", "set.fit5": "跨屏",
      "set.keep": "保留壁纸", "set.keepHint": "退出应用时不恢复原桌面壁纸",
      "set.saved": "设置已保存并生效", "set.saveFailed": "保存失败：{0}",
      "dock.stop": "停止", "dock.pause": "暂停", "dock.resume": "继续播放", "dock.prev": "上一项", "dock.next": "下一项",
      "dock.volume": "音量", "dock.audio": "音源", "dock.mute": "静音", "dock.nothing": "桌面正在休息",
      "dock.nothingHint": "点击任意壁纸即可应用", "dock.focus": "正在控制",
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
      "cfg.language": "语言", "cfg.langHint": "俄语 / 西班牙语暂以英语显示", "cfg.contribute": "贡献更多语言 →",
      "cfg.langApplied": "语言已切换",
      "cfg.dirs": "壁纸目录", "cfg.dirsHint": "第一个为保存目录，其余为读取目录",
      "cfg.addDir": "添加目录", "cfg.choose": "选择…", "cfg.covered": "被完全遮挡时",
      "cfg.covered0": "继续播放", "cfg.covered1": "自动暂停", "cfg.covered2": "停止播放",
      "cfg.player": "默认视频引擎", "cfg.mpvMissing": "未检测到 MPV —— 自动下载后视频播放性能更好",
      "cfg.mpvDownload": "自动下载 MPV", "cfg.mpvCancel": "取消下载", "cfg.mpvProgress": "下载中 {0}%",
      "cfg.mpvDone": "MPV 已就绪", "cfg.mpvFail": "MPV 下载失败：{0}", "cfg.mpvFolder": "打开 MPV 目录",
      "cfg.mode": "外观模式", "cfg.modeSys": "跟随系统", "cfg.modeLight": "浅色", "cfg.modeDark": "深色",
      "cfg.skins": "皮肤", "cfg.skinHint": "皮肤可整体更换界面风格；app 型替换界面，style 型覆盖样式",
      "cfg.skinOpen": "打开皮肤目录", "cfg.skinCurrent": "使用中", "cfg.skinInvalid": "不可用", "cfg.skinApplied": "已应用「{0}」",
      "cfg.about": "关于本皮肤", "cfg.reloadHint": "部分选项保存后界面会自动刷新",
      "about.title": "关于", "about.logs": "打开日志目录", "about.feedback": "问题反馈", "about.github": "项目主页",
      "about.review": "商店好评", "about.star": "点个 Star", "about.donate": "赞助 / 会员", "about.author": "{0} 出品",
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
      "type.1": "Image", "type.2": "GIF", "type.3": "Video", "type.4": "Web", "type.5": "Exe", "type.6": "Playlist", "type.0": "Auto",
      "lib.title": "Library", "lib.count": "{0} wallpapers", "lib.search": "Search wallpapers…", "lib.empty": "No wallpapers yet",
      "lib.emptyHint": "Hit Create to import a local video or image, or grab one from the Hub",
      "lib.target": "Apply to", "lib.playingBadge": "Now playing",
      "local.title": "Local library", "local.count": "{0} items", "local.target": "Apply to",
      "local.filter": "Type", "local.filterAll": "All types", "local.sort": "Sort",
      "local.sortName": "By name", "local.sortType": "By type", "local.openDirs": "Open folder",
      "local.newFolder": "New folder", "local.folderNamePh": "Folder name",
      "local.moveTo": "Move to…", "local.moveTitle": "Move to folder", "local.moveCurrent": "Current location",
      "local.moved": "Moved to “{0}”", "local.folderCreated": "Folder created",
      "local.open": "Open", "local.rearrange": "Auto arrange",
      "local.delFolder": "Delete folder",
      "local.delFolderBody": "“{0}” and everything inside will be permanently deleted. This cannot be undone.",
      "local.delFolderCount": "It contains {0} wallpaper(s)",
      "local.folderEmpty": "This folder is empty",
      "local.folderEmptyHint": "Right-click a wallpaper and choose “Move to…”, or drag it onto a folder card",
      "local.searchEmpty": "No matching wallpapers",
      "local.needUpdate": "Folder organizing needs a newer version of Giantapp Wallpaper",
      "local.empty": "No wallpaper files in your folders yet",
      "local.emptyHint": "Drop videos or images into a wallpaper folder and they show up here; check Settings → Wallpaper for folders",
      "create.wallpaper": "New wallpaper", "create.playlist": "New playlist", "create.editWallpaper": "Edit wallpaper", "create.editList": "Edit playlist",
      "create.titleField": "Title", "create.titlePh": "Name your {0}", "create.type": "Type",
      "create.file": "Click to pick a file, or drop it here", "create.fileHint": "Image / GIF / Video up to 500MB",
      "create.importing": "Importing {0}%", "create.imported": "Imported", "create.reselect": "Replace",
      "create.addMembers": "Add wallpapers", "create.members": "{0} members", "create.membersEmpty": "No members yet — add from your library",
      "create.creating": "Creating…", "create.titleEmpty": "Title is required", "create.noFile": "Pick a file first",
      "create.listEmpty": "A playlist needs at least one member", "create.created": "Created", "create.createFailed": "Create failed: {0}",
      "create.updated": "Saved", "create.coverFailed": "Cover generation failed (skipped)",
      "create.unsaved": "Unsaved changes", "create.unsavedBody": "Close and lose these changes?",
      "create.pickTitle": "Pick members", "create.pickHint": "Click cards to select; playlists cannot nest", "create.selectAll": "Select all",
      "set.title": "Wallpaper settings", "set.sub": "Playback options for “{0}”, applied instantly on save",
      "set.duration": "Duration", "set.durationHint": "How long this wallpaper stays in a playlist (hh:mm)",
      "set.playMode": "Play mode", "set.order": "In order", "set.random": "Random",
      "set.mouse": "Mouse interaction", "set.mouseHint": "Let the wallpaper respond to mouse",
      "set.player": "Video engine", "set.engine0": "Default", "set.engine1": "MPV player", "set.engine2": "System player",
      "set.hwdec": "Hardware decoding", "set.hwdecHint": "Greatly reduces CPU usage for video",
      "set.panscan": "Fill & crop", "set.panscanHint": "Crop the frame to fill the screen",
      "set.fit": "Fit", "set.fit0": "Center", "set.fit1": "Tile", "set.fit2": "Stretch", "set.fit3": "Fit", "set.fit4": "Fill", "set.fit5": "Span",
      "set.keep": "Keep wallpaper", "set.keepHint": "Do not restore the original desktop on exit",
      "set.saved": "Settings saved & applied", "set.saveFailed": "Save failed: {0}",
      "dock.stop": "Stop", "dock.pause": "Pause", "dock.resume": "Resume", "dock.prev": "Previous", "dock.next": "Next",
      "dock.volume": "Volume", "dock.audio": "Audio from", "dock.mute": "Mute", "dock.nothing": "The desktop is resting",
      "dock.nothingHint": "Click any wallpaper to apply it", "dock.focus": "Controlling",
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
      "cfg.language": "Language", "cfg.langHint": "Russian / Spanish fall back to English", "cfg.contribute": "Contribute more languages →",
      "cfg.langApplied": "Language switched",
      "cfg.dirs": "Wallpaper folders", "cfg.dirsHint": "First one saves new wallpapers, the rest are read-only sources",
      "cfg.addDir": "Add folder", "cfg.choose": "Browse…", "cfg.covered": "When fully covered",
      "cfg.covered0": "Keep playing", "cfg.covered1": "Auto pause", "cfg.covered2": "Stop",
      "cfg.player": "Default video engine", "cfg.mpvMissing": "MPV not found — auto-download enables smoother video",
      "cfg.mpvDownload": "Auto-download MPV", "cfg.mpvCancel": "Cancel download", "cfg.mpvProgress": "Downloading {0}%",
      "cfg.mpvDone": "MPV is ready", "cfg.mpvFail": "MPV download failed: {0}", "cfg.mpvFolder": "Open MPV folder",
      "cfg.mode": "Theme mode", "cfg.modeSys": "System", "cfg.modeLight": "Light", "cfg.modeDark": "Dark",
      "cfg.skins": "Skins", "cfg.skinHint": "Skins restyle the whole app; app skins replace the UI, style skins overlay CSS",
      "cfg.skinOpen": "Open skins folder", "cfg.skinCurrent": "In use", "cfg.skinInvalid": "Invalid", "cfg.skinApplied": "Applied “{0}”",
      "cfg.about": "About this skin", "cfg.reloadHint": "Some options refresh the UI after saving",
      "about.title": "About", "about.logs": "Open log folder", "about.feedback": "Feedback", "about.github": "Homepage",
      "about.review": "Rate the app", "about.star": "Star on GitHub", "about.donate": "Donate / membership", "about.author": "Made by {0}",
      "about.exit": "Quit app", "about.exitConfirm": "Quit Giantapp Wallpaper? Wallpapers will be cleared (keep them in Settings → Wallpaper).",
      "about.exited": "Bye", "about.skinBy": "Powered by the Giantapp Wallpaper skin system",
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
  function confirmDlg({ title, body, okText, danger }) {
    return new Promise((resolve) => {
      const close = (val) => { overlay.remove(); window.removeEventListener("keydown", onKey); resolve(val); };
      const onKey = (e) => { if (e.key === "Escape") close(false); if (e.key === "Enter") close(true); };
      const overlay = el("div", { class: "sc-modal-overlay" },
        el("div", { class: "sc-modal" },
          el("div", { class: "sc-modal-title" }, title),
          body ? el("div", { class: "sc-modal-body" }, body) : null,
          el("div", { class: "sc-modal-actions" },
            el("button", { class: "sc-btn", onclick: () => close(false) }, t("common.cancel")),
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
    const [g, w, a] = await Promise.all([
      client.api.getConfig("General"),
      client.api.getConfig("Wallpaper"),
      client.api.getConfig("Appearance"),
    ]);
    state.cfg = {
      General: g.data || {},
      Wallpaper: w.data || {},
      Appearance: a.data || {},
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
    const norm = ["zh", "en", "ru", "es"].includes(lan) ? lan : "en";
    state.lang = norm === "ru" || norm === "es" ? "en" : norm;
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

  // 进度轮询：遵守「设置后 2 秒不回读 / 暂停冻结 / -1 无效」规则
  let lastSeekAt = 0;
  let tickerTimer = null;
  const tickerCbs = new Set();
  function startTicker() {
    if (tickerTimer) return;
    tickerTimer = setInterval(async () => {
      if (document.hidden || (document).shell_hidden) return;
      if (demo) { mockTick(); const payload = mockTime(); tickerCbs.forEach((fn) => fn(payload)); return; }
      if (!state.status || !state.status.wallpapers.length) { tickerCbs.forEach((fn) => fn(null)); return; }
      if (Date.now() - lastSeekAt < 2000) return;
      const allPaused = state.status.wallpapers.every((w) => w.runningInfo && w.runningInfo.isPaused);
      if (allPaused) return;
      const res = await client.api.getWallpaperTime();
      const tp = res && res.data ? res.data : null;
      if (!tp || tp.position < 0 || tp.duration <= 0) { tickerCbs.forEach((fn) => fn(null)); return; }
      tickerCbs.forEach((fn) => fn(tp));
    }, 1000);
  }
  function onTime(fn) { tickerCbs.add(fn); return () => tickerCbs.delete(fn); }
  async function seek(seconds) {
    lastSeekAt = Date.now();
    if (demo) { mockSeek(seconds); return; }
    await client.api.setProgress(seconds);
  }

  // ---------------------------------------------------------------- 上传 / 封面 / 创建
  function uploadBlobBase64(fileName, base64) {
    return client.api.uploadToTmp(fileName, base64);
  }

  /** 分块 base64 上传（与默认皮肤 50KB 块策略一致；每块整文件覆盖写，最后一块落盘即完整） */
  function uploadFile(file, onProgress) {
    return new Promise((resolve, reject) => {
      if (demo) {
        let p = 0;
        const timer = setInterval(() => {
          p += 12 + Math.random() * 20;
          if (p >= 100) { clearInterval(timer); onProgress && onProgress(100); resolve(`mock://media/${encodeURIComponent(file.name)}`); }
          else onProgress && onProgress(Math.floor(p));
        }, 120);
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = new Uint8Array(reader.result);
          const CHUNK = 50000;
          const api = client.api;
          let lastUrl = null;
          for (let offset = 0; offset < buffer.length; offset += CHUNK) {
            if (onProgress) onProgress(Math.floor((offset / buffer.length) * 100));
            const slice = buffer.subarray(offset, Math.min(offset + CHUNK, buffer.length));
            let binary = "";
            for (let i = 0; i < slice.length; i += 0x8000) binary += String.fromCharCode.apply(null, slice.subarray(i, i + 0x8000));
            const res = await api.uploadToTmp(file.name, btoa(binary));
            if (res.error || !res.data) { reject(new Error(pretty(res.error))); return; }
            lastUrl = res.data;
          }
          if (onProgress) onProgress(100);
          resolve(lastUrl);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error("read file failed"));
      reader.readAsArrayBuffer(file);
    });
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

  /** 创建媒体壁纸：上传 → 截封面 → createWallpaperNew */
  async function createMediaWallpaper({ title, file, previewEl, onProgress }) {
    const fileUrl = await uploadFile(file, onProgress);
    let coverUrl = "";
    const base64 = previewEl ? captureCover(previewEl) : null;
    if (base64) coverUrl = await uploadCover(base64);
    else if (!demo) toast(t("create.coverFailed"));
    const payload = {
      fileUrl,
      coverUrl,
      meta: { title: title || file.name.replace(/\.[^.]+$/, ""), type: 0, playIndex: 0, wallpapers: [] },
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
    return client.on("mpv-download-event", (e) => cb(e.payload));
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
      Wallpaper: { directories: ["D:\\LiveWallpaper", "E:\\壁纸库"], coveredBehavior: 1, defaultVideoPlayer: 1, keepWallpaper: false },
      Appearance: { theme: "zinc", mode: (window.SKIN_META && window.SKIN_META.mode) || "dark", skin: (window.SKIN_META && window.SKIN_META.id) || "fluent" },
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
    client.on("download-status-changed", () => { refreshDownloads(); refreshHistory(); });
    client.on("skins-changed", () => emit("skins"));
    client.on("appearance-changed", async () => { await loadConfig(); applyMode(); emit("config", "Appearance"); });
    client.on("system-theme-changed", () => applyMode());
    client.on("hub-session-changed", () => emit("hub-session"));
    client.on("navigate", (e) => {
      const p = e && e.payload ? e.payload : {};
      if (p.target) { state.hubTarget = p.target; emit("nav", { view: "hub" }); }
      else if (p.path) {
        const map = { "/": "library", "/hub": "hub", "/downloads": "downloads", "/settings": "settings", "/about": "about" };
        emit("nav", { view: map[p.path] || "library" });
      }
    });
    client.on("mpv-download-event", () => emit("mpv"));
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
    onTime, seek,
    // 创建 / 编辑
    defaultSetting, uploadFile, captureCover, uploadCover, generatePlaylistCover,
    createMediaWallpaper, createPlaylist, updateWallpaper, saveWallpaperSetting, deleteWallpaper, reveal,
    // 下载
    cancelDownload, clearHistory, removeHistory,
    // 文件夹整理
    listFolders, createFolder, moveWallpaper, getFolderLayout, saveFolderLayout, moveFolder, deleteFolder,
    // mpv
    mpvStatus, mpvDownload, mpvCancel, mpvFolder, onMpvEvent,
    // 皮肤
    listSkins, applySkin, openSkinsFolder,
    // 系统 / 链接
    openUrl, openStoreReview, openLogs, exitApp, hubUrl, communityLogin,
    HUB_ADDRESS,
    saveConfig,
    boot,
  };
})();
