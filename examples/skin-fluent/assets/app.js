/**
 * 云母 Fluent · app.js
 * Windows 11 Fluent 风：左侧导航窗格（选中胶囊指示条）+ 命令栏 + 卡片分组设置页，
 * 亚克力浮层 / ContentDialog / Win11 开关，Mica 底 + Bloom 花形背景。
 * 依赖 ../assets/core.js（window.SC）。
 */
(function () {
  "use strict";

  const SC = window.SC;
  const { el } = SC;

  // 媒体 URL 防缓存（data: URI 不能带查询串）
  function bust(url) {
    if (!url || url.startsWith("data:")) return url;
    return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  // ---------------------------------------------------------------- 图标
  const I = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10a1 1 0 0 0 1 1h3.6v-5.4a1.9 1.9 0 0 1 3.8 0V20h3.6a1 1 0 0 0 1-1V9"/>',
    play: '<polygon points="8 5.5 18.5 12 8 18.5 8 5.5"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>',
    prev: '<polygon points="17.5 5.5 9 12 17.5 18.5 17.5 5.5"/><line x1="6" y1="5.5" x2="6" y2="18.5"/>',
    next: '<polygon points="6.5 5.5 15 12 6.5 18.5 6.5 5.5"/><line x1="18" y1="5.5" x2="18" y2="18.5"/>',
    vol: '<polygon points="11 5 6.5 9 3 9 3 15 6.5 15 11 19 11 5"/><path d="M14.5 9a4.5 4.5 0 0 1 0 6"/><path d="M17.5 6.2a8.5 8.5 0 0 1 0 11.6"/>',
    volq: '<polygon points="11 5 6.5 9 3 9 3 15 6.5 15 11 19 11 5"/><path d="M15 9a4.5 4.5 0 0 1 0 6"/>',
    volx: '<polygon points="11 5 6.5 9 3 9 3 15 6.5 15 11 19 11 5"/><line x1="15.5" y1="9.5" x2="20.5" y2="14.5"/><line x1="20.5" y1="9.5" x2="15.5" y2="14.5"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    listplus: '<line x1="3" y1="6" x2="12" y2="6"/><line x1="3" y1="11" x2="10" y2="11"/><line x1="3" y1="16" x2="12" y2="16"/><line x1="17" y1="11" x2="22" y2="11"/><line x1="19.5" y1="8.5" x2="19.5" y2="13.5"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 12a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2-1.2L14.6 3h-5.2l-.4 2.7a7.6 7.6 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2 1.2l.4 2.7h5.2l.4-2.7a7.6 7.6 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16.2" x2="12" y2="11.4"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    download: '<path d="M12 3v12"/><polyline points="7 10.5 12 15.5 17 10.5"/><path d="M4 20h16"/>',
    globe: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    pencil: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    folderplus: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="10.5" x2="12" y2="16.5"/><line x1="9" y1="13.5" x2="15" y2="13.5"/>',
    move: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
    zoomin: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
    zoomout: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="8" y1="11" x2="14" y2="11"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.1" y2="4.9"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    refresh: '<polyline points="22.5 4 22.5 10 16.5 10"/><path d="M20.2 15.5A8.5 8.5 0 1 1 18.5 6l4 4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    chevron: '<polyline points="6 9 12 15 18 9"/>',
    chevr: '<polyline points="9 6 15 12 9 18"/>',
    power: '<path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/>',
    window: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>',
    locale: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9z"/>',
    brush: '<path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L10 17l-4 1 1-4Z"/><path d="M4 21.5c2.5 0 4-1.5 4-3.5"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    star: '<polygon points="12 2.5 15 9 22 9.8 17 14.6 18.2 21.5 12 18 5.8 21.5 7 14.6 2 9.8 9 9"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    bug: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M12 20v-14M2 12h20"/>',
    menu: '<line x1="3.5" y1="6.5" x2="20.5" y2="6.5"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><line x1="3.5" y1="17.5" x2="20.5" y2="17.5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    info2: '<rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/>',
  };
  function icon(name, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`;
  }
  /** Win11 标题栏键字形（细线，与 Segoe Fluent Icons 的 ChromeMinimize/Maximize/Close 对齐） */
  function winGlyph(type) {
    const paths = {
      min: '<path d="M2 6h8"/>',
      max: '<rect x="2.5" y="2.5" width="7" height="7" rx="1"/>',
      close: '<path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/>',
    };
    return `<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" aria-hidden="true">${paths[type] || ""}</svg>`;
  }
  /** 巨应产品 logo（assets/logo.png，与默认 UI 同源） */
  function winLogo(cls) {
    return `<img class="brand-logo ${cls || ""}" src="assets/logo.png" alt="" draggable="false"/>`;
  }

  // ---------------------------------------------------------------- 全局壳
  let currentView = "library";
  let searchQuery = "";
  let applyTarget = -1; // -1 = 全部屏幕
  let refreshGrid = null; // 库视图挂载的网格刷新函数（仅库视图存在，切视图置空）
  const paneEl = el("aside", { class: "pane" });
  const viewEl = el("main", { class: "view" });
  const dockEl = el("div", { class: "dock-wrap", id: "dock" });
  const bgEl = el("div", { class: "fluent-bg", "aria-hidden": "true" },
    el("div", { class: "bloom" },
      el("i"), el("i"), el("i"), el("i"), el("i"), el("i")),
    el("div", { class: "bloom-glow" }));
  // 自绘标题栏：顶部拖拽区 + Win11 标题栏键（close = 隐藏到托盘）
  const dragStrip = el("div", { class: "drag-strip", "data-tauri-drag-region": true });
  dragStrip.addEventListener("dblclick", () => { if (SC.client) SC.client.win.toggleMaximize(); });
  const winCtrl = el("div", { class: "win-ctrl" },
    el("button", { class: "win-btn", title: "min", tabindex: "-1", onclick: () => { if (SC.client) SC.client.win.minimize(); } }),
    el("button", { class: "win-btn", title: "max", tabindex: "-1", onclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } }),
    el("button", { class: "win-btn is-close", title: "close", tabindex: "-1", onclick: () => { if (SC.client) SC.client.win.close(); } }));

  const NAV = [
    { id: "library", icon: "home", label: "nav.library" },
    { id: "local", icon: "folder", label: "nav.local" },
    { id: "hub", icon: "globe", label: "nav.hub" },
    // Win11 惯例：低频项（下载 / 设置 / 关于）沉到窗格底部 FooterMenuItems 区
    { id: "downloads", icon: "download", label: "nav.downloads", badge: true, foot: true },
    { id: "settings", icon: "gear", label: "nav.settings", foot: true },
    { id: "about", icon: "info", label: "nav.about", foot: true },
  ];

  let dlBadge = null;
  // 窗格折叠：用户手动选择（localStorage）优先；未选择时 ≤860px 自动折叠
  const PANE_KEY = "fluent.paneCompact";
  let panePref = localStorage.getItem(PANE_KEY); // null = 未手动选择
  function applyPaneCompact() {
    const compact = panePref !== null ? panePref === "1" : window.innerWidth <= 860;
    paneEl.classList.toggle("is-compact", compact);
    document.body.classList.toggle("pane-compact", compact);
  }
  function navItem(item) {
    const btn = el("button", {
      class: "nav-item",
      dataset: { view: item.id },
      title: SC.t(item.label),
      onclick: () => go(item.id),
    });
    btn.innerHTML = `<span class="nav-item-pill"></span><span class="nav-item-ico">${icon(item.icon, 17)}</span>`;
    btn.append(el("span", { class: "nav-item-label" }, SC.t(item.label)));
    if (item.badge) {
      dlBadge = el("span", { class: "nav-badge", hidden: true });
      btn.append(dlBadge);
    }
    return btn;
  }
  const brandEl = el("div", { class: "pane-brand" });
  function buildPane() {
    paneEl.innerHTML = "";
    brandEl.innerHTML = "";
    brandEl.append(
      (() => { const s = el("span", { class: "pane-brand-logo" }); s.innerHTML = winLogo(); return s; })(),
      el("span", { class: "pane-brand-name" }, SC.meta.brand));

    const nav = el("nav", { class: "pane-nav" });
    const foot = el("div", { class: "pane-foot" });
    for (const item of NAV) (item.foot ? foot : nav).append(navItem(item));
    paneEl.append(nav);
    paneEl.append(foot);
    if (SC.demo) {
      // 挂到 body：pane 的 backdrop-filter 会把 fixed 子元素变成相对自身定位
      let flag = document.querySelector(".demo-flag");
      if (!flag) { flag = el("div", { class: "demo-flag" }); document.body.append(flag); }
      flag.textContent = SC.t("common.demo");
      flag.title = SC.t("common.demoHint");
    }
    updatePane();
    applyPaneCompact();
  }
  function updatePane() {
    paneEl.querySelectorAll(".nav-item[data-view]").forEach((n) => n.classList.toggle("is-active", n.dataset.view === currentView));
  }

  // hash 形如 #/<view> 或 #/settings/<tab>：页签编进 hash，整页刷新（如保存目录触发的
  // refresh-page）后能回到原页签
  function parseHash() {
    const segs = location.hash.replace(/^#\//, "").split("/");
    return { view: segs[0] || "library", sub: segs[1] };
  }
  function go(view, sub) {
    currentView = view;
    if (view === "settings" && SETTINGS_TAB_IDS.includes(sub)) settingsTab = sub;
    location.hash = view === "settings" ? `#/settings/${settingsTab}` : `#/${view}`;
    updatePane();
    renderView();
  }
  window.addEventListener("hashchange", () => {
    const { view, sub } = parseHash();
    const tabChanged = view === "settings" && SETTINGS_TAB_IDS.includes(sub) && sub !== settingsTab;
    if (tabChanged) settingsTab = sub;
    if (view !== currentView && NAV.some((n) => n.id === view)) { currentView = view; updatePane(); renderView(); }
    else if (tabChanged && currentView === "settings") renderSettings();
  });

  // ---------------------------------------------------------------- 通用小部件
  function pageHead(title, sub, extra) {
    return el("header", { class: "page-head" },
      el("div", {},
        el("h1", { class: "page-title" }, title),
        sub ? el("p", { class: "page-sub" }, sub) : null),
      extra || null);
  }

  function pop(trigger, buildContent, align) {
    const box = el("div", { class: "pop" });
    const wrap = el("div", { class: `pop-anchor ${align || "left"}` }, trigger, box);
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = wrap.classList.contains("is-open");
      closePops();
      if (open) return;
      box.innerHTML = "";
      box.append(buildContent());
      wrap.classList.add("is-open");
    });
    return wrap;
  }
  function closePops() { document.querySelectorAll(".pop-anchor.is-open").forEach((n) => n.classList.remove("is-open")); }
  window.addEventListener("click", closePops);
  window.addEventListener("blur", closePops);

  function switchEl(checked, onchange) {
    const input = el("input", { type: "checkbox" });
    input.checked = !!checked;
    if (onchange) input.addEventListener("change", () => onchange(input.checked));
    return el("label", { class: "switch" }, input, el("span", { class: "switch-track" }, el("span", { class: "switch-thumb" })));
  }

  function selectEl(options, value, onchange) {
    // options: [{value,label}]
    const wrap = el("div", { class: "select" });
    const btn = el("button", { class: "select-btn", type: "button" });
    const renderLabel = () => {
      const cur = options.find((o) => String(o.value) === String(value));
      btn.innerHTML = `<span>${cur ? cur.label : ""}</span>${icon("chevron", 13)}`;
    };
    renderLabel();
    const body = el("div", { class: "select-menu" });
    body.addEventListener("click", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = wrap.classList.contains("is-open");
      closePops();
      if (open) return;
      body.innerHTML = "";
      for (const o of options) {
        body.append(el("button", {
          class: `select-item ${String(o.value) === String(value) ? "is-active" : ""}`,
          type: "button",
          onclick: () => { value = o.value; renderLabel(); wrap.classList.remove("is-open"); onchange && onchange(o.value); },
        },
          el("span", {}, o.label),
          String(o.value) === String(value) ? el("span", { class: "select-check" }, (() => { const s = el("span"); s.innerHTML = icon("check", 13); return s; })()) : null,
        ));
      }
      wrap.classList.add("is-open");
    });
    wrap.append(btn, body);
    wrap.getValue = () => value;
    wrap.setValue = (v) => { value = v; renderLabel(); };
    return wrap;
  }

  function fieldRow(label, control, hint) {
    return el("div", { class: "field" },
      el("div", { class: "field-head" }, el("span", { class: "field-label" }, label), control),
      hint ? el("p", { class: "field-hint" }, hint) : null);
  }

  /** Win11 设置卡：带分隔线的分组卡片；rows 为 [iconName?, label, hint?, control] */
  function cardGroup(rows) {
    const card = el("div", { class: "card-group" });
    rows.forEach((r, i) => {
      const [ico, label, hint, control] = r;
      card.append(el("div", { class: "card-row" },
        ico ? el("span", { class: "card-row-ico" }, (() => { const s = el("span"); s.innerHTML = icon(ico, 17); return s; })()) : null,
        el("div", { class: "card-text" }, el("span", { class: "card-label" }, label), hint ? el("p", { class: "card-hint" }, hint) : null),
        control || null));
      if (i < rows.length - 1) card.append(el("div", { class: "card-sep" }));
    });
    return card;
  }

  // ---------------------------------------------------------------- 弹窗框架
  function openDialog(build, opts) {
    opts = opts || {};
    const sheet = el("div", { class: "dialog" });
    const overlay = el("div", { class: "dialog-overlay" }, sheet);
    let closed = false;
    async function close(force) {
      if (closed) return;
      if (!force && opts.beforeClose) { const ok = await opts.beforeClose(); if (!ok) return; }
      closed = true;
      overlay.classList.add("is-out");
      setTimeout(() => overlay.remove(), 180);
    }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const esc = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    document.body.append(overlay);
    build(sheet, close);
    return { close };
  }

  function dialogHead(title, sub, close) {
    return el("div", { class: "dialog-head" },
      el("div", {},
        el("h2", { class: "dialog-title" }, title),
        sub ? el("p", { class: "dialog-sub" }, sub) : null),
      el("button", { class: "icon-btn", onclick: () => close() }, (() => { const s = el("span"); s.innerHTML = icon("x", 15); return s; })()));
  }

  // ---------------------------------------------------------------- 库视图
  let wallpapersCache = [];
  function renderLibrary() {
    viewEl.innerHTML = "";
    const all = wallpapersCache;
    const playing = SC.playingSet();
    const screens = SC.state.screens;

    const targetSel = selectEl(
      [{ value: -1, label: SC.t("common.allScreens") }].concat(screens.map((s) => ({ value: s.index, label: SC.t("common.screen", s.deviceName || s.index) }))),
      applyTarget,
      (v) => { applyTarget = Number(v); },
    );

    // Win11 命令栏：主命令（创建，带下拉）+ 应用到 + 搜索
    const createBtn = el("button", { class: "btn btn-accent cmdbar-primary" });
    createBtn.innerHTML = `${icon("plus", 15)}<span>${SC.t("common.create")}</span>${icon("chevron", 12)}`;
    const createPop = pop(createBtn, () => el("div", { class: "pop-menu" },
      el("button", { class: "pop-item", onclick: () => { closePops(); openWallpaperDialog(null); } },
        (() => { const s = el("span", { class: "pop-ico" }); s.innerHTML = icon("image", 15); return s; })(), SC.t("create.wallpaper")),
      el("button", { class: "pop-item", onclick: () => { closePops(); openWallpaperDialog({ playlist: true }); } },
        (() => { const s = el("span", { class: "pop-ico" }); s.innerHTML = icon("listplus", 15); return s; })(), SC.t("create.playlist")),
    ), "left");

    // 单行头部：标题 + 计数居左，命令右对齐（替代原先松散的两行结构）
    viewEl.append(el("header", { class: "page-head head-row" },
      el("h1", { class: "page-title" }, SC.t("lib.title")),
      el("span", { class: "title-count" }, SC.t("lib.count", all.length)),
      el("div", { class: "page-actions" },
        el("div", { class: "cmdbar-field" }, el("span", { class: "dim-label" }, SC.t("lib.target")), targetSel),
        createPop)));

    const grid = el("div", { class: "wall-grid", id: "wall-grid" });
    viewEl.append(grid);

    function filtered() {
      const q = searchQuery.trim().toLowerCase();
      return q ? all.filter((w) => ((w.meta && w.meta.title) || "").toLowerCase().includes(q) || (w.fileName || "").toLowerCase().includes(q)) : all;
    }
    function renderGridOnly() {
      grid.innerHTML = "";
      const items = filtered();
      if (!items.length) {
        grid.append(el("div", { class: "empty" },
          el("div", { class: "empty-ico" }, (() => { const s = el("span"); s.innerHTML = icon("image", 34); return s; })()),
          el("h3", {}, SC.t("lib.empty")),
          el("p", {}, SC.t("lib.emptyHint")),
          el("div", { class: "empty-actions" },
            el("button", { class: "btn btn-accent", onclick: () => openWallpaperDialog(null) }, SC.t("create.wallpaper")),
            el("button", { class: "btn", onclick: () => go("settings", "wallpaper") }, SC.t("cfg.dirs")))));
        return;
      }
      for (const w of items) grid.append(cardOf(w, playing));
    }
    refreshGrid = renderGridOnly;

    function cardOf(w, playingSet) {
      const isPlaying = playingSet.has(w.filePath);
      const card = el("article", { class: `wall-card ${isPlaying ? "is-playing" : ""}`, dataset: { path: w.filePath || "" } });
      const cover = el("div", { class: "wall-cover" });
      if (w.coverUrl || w.fileUrl) {
        const img = el("img", { src: bust(w.coverUrl || w.fileUrl), loading: "lazy", alt: "" });
        img.addEventListener("error", () => { img.remove(); cover.classList.add("is-fallback"); });
        cover.append(img);
      } else cover.classList.add("is-fallback");

      const playDot = el("span", { class: "wall-live" }, (() => { const s = el("span"); s.innerHTML = icon("play", 10); return s; })(), SC.t("lib.playingBadge"));
      const typeBadge = el("span", { class: `wall-type t${w.meta && w.meta.type}` }, SC.typeName(w.meta && w.meta.type));

      // 悬停操作条（右上）
      const acts = el("div", { class: "wall-acts" },
        actBtn("gear", SC.t("common.apply") + " · " + SC.t("nav.settings"), () => openSettingDialog(w)),
        actBtn("pencil", SC.t("common.edit"), () => openWallpaperDialog(w)),
        actBtn("folder", SC.t("common.location"), () => SC.reveal(w)),
        actBtn("trash", SC.t("common.delete"), () => removeWallpaper(w)),
      );
      // 多屏：顶部逐屏应用按钮
      let screenChips = null;
      if (screens.length > 1) {
        screenChips = el("div", { class: "wall-screens" },
          el("button", { class: "chip", title: SC.t("common.allScreens"), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, []); } }, SC.t("common.allScreens")),
          screens.map((s) => el("button", {
            class: "chip",
            title: SC.t("common.screen", s.deviceName || s.index),
            onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, [s.index]); },
          }, String(s.index + 1))));
      }
      const title = el("div", { class: "wall-meta" },
        el("span", { class: "wall-name", title: w.meta && w.meta.title }, (w.meta && w.meta.title) || w.fileName || "—"),
        typeBadge);

      card.append(cover, playDot, screenChips || "", acts, title);
      card.addEventListener("click", () => {
        const target = applyTarget < 0 ? [] : [applyTarget];
        SC.applyWallpaper(w, target);
      });
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("common.apply"), ico: "play", act: () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]) },
          ...(screens.length > 1 ? [{ label: SC.t("common.screen", screens[0].deviceName || 1), ico: "monitor", act: () => SC.applyWallpaper(w, [screens[0].index]) }] : []),
          { label: SC.t("common.edit"), ico: "pencil", act: () => openWallpaperDialog(w) },
          { label: SC.t("common.location"), ico: "folder", act: () => SC.reveal(w) },
          { label: SC.t("common.delete"), ico: "trash", act: () => removeWallpaper(w), danger: true },
        ]);
      });
      return card;
    }

    function actBtn(ic, title, onclick) {
      const b = el("button", { class: "icon-btn", title, onclick: (e) => { e.stopPropagation(); onclick(); } });
      b.innerHTML = icon(ic, 15);
      return b;
    }

    renderGridOnly();

    // 空白处右键：创建入口
    grid.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".wall-card")) return;
      e.preventDefault();
      ctxMenu(e.clientX, e.clientY, [
        { label: SC.t("create.wallpaper"), ico: "image", act: () => openWallpaperDialog(null) },
        { label: SC.t("create.playlist"), ico: "listplus", act: () => openWallpaperDialog({ playlist: true }) },
      ]);
    });

    // 拖拽导入
    viewEl.addEventListener("dragover", (e) => e.preventDefault());
    viewEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) openWallpaperDialog(null, f);
    });
  }

  function removeWallpaper(w) {
    SC.confirm({
      title: SC.t("common.delete"),
      body: `「${(w.meta && w.meta.title) || w.fileName}」`,
      okText: SC.t("common.delete"),
      danger: true,
    }).then(async (ok) => {
      if (!ok) return;
      if (await SC.deleteWallpaper(w)) renderView();
    });
  }

  // 右键菜单（Win11 亚克力菜单）
  let ctx = null;
  function ctxMenu(x, y, items) {
    closeCtx();
    ctx = el("div", { class: "ctx" }, items.map((it) =>
      el("button", { class: `ctx-item ${it.danger ? "is-danger" : ""}`, onclick: () => { closeCtx(); it.act(); } },
        el("span", { class: "ctx-ico" }, (() => { const s = el("span"); s.innerHTML = icon(it.ico || "chevr", 14); return s; })()),
        el("span", {}, it.label))));
    document.body.append(ctx);
    const r = ctx.getBoundingClientRect();
    ctx.style.left = `${Math.min(x, window.innerWidth - r.width - 8)}px`;
    ctx.style.top = `${Math.min(y, window.innerHeight - r.height - 8)}px`;
    setTimeout(() => {
      window.addEventListener("click", closeCtx);
      window.addEventListener("blur", closeCtx);
      window.addEventListener("keydown", closeCtx);
    });
  }
  function closeCtx() {
    if (!ctx) return;
    ctx.remove(); ctx = null;
    window.removeEventListener("click", closeCtx);
    window.removeEventListener("blur", closeCtx);
    window.removeEventListener("keydown", closeCtx);
  }

  // ---------------------------------------------------------------- 创建 / 编辑对话框
  function openWallpaperDialog(existing, presetFile) {
    const isPlaylist = existing ? existing.meta.type === 6 : !!(existing && existing.playlist) || !!(existing && existing.playlistMode);
    const playlistMode = existing ? existing.meta && existing.meta.type === 6 : !!(existing && existing.playlist);
    const isEdit = !!existing;
    const mode = playlistMode || (existing && existing.meta && existing.meta.type === 6) ? "list" : "wall";

    let title = isEdit ? (existing.meta.title || "") : "";
    let file = presetFile || null;
    let fileUrl = isEdit && !playlistMode ? existing.fileUrl : "";
    let previewEl = null;
    let members = isEdit && playlistMode ? [...(existing.meta.wallpapers || [])] : [];
    let progress = -1;
    let type = 0;

    const dirty = () => {
      if (!isEdit) return !!(title || file || members.length);
      if (playlistMode) return JSON.stringify(members.map((m) => m.filePath)) !== JSON.stringify((existing.meta.wallpapers || []).map((m) => m.filePath)) || title !== (existing.meta.title || "");
      return title !== (existing.meta.title || "") || !!file;
    };

    const d = openDialog((sheet, close) => {
      sheet.append(
        dialogHead(
          isEdit ? (playlistMode ? SC.t("create.editList") : SC.t("create.editWallpaper")) : (playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")),
          playlistMode ? SC.t("create.members", members.length) : SC.t("create.fileHint"),
          close),
        body(),
        foot(),
      );
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });

    function body() {
      const box = el("div", { class: "dialog-body" });
      render(box);
      return box;
    }
    function foot() {
      const saveBtn = el("button", { class: "btn btn-accent" }, isEdit ? SC.t("common.save") : SC.t("common.create"));
      const bar = el("div", { class: "dialog-foot" });
      if (mode === "wall") bar.append(el("span", { class: "dim-label" }, file ? `${SC.t("create.imported")} · ${file.name || ""}` : ""));
      bar.append(saveBtn);
      saveBtn.addEventListener("click", submit);
      return bar;
    }

    function render(box) {
      box.innerHTML = "";
      // 标题
      const titleInput = el("input", { class: "input", type: "text", placeholder: SC.t("create.titlePh", playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")), value: title });
      titleInput.addEventListener("input", () => { title = titleInput.value; });
      box.append(el("div", { class: "field-col" }, el("label", { class: "field-label" }, SC.t("create.titleField")), titleInput));

      if (mode === "wall") {
        // 文件区
        const zone = el("div", { class: "drop" });
        function renderZone() {
          zone.innerHTML = "";
          if (previewEl || (fileUrl && !file)) {
            const media = previewEl || (isVideoName(fileUrl) ? el("video", { src: fileUrl, autoplay: true, loop: true, muted: true, playsinline: true }) : el("img", { src: fileUrl }));
            if (!previewEl) {
              media.addEventListener("loadeddata", () => { previewEl = media; });
              media.addEventListener("error", () => { zone.innerHTML = ""; zone.append(el("p", { class: "dim-label" }, "load failed")); });
            }
            previewEl = previewEl || media;
            zone.append(media, el("button", {
              class: "btn btn-sm drop-re",
              onclick: () => { file = null; previewEl = null; fileUrl = ""; picker.click(); },
            }, SC.t("create.reselect")));
          } else {
            zone.append(
              el("div", { class: "drop-ico" }, (() => { const s = el("span"); s.innerHTML = icon("image", 26); return s; })()),
              el("p", { class: "drop-text" }, SC.t("create.file")),
              el("p", { class: "dim-label" }, SC.t("create.fileHint")));
          }
          zone.classList.toggle("is-filled", !!(previewEl || fileUrl));
          if (progress >= 0 && progress < 100) {
            zone.append(el("div", { class: "progress" }, el("div", { class: "progress-bar", style: { width: `${progress}%` } })));
          }
        }
        renderZone();
        const picker = el("input", { type: "file", accept: "image/*,video/*", hidden: true });
        picker.addEventListener("change", () => {
          const f = picker.files[0];
          if (!f) return;
          if (f.size > 500 * 1024 * 1024) { SC.toast(SC.t("create.fileHint"), "err"); return; }
          file = f; previewEl = null; fileUrl = "";
          const url = URL.createObjectURL(f);
          const media = isVideoName(f.name) ? el("video", { src: url, autoplay: true, loop: true, muted: true, playsinline: true }) : el("img", { src: url });
          media.addEventListener("loadeddata", () => { previewEl = media; renderZone(); });
          media.addEventListener("load", () => { previewEl = media; renderZone(); });
          previewEl = media;
          renderZone();
        });
        zone.addEventListener("click", () => picker.click());
        zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-over"); });
        zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
        zone.addEventListener("drop", (e) => {
          e.preventDefault(); zone.classList.remove("is-over");
          const f = e.dataTransfer.files[0];
          if (f) { picker.files = e.dataTransfer.files; picker.dispatchEvent(new Event("change")); }
        });
        box.append(zone, picker);
      } else {
        // 成员网格
        const grid = el("div", { class: "member-grid" });
        function renderMembers() {
          grid.innerHTML = "";
          if (!members.length) { grid.append(el("p", { class: "dim-label member-empty" }, SC.t("create.membersEmpty"))); return; }
          members.forEach((m, i) => {
            const cover = el("div", { class: "member-cover" }, m.coverUrl ? el("img", { src: m.coverUrl, loading: "lazy" }) : null);
            grid.append(el("div", { class: "member" },
              cover,
              el("div", { class: "member-name", title: m.meta && m.meta.title }, (m.meta && m.meta.title) || "—"),
              el("button", { class: "icon-btn member-x", title: SC.t("common.remove"), onclick: () => { members.splice(i, 1); renderMembers(); renderCount(); } },
                (() => { const s = el("span"); s.innerHTML = icon("x", 12); return s; })())));
          });
        }
        function renderCount() { headSub.textContent = SC.t("create.members", members.length); }
        const headSub = sheet.querySelector(".dialog-sub");
        const addBtn = el("button", { class: "btn" });
        addBtn.innerHTML = `${icon("listplus", 15)}<span>${SC.t("create.addMembers")}</span>`;
        addBtn.addEventListener("click", () => openMemberPicker(members, () => { renderMembers(); renderCount(); }));
        renderMembers();
        box.append(el("div", { class: "field-row" }, el("label", { class: "field-label" }, SC.t("create.members", members.length)), addBtn), grid);
      }
    }

    async function submit() {
      if (!title.trim()) { SC.toast(SC.t("create.titleEmpty"), "err"); return; }
      if (mode === "wall") {
        if (!isEdit && !file) { SC.toast(SC.t("create.noFile"), "err"); return; }
        if (file) {
          const updated = isEdit ? JSON.parse(JSON.stringify(existing)) : null;
          if (isEdit) {
            fileUrl = await SC.uploadFile(file, (p) => { progress = p; });
            const cover = SC.captureCover(previewEl);
            updated.fileUrl = fileUrl;
            updated.coverUrl = cover ? await SC.uploadCover(cover) : updated.coverUrl;
            updated.meta.title = title;
            if (await SC.updateWallpaper(updated)) { SC.toast(SC.t("create.updated"), "ok"); close(true); renderView(); }
            return;
          }
          const saveBtn = sheet.querySelector(".dialog-foot .btn-accent");
          saveBtn.classList.add("is-loading");
          saveBtn.textContent = SC.t("create.creating");
          const ok = await SC.createMediaWallpaper({ title: title.trim(), file, previewEl, onProgress: (p) => { progress = p; saveBtn.textContent = SC.t("create.importing", p); } });
          saveBtn.classList.remove("is-loading");
          if (ok) { SC.toast(SC.t("create.created"), "ok"); close(true); renderView(); }
          return;
        }
        // 仅改标题
        if (isEdit) {
          const updated = JSON.parse(JSON.stringify(existing));
          updated.meta.title = title;
          if (await SC.updateWallpaper(updated)) { SC.toast(SC.t("create.updated"), "ok"); close(true); renderView(); }
        }
        return;
      }
      // 播放列表
      if (!members.length) { SC.toast(SC.t("create.listEmpty"), "err"); return; }
      if (isEdit) {
        const updated = JSON.parse(JSON.stringify(existing));
        updated.meta.title = title;
        updated.meta.wallpapers = members;
        if (await SC.updateWallpaper(updated)) { SC.toast(SC.t("create.updated"), "ok"); close(true); renderView(); }
        return;
      }
      if (await SC.createPlaylist({ title: title.trim(), members })) { SC.toast(SC.t("create.created"), "ok"); close(true); renderView(); }
    }
  }

  function isVideoName(name) { return /\.(mp4|webm|mkv|flv|blv|avi|mov|m4v)$/i.test(name || ""); }

  function openMemberPicker(members, onChanged) {
    const picked = new Set(members.map((m) => m.filePath));
    openDialog((sheet, close) => {
      const grid = el("div", { class: "pick-grid" });
      const candidates = wallpapersCache.filter((w) => w.meta.type !== 6);
      const allBox = el("input", { type: "checkbox" });
      const head = el("div", { class: "field-row" },
        el("label", { class: "check" }, allBox, el("span", {}, SC.t("create.selectAll"))),
        el("span", { class: "dim-label" }, SC.t("create.pickHint")));
      function syncAll() { allBox.checked = candidates.length > 0 && candidates.every((c) => picked.has(c.filePath)); }
      allBox.addEventListener("change", () => {
        if (allBox.checked) candidates.forEach((c) => picked.add(c.filePath));
        else candidates.forEach((c) => picked.delete(c.filePath));
        renderGrid();
      });
      function renderGrid() {
        grid.innerHTML = "";
        for (const w of candidates) {
          const on = picked.has(w.filePath);
          grid.append(el("button", { class: `pick ${on ? "is-on" : ""}`, onclick: () => { on ? picked.delete(w.filePath) : picked.add(w.filePath); renderGrid(); syncAll(); } },
            el("div", { class: "pick-cover" }, w.coverUrl ? el("img", { src: w.coverUrl, loading: "lazy" }) : null, on ? el("span", { class: "pick-check" }, (() => { const s = el("span"); s.innerHTML = icon("check", 12); return s; })()) : null),
            el("span", { class: "pick-name" }, (w.meta && w.meta.title) || "—")));
        }
      }
      renderGrid(); syncAll();
      sheet.append(
        dialogHead(SC.t("create.pickTitle"), "", close),
        el("div", { class: "dialog-body" }, head, grid),
        el("div", { class: "dialog-foot" },
          el("span", { class: "dim-label" }, SC.t("create.members", picked.size)),
          el("button", {
            class: "btn btn-accent",
            onclick: () => {
              members.length = 0;
              for (const w of wallpapersCache) if (picked.has(w.filePath)) members.push(w);
              close(true); onChanged && onChanged();
            },
          }, SC.t("common.ok"))));
    });
  }

  // ---------------------------------------------------------------- 单壁纸设置
  function openSettingDialog(w) {
    const s0 = w.setting || SC.defaultSetting();
    const type = w.meta.type;
    const cur = { ...s0 };
    const dirty = () => JSON.stringify(cur) !== JSON.stringify(s0);
    openDialog((sheet, close) => {
      const box = el("div", { class: "dialog-body" });
      const saveBtn = el("button", { class: "btn btn-accent" }, SC.t("common.save"));

      function rebuild() {
        box.innerHTML = "";
        if (type !== 6) {
          const dur = el("input", { class: "input input-time", type: "time", value: cur.duration || "" });
          dur.addEventListener("change", () => { cur.duration = dur.value || null; });
          box.append(fieldRow(SC.t("set.duration"), dur, SC.t("set.durationHint")));
        }
        if (type === 6) {
          const pm = selectEl([{ value: 0, label: SC.t("set.order") }, { value: 1, label: SC.t("set.random") }], cur.playMode, (v) => { cur.playMode = Number(v); });
          box.append(fieldRow(SC.t("set.playMode"), pm));
        }
        if (type === 4 || type === 5) {
          box.append(fieldRow(SC.t("set.mouse"), switchEl(cur.enableMouseEvent, (v) => { cur.enableMouseEvent = v; }), SC.t("set.mouseHint")));
        }
        if (type === 3) {
          box.append(fieldRow(SC.t("set.player"),
            selectEl([{ value: 0, label: SC.t("set.engine0") }, { value: 1, label: SC.t("set.engine1") }, { value: 2, label: SC.t("set.engine2") }], cur.videoPlayer, (v) => { cur.videoPlayer = Number(v); })));
          box.append(fieldRow(SC.t("set.hwdec"), switchEl(cur.hardwareDecoding, (v) => { cur.hardwareDecoding = v; }), SC.t("set.hwdecHint")));
          box.append(fieldRow(SC.t("set.panscan"), switchEl(cur.isPanScan, (v) => { cur.isPanScan = v; }), SC.t("set.panscanHint")));
        }
        if (type === 1) {
          box.append(fieldRow(SC.t("set.fit"),
            selectEl([0, 1, 2, 3, 4, 5].map((i) => ({ value: i, label: SC.t(`set.fit${i}`) })), cur.fit, (v) => { cur.fit = Number(v); })));
          box.append(fieldRow(SC.t("set.keep"), switchEl(cur.keepWallpaper, (v) => { cur.keepWallpaper = v; }), SC.t("set.keepHint")));
        }
      }
      rebuild();
      saveBtn.addEventListener("click", async () => {
        saveBtn.classList.add("is-loading");
        const ok = await SC.saveWallpaperSetting(w, { ...cur });
        saveBtn.classList.remove("is-loading");
        if (ok) close(true);
      });
      sheet.append(
        dialogHead(SC.t("set.title"), SC.t("set.sub", (w.meta && w.meta.title) || ""), close),
        box,
        el("div", { class: "dialog-foot" }, saveBtn));
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  // ---------------------------------------------------------------- 本地库视图
  // 自包含实现：独立状态 / i18n（local.*）/ 样式（.loc-*），规划中替代壁纸库。
  // 数据源 SC.state.wallpapers（后端目录扫描），文件夹结构经 SC.listFolders 实时读盘。
  let localSort = localStorage.getItem("fluent.localSort") || "name";
  let localType = localStorage.getItem("fluent.localType") || "all";
  let localDir = localStorage.getItem("fluent.localDir") || ""; // 当前所在文件夹（"" = 根层级）
  let localLayout = {};      // 桌面画布布局表（跨渲染保持：落盘有防抖，重渲染若回读旧值会丢条目）
  let localLayoutDir = null; // localLayout 对应的文件夹；切换文件夹时才重新读盘
  let localSaveTimer = 0;    // 布局落盘防抖
  let localRefresh = null; // 本地库网格刷新函数（仅本视图存在，切视图置空）
  let localReflow = null;  // 桌面画布窗口 resize 重排（仅本视图存在，切视图置空）
  let localResizeHooked = false;
  let localSeq = 0;        // 异步渲染序号：快速切换文件夹时丢弃过期结果
  let localZoom = Math.min(2, Math.max(0.5, parseFloat(localStorage.getItem("fluent.localZoom")) || 1)); // 封面缩放（持久化；仅作用于封面尺寸，文字与画布布局不受影响）
  let localZoomKeys = null; // 本地库缩放快捷键入口（仅本视图存在，切视图置空）
  let zoomCtl = null;      // 右下角缩放控件（挂 body，仅本地库视图存在，切视图移除）
  let zoomValEl = null;    // 控件中间的百分比按钮（点击复位，setZoom 时同步文案）

  // 缩放快捷键：Ctrl+= / Ctrl+- 步进，Ctrl+0 复位（滚轮在 .loc-body 上单独监听）
  window.addEventListener("keydown", (e) => {
    if (!localZoomKeys || currentView !== "local" || !e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    if (t && t.closest && t.closest("input, textarea, select")) return;
    const step = e.key === "=" || e.key === "+" ? 0.1 : e.key === "-" ? -0.1 : e.key === "0" ? 0 : null;
    if (step === null) return;
    e.preventDefault(); // 拦截 WebView 自身的 Ctrl+± 页面缩放
    localZoomKeys(step);
  });

  function renderLocal() {
    viewEl.innerHTML = "";
    const all = SC.state.wallpapers;
    const playing = SC.playingSet();
    const screens = SC.state.screens;
    const roots = ((SC.state.cfg && SC.state.cfg.Wallpaper && SC.state.cfg.Wallpaper.directories) || []).filter(Boolean);
    const nameOf = (w) => (w.meta && w.meta.title) || w.fileName || "—";
    const dirName = (p) => (p || "").split(/[\\/]/).filter(Boolean).pop() || "";
    const normWin = (p) => String(p || "").toLowerCase().replace(/\//g, "\\").replace(/\\+$/, "");
    const samePath = (a, b) => !!String(a || "") && normWin(a) === normWin(b);
    const underDir = (p, base) => normWin(p).startsWith(`${normWin(base)}\\`);

    const targetSel = selectEl(
      [{ value: -1, label: SC.t("common.allScreens") }].concat(screens.map((s) => ({ value: s.index, label: SC.t("common.screen", s.deviceName || s.index) }))),
      applyTarget,
      (v) => { applyTarget = Number(v); },
    );
    const typeSel = selectEl(
      [{ value: "all", label: SC.t("local.filterAll") }].concat([1, 2, 3, 4, 5, 6].map((tp) => ({ value: String(tp), label: SC.typeName(tp) }))),
      localType,
      (v) => { localType = String(v); localStorage.setItem("fluent.localType", localType); if (localRefresh) localRefresh(); },
    );
    const sortSel = selectEl(
      [{ value: "name", label: SC.t("local.sortName") }, { value: "type", label: SC.t("local.sortType") }],
      localSort,
      (v) => { localSort = String(v); localStorage.setItem("fluent.localSort", localSort); if (localRefresh) localRefresh(); },
    );

    function openDirs() {
      if (!roots[0]) { SC.toast(SC.t("cfg.dirsHint"), "err"); return; }
      if (SC.demo) { SC.toast(`${SC.t("common.demo")} · ${SC.t("local.openDirs")}`, "ok"); return; }
      SC.client.api.explore(roots[0]);
    }

    const newFolderBtnEl = () => {
      const b = el("button", { class: "btn btn-sm" });
      b.innerHTML = `${icon("folderplus", 14)}<span>${SC.t("local.newFolder")}</span>`;
      b.addEventListener("click", () => openNewFolderDialog());
      return b;
    };
    // 新建文件夹仅在库内子文件夹层级可用（根层级由 设置 → 壁纸目录 管理）；搜索时隐藏
    const newFolderBtn = newFolderBtnEl();
    newFolderBtn.hidden = !localDir;

    viewEl.append(el("header", { class: "page-head head-row" },
      el("h1", { class: "page-title" }, SC.t("local.title")),
      el("span", { class: "title-count", dataset: { count: "" } }, SC.t("local.count", all.length)),
      el("div", { class: "page-actions" },
        el("div", { class: "cmdbar-field" }, el("span", { class: "dim-label" }, SC.t("local.target")), targetSel),
        el("div", { class: "cmdbar-field" }, el("span", { class: "dim-label" }, SC.t("local.filter")), typeSel),
        el("div", { class: "cmdbar-field" }, el("span", { class: "dim-label" }, SC.t("local.sort")), sortSel),
        newFolderBtn,
        el("button", { class: "icon-btn", title: SC.t("common.refresh"), onclick: () => SC.refreshAll() }, (() => { const s = el("span"); s.innerHTML = icon("refresh", 15); return s; })()),
        el("button", { class: "icon-btn", title: SC.t("local.openDirs"), onclick: openDirs }, (() => { const s = el("span"); s.innerHTML = icon("folder", 15); return s; })()))));

    const crumb = el("nav", { class: "loc-crumb", "aria-label": "folder" });
    const flowFolders = el("div", { class: "loc-folders" }); // 根层级 / 搜索态：流式文件夹卡
    const flowGrid = el("div", { class: "loc-grid" });       // 根层级 / 搜索态：流式网格
    const flowGroups = el("div", { class: "loc-groups" });   // 根层级：按文件夹分组平铺各文件夹内壁纸
    const canvas = el("div", { class: "loc-canvas" });       // 桌面画布：子文件夹层级自由摆放
    // 缩放以 --loc-zoom 变量下发，仅封面尺寸消费（网格列宽 / 文件夹缩略图高度），文字与画布槽位不受影响
    const locBody = el("div", { class: "loc-body" }, crumb, flowFolders, flowGrid, flowGroups, canvas);
    locBody.style.setProperty("--loc-zoom", localZoom);
    viewEl.append(locBody);

    // ===== 桌面画布：隐形槽位网格，位置记忆（Windows 桌面式） =====
    // 布局表存于该文件夹的 .metadata/layout.json（条目名 → 槽位），
    // 只记录用户显式拖动过的条目，新条目按流式顺序落第一个空位。
    // 槽位步距与 .loc-tile 联动：宽 = 磁贴 100z + 8z 间隙；高 = 磁贴内容高（缩略图 52z + 边距间隙 16z + 名称两行 30px）+ 16px 行距。
    // 磁贴高度贴合内容不放大余量，步距按两行名称的兜底高度算；布局表存 {c,r} 槽位索引，缩放只改步距、不改槽位占用关系
    let CELL_W = 108 * localZoom, CELL_H = 68 * localZoom + 46;
    const CANVAS_PAD = 10; // 画布四周固定留白：边缘磁贴的选中描边/槽位提示不贴边（不随缩放）
    let items = [];              // 画布条目：{kind:"folder",key,path} | {kind:"file",key,w}
    let positions = new Map();   // key → {c,r} 本次渲染的实际槽位
    let slotIndex = new Map();   // "c,r" → key（占用表）
    let cols = 1;                // 当前列数（随窗口宽度变化）
    const tiles = new Map();     // key → 磁贴元素（换位/重排就地移动）
    let selected = null;         // 单击选中的 {key, tile}

    function enterDir(dir) {
      localDir = dir || "";
      localStorage.setItem("fluent.localDir", localDir);
      renderView();
    }

    // 布局防抖落盘：快照在调度时取，避免实例切换后写脏数据
    function scheduleSave() {
      const dir = localLayoutDir;
      const snapshot = { ...localLayout };
      clearTimeout(localSaveTimer);
      localSaveTimer = setTimeout(() => SC.saveFolderLayout(dir, snapshot), 400);
    }
    function forgetKey(key) {
      if (localLayout[key]) { delete localLayout[key]; scheduleSave(); }
    }

    async function moveTo(w, dir) {
      if (!w || samePath(w.dir, dir)) return;
      const oldPath = w.filePath;
      const newPath = await SC.moveWallpaper(w, dir);
      if (!newPath) return;
      // 引用该文件的播放列表成员同步改路径（成员只是引用，不随文件移动）
      for (const pl of SC.state.wallpapers) {
        if (!(pl.meta && pl.meta.type === 6)) continue;
        if (!(pl.meta.wallpapers || []).some((m) => m.filePath === oldPath)) continue;
        const updated = JSON.parse(JSON.stringify(pl));
        for (const m of updated.meta.wallpapers) {
          if (m.filePath === oldPath) { m.filePath = newPath; m.dir = dir; }
        }
        await SC.updateWallpaper(updated);
      }
      SC.toast(SC.t("local.moved", dirName(dir)), "ok");
      await SC.refreshAll();
      if (localRefresh) localRefresh();
    }

    // 移动子文件夹到目标文件夹（桌面拖拽整理）；自身/自身子孙由后端再兜底校验
    async function moveFolderTo(item, dir) {
      if (!item || samePath(item.path, dir) || underDir(dir, item.path)) return;
      const newPath = await SC.moveFolder(item.path, dir);
      if (!newPath) return;
      forgetKey(item.key);
      SC.toast(SC.t("local.moved", dirName(dir)), "ok");
      await SC.refreshAll();
      if (localRefresh) localRefresh();
    }

    // 投放到文件夹磁贴 / 面包屑段：移出当前目录（先清位置记忆再移动）
    async function dropIntoFolder(item, dir) {
      forgetKey(item.key);
      if (item.kind === "folder") await moveFolderTo(item, dir);
      else await moveTo(item.w, dir);
    }

    // 投放到空槽位：换位置；目标已被占用则与对方交换（Windows 桌面行为）
    function dropOnSlot(item, c, r) {
      const pos = positions.get(item.key);
      if (!pos || (pos.c === c && pos.r === r)) return;
      const otherKey = slotIndex.get(`${c},${r}`);
      positions.set(item.key, { c, r });
      localLayout[item.key] = { c, r };
      slotIndex.delete(`${pos.c},${pos.r}`);
      slotIndex.set(`${c},${r}`, item.key);
      const tile = tiles.get(item.key);
      if (tile) place(tile, { c, r });
      if (otherKey && otherKey !== item.key) {
        positions.set(otherKey, pos);
        localLayout[otherKey] = { c: pos.c, r: pos.r };
        slotIndex.set(`${pos.c},${pos.r}`, otherKey);
        const otherTile = tiles.get(otherKey);
        if (otherTile) place(otherTile, pos);
      }
      scheduleSave();
    }

    // 自动整理：清空当前文件夹的位置记忆，恢复按排序流式排列（就地重排，避免回读竞态）
    function rearrange() {
      localLayout = {};
      scheduleSave();
      if (!canvas.hidden && items.length) reflow();
      else if (localRefresh) localRefresh();
    }

    // 删除文件夹（递归，界面先确认；正在播放的由后端先停止）
    function removeFolder(item, deep) {
      SC.confirm({
        title: SC.t("local.delFolder"),
        body: SC.t("local.delFolderBody", item.key) + (deep > 0 ? `\n${SC.t("local.delFolderCount", deep)}` : ""),
        okText: SC.t("common.delete"),
        danger: true,
      }).then(async (ok) => {
        if (!ok) return;
        if (!await SC.deleteFolder(item.path)) return;
        forgetKey(item.key);
        await SC.refreshAll();
        if (localRefresh) localRefresh();
      });
    }

    function crumbs() {
      const segs = [{ label: SC.t("local.title"), dir: "" }];
      if (localDir) {
        const hit = roots.find((r) => samePath(localDir, r) || underDir(localDir, r));
        if (hit) {
          segs.push({ label: dirName(hit) || hit, dir: hit });
          let acc = hit;
          for (const part of localDir.slice(hit.length).split(/[\\/]/).filter(Boolean)) {
            acc = `${acc}\\${part}`;
            segs.push({ label: part, dir: acc });
          }
        } else {
          segs.push({ label: dirName(localDir) || localDir, dir: localDir });
        }
      }
      crumb.innerHTML = "";
      segs.forEach((s, i) => {
        const cur = i === segs.length - 1;
        if (i) crumb.append(el("span", { class: "loc-crumb-sep" }, (() => { const s2 = el("span"); s2.innerHTML = icon("chevr", 12); return s2; })()));
        const b = el("button", { class: `loc-crumb-seg ${cur ? "is-current" : ""}`, dataset: { dir: s.dir || "" }, onclick: () => { if (!cur) enterDir(s.dir); } }, s.label);
        crumb.append(b);
      });
    }

    function filtered(list) {
      const q = searchQuery.trim().toLowerCase();
      return list.filter((w) => {
        if (localType !== "all" && String((w.meta && w.meta.type) || 0) !== localType) return false;
        if (!q) return true;
        return nameOf(w).toLowerCase().includes(q) || (w.fileName || "").toLowerCase().includes(q);
      });
    }
    function sorted(list) {
      const byName = (a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true, sensitivity: "base" });
      return localSort === "type"
        ? [...list].sort((a, b) => ((a.meta && a.meta.type) || 0) - ((b.meta && b.meta.type) || 0) || byName(a, b))
        : [...list].sort(byName);
    }

    function emptyNode(searching) {
      if (searching) {
        return el("div", { class: "empty" },
          el("div", { class: "empty-ico" }, (() => { const s = el("span"); s.innerHTML = icon("search", 34); return s; })()),
          el("h3", {}, SC.t("local.searchEmpty")));
      }
      if (localDir) {
        return el("div", { class: "empty" },
          el("div", { class: "empty-ico" }, (() => { const s = el("span"); s.innerHTML = icon("folder", 34); return s; })()),
          el("h3", {}, SC.t("local.folderEmpty")),
          el("p", {}, SC.t("local.folderEmptyHint")),
          el("div", { class: "empty-actions" }, newFolderBtnEl()));
      }
      return el("div", { class: "empty" },
        el("div", { class: "empty-ico" }, (() => { const s = el("span"); s.innerHTML = icon("folder", 34); return s; })()),
        el("h3", {}, SC.t("local.empty")),
        el("p", {}, SC.t("local.emptyHint")),
        el("div", { class: "empty-actions" },
          el("button", { class: "btn", onclick: () => go("settings", "wallpaper") }, SC.t("cfg.dirs")),
          el("button", { class: "btn btn-accent", onclick: () => go("hub") }, SC.t("hub.title"))));
    }

    async function renderGrid() {
      const seq = ++localSeq;
      const searching = !!searchQuery.trim();
      if (newFolderBtn) newFolderBtn.hidden = searching || !localDir;
      const folders = searching ? [] : await SC.listFolders(localDir);
      if (seq !== localSeq) return;
      const scope = searching ? all : all.filter((w) => samePath(w.dir, localDir));
      const files = sorted(filtered(scope));
      const countEl = viewEl.querySelector("[data-count]");
      if (countEl) countEl.textContent = SC.t("local.count", files.length + folders.length);
      crumbs();

      folders.sort((a, b) => dirName(a).localeCompare(dirName(b), undefined, { numeric: true, sensitivity: "base" }));
      selected = null;
      if (drag) cancelDrag(); // 重渲染会替换磁贴，进行中的拖拽直接作废，避免脱管磁贴吃掉本次操作

      // 根层级（库根目录列表）与搜索态沿用流式网格；子文件夹层级用桌面画布
      const flowMode = searching || !localDir;
      canvas.hidden = flowMode;
      flowGrid.hidden = flowMode;
      if (flowMode) {
        localReflow = null;
        flowFolders.innerHTML = "";
        flowFolders.hidden = !folders.length;
        for (const f of folders) flowFolders.append(folderCard(f));
        flowGrid.innerHTML = "";
        if (!files.length && !folders.length) flowGrid.append(emptyNode(searching));
        // 有文件夹时根层级网格必然为空，收起让位给分组平铺（避免 .loc-grid 的 min-height 留大空白）
        flowGrid.hidden = !files.length && !!folders.length;
        for (const w of files) flowGrid.append(cardOf(w));
        renderGroups(folders);
        return;
      }
      flowFolders.hidden = true;
      flowGrid.hidden = true;
      flowGroups.hidden = true;

      // 布局表仅在切换文件夹时读盘一次；之后以内存为准（防抖落盘 + 回读会竞态覆盖会话内修改）
      if (localLayoutDir !== localDir) {
        const table = await SC.getFolderLayout(localDir);
        if (seq !== localSeq) return;
        localLayout = table && typeof table === "object" ? table : {};
        localLayoutDir = localDir;
      }
      items = [
        ...folders.map((f) => ({ kind: "folder", key: dirName(f), path: f })),
        ...files.map((w) => ({ kind: "file", key: w.fileName || nameOf(w), w })),
      ];
      canvas.innerHTML = "";
      canvas.classList.remove("is-empty");
      tiles.clear();
      if (!items.length) {
        canvas.classList.add("is-empty");
        canvas.append(emptyNode(false));
        return;
      }
      computePositions();
      for (const it of items) {
        const tile = tileOf(it);
        canvas.append(tile);
        tiles.set(it.key, tile);
        place(tile, positions.get(it.key));
      }
      localReflow = reflow;
    }

    // 根层级：每个库根目录一组，平铺其下所有壁纸（含子文件夹，与卡片计数口径一致）
    function renderGroups(folders) {
      flowGroups.innerHTML = "";
      const show = !localDir && !searchQuery.trim() && folders.length > 0;
      flowGroups.hidden = !show;
      if (!show) return;
      for (const f of folders) {
        const kids = sorted(filtered(all.filter((w) => samePath(w.dir, f) || underDir(w.dir, f))));
        if (!kids.length) continue;
        const grid = el("div", { class: "loc-grid" });
        for (const w of kids) grid.append(cardOf(w));
        flowGroups.append(el("section", { class: "loc-group" },
          el("div", { class: "loc-group-head" },
            el("span", { class: "loc-group-name" }, dirName(f)),
            el("span", { class: "loc-group-count" }, SC.t("local.count", kids.length))),
          grid));
      }
      flowGroups.hidden = !flowGroups.firstChild;
    }
    localRefresh = renderGrid;

    // ---- 封面缩放：右下角放大镜控件，平时收起为小图标（悬停展开 − / 百分比 / +）；
    // Ctrl+滚轮 / Ctrl+= / Ctrl+- 步进，Ctrl+0 复位，范围 50%–200% ----
    if (zoomCtl) zoomCtl.remove(); // 重渲染防重复挂载
    zoomCtl = el("div", { class: "loc-zoom-ctl", title: SC.t("local.zoomHint") });
    const zoomToggle = el("div", { class: "loc-zoom-toggle" });
    zoomToggle.innerHTML = icon("zoomin", 15);
    const zoomLess = el("button", { class: "icon-btn", title: SC.t("local.zoomOut") });
    zoomLess.innerHTML = icon("zoomout", 15);
    zoomLess.addEventListener("click", () => setZoom(localZoom - 0.1));
    zoomValEl = el("button", { class: "loc-zoom-val", title: SC.t("local.zoomReset") }, `${Math.round(localZoom * 100)}%`);
    zoomValEl.addEventListener("click", () => setZoom(1));
    const zoomMore = el("button", { class: "icon-btn", title: SC.t("local.zoomIn") });
    zoomMore.innerHTML = icon("zoomin", 15);
    zoomMore.addEventListener("click", () => setZoom(localZoom + 0.1));
    zoomCtl.append(zoomToggle, zoomLess, zoomValEl, zoomMore);
    document.body.append(zoomCtl);
    function setZoom(v) {
      v = Math.min(2, Math.max(0.5, Math.round(v * 100) / 100));
      if (v === localZoom) return;
      localZoom = v;
      localStorage.setItem("fluent.localZoom", String(v));
      locBody.style.setProperty("--loc-zoom", v); // 封面尺寸随变量由 CSS 重排，文字字号不变
      CELL_W = 108 * v; CELL_H = 68 * v + 46; // 步距随缩放同步，列数变化需重排（槽位索引不变）
      if (localReflow) localReflow();
      if (zoomValEl) zoomValEl.textContent = `${Math.round(v * 100)}%`;
    }
    localZoomKeys = (d) => setZoom(d === 0 ? 1 : localZoom + d); // d=0 表示复位
    locBody.addEventListener("wheel", (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault(); // 阻止 WebView 自身的 Ctrl+滚轮页面缩放
      setZoom(localZoom + (e.deltaY < 0 ? 0.1 : -0.1));
    }, { passive: false });

    // ---- 桌面画布：槽位计算与就地摆放 ----
    function computePositions() {
      cols = Math.max(1, Math.floor(((canvas.clientWidth || viewEl.clientWidth || CELL_W) - CANVAS_PAD * 2) / CELL_W));
      positions = new Map();
      slotIndex = new Map();
      const firstFree = () => {
        for (let r = 0; ; r++) for (let c = 0; c < cols; c++) if (!slotIndex.has(`${c},${r}`)) return { c, r };
      };
      for (const it of items) {
        let p = localLayout[it.key];
        if (p) {
          p = { c: Math.min(Math.max(0, p.c | 0), cols - 1), r: Math.max(0, p.r | 0) };
          if (slotIndex.has(`${p.c},${p.r}`)) p = null; // 槽位被占（如换位后残留），退回流式找空位
        }
        if (!p) p = firstFree();
        positions.set(it.key, p);
        slotIndex.set(`${p.c},${p.r}`, it.key);
      }
      const rows = items.length ? Math.max(...[...positions.values()].map((p) => p.r)) + 1 : 1;
      // 画布至少撑满可视区剩余高度，否则拖到下方空白会落在 .view 上而无法换位；
      // 末尾再留 ~90px（≈播放条高度），滚到底时最后一行不被悬浮播放条遮住
      const fill = Math.max(0, viewEl.clientHeight - 150 - canvas.offsetTop); // 150 = .view 底部留白
      canvas.style.minHeight = `${Math.max(CANVAS_PAD * 2 + rows * CELL_H + 90, fill)}px`;
    }
    function place(tile, p) {
      if (!p) return;
      tile.style.left = `${p.c * CELL_W + CANVAS_PAD}px`;
      tile.style.top = `${p.r * CELL_H + CANVAS_PAD}px`;
    }
    function reflow() {
      if (!canvas.isConnected || canvas.hidden) return;
      computePositions();
      for (const [key, tile] of tiles) place(tile, positions.get(key));
    }
    if (!localResizeHooked) {
      localResizeHooked = true;
      window.addEventListener("resize", () => { if (localReflow) localReflow(); });
      // 侧栏折叠等容器宽度变化不触发 window resize，用 ResizeObserver 兜底
      if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => { if (localReflow) localReflow(); }).observe(viewEl);
    }

    function cardOf(w) {
      const isPlaying = playing.has(w.filePath);
      const card = el("article", { class: `loc-card ${isPlaying ? "is-playing" : ""}`, dataset: { path: w.filePath || "" } });
      const cover = el("div", { class: "loc-cover" });
      if (w.coverUrl || w.fileUrl) {
        const img = el("img", { src: bust(w.coverUrl || w.fileUrl), loading: "lazy", alt: "" });
        img.addEventListener("error", () => { img.remove(); cover.classList.add("is-fallback"); });
        cover.append(img);
      } else cover.classList.add("is-fallback");

      const playDot = el("span", { class: "loc-live" }, (() => { const s = el("span"); s.innerHTML = icon("play", 10); return s; })(), SC.t("common.playing"));
      const typeBadge = el("span", { class: "loc-type" }, SC.typeName(w.meta && w.meta.type));
      const acts = el("div", { class: "loc-acts" },
        actBtn("gear", SC.t("set.title"), () => openSettingDialog(w)),
        actBtn("folder", SC.t("common.location"), () => SC.reveal(w)),
        actBtn("trash", SC.t("common.delete"), () => removeWallpaper(w)));

      // 多屏：顶部逐屏应用
      let screenChips = null;
      if (screens.length > 1) {
        screenChips = el("div", { class: "loc-screens" },
          el("button", { class: "chip", title: SC.t("common.allScreens"), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, []); } }, SC.t("common.allScreens")),
          screens.map((s) => el("button", {
            class: "chip",
            title: SC.t("common.screen", s.deviceName || s.index),
            onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, [s.index]); },
          }, String(s.index + 1))));
      }
      const meta = el("div", { class: "loc-meta" },
        el("div", { class: "loc-text" },
          el("span", { class: "loc-name", title: nameOf(w) }, nameOf(w)),
          el("span", { class: "loc-file", title: w.fileName || "" }, w.fileName || "")),
        typeBadge);

      card.append(cover, playDot, screenChips || "", acts, meta);
      card.addEventListener("click", () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]));
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("common.apply"), ico: "play", act: () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]) },
          { label: SC.t("local.moveTo"), ico: "move", act: () => openMoveDialog(w) },
          { label: SC.t("set.title"), ico: "gear", act: () => openSettingDialog(w) },
          { label: SC.t("common.location"), ico: "folder", act: () => SC.reveal(w) },
          { label: SC.t("common.delete"), ico: "trash", act: () => removeWallpaper(w), danger: true },
        ]);
      });
      return card;
    }

    // ---- 桌面画布磁贴：单击选中、双击应用/进入、指针拖拽 ----
    function selectTile(item, tile) {
      if (selected && selected.tile) selected.tile.classList.remove("is-selected");
      selected = item && tile ? { key: item.key, tile } : null;
      if (selected) selected.tile.classList.add("is-selected");
    }
    // 点画布空白取消选中
    canvas.addEventListener("click", (e) => { if (e.target === canvas) selectTile(null, null); });

    let drag = null;          // {item, tile, x, y, moved, grabX, grabY, target}
    let ghost = null;         // 跟随光标的半透明磁贴
    let hint = null;          // 目标槽位虚线框
    let suppressClick = false; // 拖拽结束后的那次 click 不当作选中

    // 清理一次按压/拖拽的全部痕迹（pointercancel、pointerup 丢失、重渲染打断等场景自愈）
    function cancelDrag() {
      window.removeEventListener("pointermove", pressMove);
      window.removeEventListener("pointerup", pressUp);
      window.removeEventListener("pointercancel", pressCancel);
      if (ghost) { ghost.remove(); ghost = null; }
      if (hint) { hint.remove(); hint = null; }
      if (drag) drag.tile.classList.remove("is-dragging");
      drag = null;
      clearOver();
    }

    function pressStart(e, item, tile) {
      if (e.button !== 0) return;
      if (e.target.closest(".icon-btn, .chip")) return; // 悬浮操作钮不触发拖拽/选中
      if (drag) cancelDrag(); // 上次按压状态残留时先自愈，避免本次点击拖不动
      const rect = tile.getBoundingClientRect();
      drag = { item, tile, x: e.clientX, y: e.clientY, moved: false, grabX: e.clientX - rect.left, grabY: e.clientY - rect.top, target: null };
      try { tile.setPointerCapture(e.pointerId); } catch (_) { /* 指针已释放等场景忽略 */ }
      window.addEventListener("pointermove", pressMove);
      window.addEventListener("pointerup", pressUp);
      window.addEventListener("pointercancel", pressCancel);
    }
    function pressMove(e) {
      if (!drag) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5) return;
        drag.moved = true;
        ghost = drag.tile.cloneNode(true);
        ghost.classList.remove("is-selected");
        ghost.classList.add("loc-ghost");
        ghost.style.setProperty("--loc-zoom", localZoom); // 幻影挂到 body 脱离变量作用域，需自带倍率，尺寸才与原磁贴一致
        document.body.append(ghost);
        hint = el("div", { class: "loc-slot-hint" });
        hint.hidden = true;
        canvas.append(hint);
        drag.tile.classList.add("is-dragging");
      }
      e.preventDefault();
      ghost.style.left = `${e.clientX - drag.grabX}px`;
      ghost.style.top = `${e.clientY - drag.grabY}px`;
      updateDropTarget(e);
    }
    function pressUp() {
      const d = drag;
      cancelDrag();
      if (!d) return;
      if (!d.moved) return; // 原地松手：交给 click / dblclick
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      const t = d.target;
      if (!t) return;
      if (t.type === "folder") dropIntoFolder(d.item, t.dir);
      else if (t.type === "crumb") {
        if (d.item.kind === "folder") moveFolderTo(d.item, t.dir);
        else moveTo(d.item.w, t.dir);
      } else if (t.type === "slot") dropOnSlot(d.item, t.c, t.r);
    }
    function pressCancel() { cancelDrag(); }
    // 命中检测：面包屑段 → 文件夹磁贴 → 空槽位
    function updateDropTarget(e) {
      clearOver();
      hint.hidden = true;
      drag.target = null;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (!under) return;
      const seg = under.closest(".loc-crumb-seg");
      if (seg && !seg.classList.contains("is-current") && seg.dataset.dir) {
        seg.classList.add("is-over");
        drag.target = { type: "crumb", dir: seg.dataset.dir };
        return;
      }
      const folderTile = under.closest(".loc-tile.is-folder");
      if (folderTile && folderTile !== drag.tile) {
        const dir = folderTile.dataset.folder;
        if (!(drag.item.kind === "folder" && (samePath(dir, drag.item.path) || underDir(dir, drag.item.path)))) {
          folderTile.classList.add("is-over");
          drag.target = { type: "folder", dir };
          return;
        }
      }
      if (under.closest(".loc-canvas") === canvas) {
        const rect = canvas.getBoundingClientRect();
        const c = Math.min(cols - 1, Math.max(0, Math.floor((e.clientX - rect.left - CANVAS_PAD) / CELL_W)));
        const r = Math.max(0, Math.floor((e.clientY - rect.top - CANVAS_PAD) / CELL_H));
        hint.hidden = false;
        hint.style.left = `${c * CELL_W + CANVAS_PAD}px`;
        hint.style.top = `${r * CELL_H + CANVAS_PAD}px`;
        drag.target = { type: "slot", c, r };
      }
    }
    function clearOver() {
      viewEl.querySelectorAll(".loc-tile.is-over, .loc-crumb-seg.is-over").forEach((n) => n.classList.remove("is-over"));
    }

    function tileOf(it) {
      const tile = it.kind === "folder" ? tileFolder(it) : tileFile(it);
      tile.addEventListener("pointerdown", (e) => pressStart(e, it, tile));
      tile.addEventListener("click", () => {
        if (suppressClick) { suppressClick = false; return; }
        selectTile(it, tile);
      });
      return tile;
    }

    function tileFile(it) {
      const w = it.w;
      const isPlaying = playing.has(w.filePath);
      const tile = el("article", { class: `loc-tile is-file ${isPlaying ? "is-playing" : ""}`, dataset: { path: w.filePath || "" } });
      const thumb = el("span", { class: "loc-tile-thumb" });
      if (w.coverUrl || w.fileUrl) {
        const img = el("img", { src: bust(w.coverUrl || w.fileUrl), loading: "lazy", alt: "", draggable: "false" });
        img.addEventListener("error", () => { img.remove(); thumb.classList.add("is-fallback"); });
        thumb.append(img);
      } else thumb.classList.add("is-fallback");
      thumb.append(
        el("span", { class: "loc-tile-live" }, (() => { const s = el("span"); s.innerHTML = icon("play", 9); return s; })()),
        el("span", { class: "loc-tile-type" }, SC.typeName(w.meta && w.meta.type)),
        el("span", { class: "loc-acts" },
          actBtn("gear", SC.t("set.title"), () => openSettingDialog(w)),
          actBtn("trash", SC.t("common.delete"), () => removeWallpaper(w))));
      tile.append(thumb, el("span", { class: "loc-tile-name", title: nameOf(w) }, nameOf(w)));
      tile.addEventListener("dblclick", () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]));
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("common.apply"), ico: "play", act: () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]) },
          { label: SC.t("local.moveTo"), ico: "move", act: () => openMoveDialog(w) },
          { label: SC.t("set.title"), ico: "gear", act: () => openSettingDialog(w) },
          { label: SC.t("common.location"), ico: "folder", act: () => SC.reveal(w) },
          { label: SC.t("common.delete"), ico: "trash", act: () => removeWallpaper(w), danger: true },
        ]);
      });
      return tile;
    }

    // 文件夹缩略图集：递归取文件夹内前 max 张壁纸封面（含子文件夹），无则返回空数组
    function folderCovers(path, max) {
      return all
        .filter((w) => samePath(w.dir, path) || underDir(w.dir, path))
        .map((w) => w.coverUrl || w.fileUrl || "")
        .filter(Boolean)
        .slice(0, max);
    }

    // 在缩略图容器内铺多张封面拼贴（1 张全幅、2 张两列、3-4 张 2×2）；失败逐张移除，全失败露出文件夹图标
    function appendFolderCollage(box, path) {
      const covers = folderCovers(path, 4);
      if (!covers.length) return;
      const grid = el("span", { class: `loc-thumb-grid is-n${covers.length}` });
      for (const url of covers) {
        const img = el("img", { src: bust(url), loading: "lazy", alt: "" });
        img.addEventListener("error", () => {
          img.remove();
          if (!grid.firstChild) {
            grid.remove();
            if (!box.querySelector("img")) box.classList.add("is-empty");
          }
        });
        grid.append(img);
      }
      box.prepend(grid);
    }

    function tileFolder(it) {
      const deep = all.filter((w) => samePath(w.dir, it.path) || underDir(w.dir, it.path)).length;
      const tile = el("article", { class: "loc-tile is-folder", dataset: { folder: it.path } },
        el("span", { class: "loc-tile-thumb is-folder" },
          (() => { const s = el("span"); s.innerHTML = icon("folder", 40); return s; })(),
          el("span", { class: "loc-tile-count" }, String(deep))),
        el("span", { class: "loc-tile-name", title: it.path }, it.key));
      appendFolderCollage(tile.querySelector(".loc-tile-thumb"), it.path);
      tile.addEventListener("dblclick", () => enterDir(it.path));
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("local.open"), ico: "folder", act: () => enterDir(it.path) },
          { label: SC.t("common.location"), ico: "external", act: () => { if (SC.demo || !SC.client) SC.toast(`${SC.t("common.demo")} · ${SC.t("common.location")}`, "ok"); else SC.client.api.explore(it.path); } },
          { label: SC.t("common.delete"), ico: "trash", danger: true, act: () => removeFolder(it, deep) },
        ]);
      });
      return tile;
    }

    // 根层级的库根目录卡（流式区）：点击进入；缩略图取文件夹内壁纸封面
    function folderCard(path) {
      const deep = all.filter((w) => samePath(w.dir, path) || underDir(w.dir, path)).length;
      const folderIco = () => { const s = el("span"); s.innerHTML = icon("folder", 28); return s; };
      const thumb = el("span", { class: "loc-folder-thumb" });
      thumb.append(folderIco());
      appendFolderCollage(thumb, path);
      if (!thumb.querySelector("img")) thumb.classList.add("is-empty");
      const card = el("button", { class: "loc-folder" },
        thumb,
        el("span", { class: "loc-folder-name", title: path }, dirName(path)),
        el("span", { class: "loc-folder-count" }, SC.t("local.count", deep)));
      card.addEventListener("click", () => enterDir(path));
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("common.location"), ico: "folder", act: () => { if (SC.demo || !SC.client) SC.toast(`${SC.t("common.demo")} · ${SC.t("common.location")}`, "ok"); else SC.client.api.explore(path); } },
        ]);
      });
      return card;
    }

    function actBtn(ic, title, onclick) {
      const b = el("button", { class: "icon-btn", title, onclick: (e) => { e.stopPropagation(); onclick(); } });
      b.innerHTML = icon(ic, 15);
      return b;
    }

    function openNewFolderDialog() {
      if (!localDir) return;
      let name = "";
      openDialog((sheet, close) => {
        const input = el("input", { class: "input", type: "text", placeholder: SC.t("local.folderNamePh") });
        input.addEventListener("input", () => { name = input.value; });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); });
        function ok() {
          if (!name.trim()) return;
          close(true);
          SC.createFolder(localDir, name.trim()).then((p) => {
            if (!p) return;
            SC.toast(SC.t("local.folderCreated"), "ok");
            if (localRefresh) localRefresh();
          });
        }
        sheet.append(
          dialogHead(SC.t("local.newFolder"), dirName(localDir), close),
          el("div", { class: "dialog-body" }, el("div", { class: "field-col" }, el("label", { class: "field-label" }, SC.t("local.folderNamePh")), input)),
          el("div", { class: "dialog-foot" },
            el("button", { class: "btn", onclick: () => close() }, SC.t("common.cancel")),
            el("button", { class: "btn btn-accent", onclick: () => ok() }, SC.t("common.ok"))));
        setTimeout(() => input.focus(), 60);
      });
    }

    function openMoveDialog(w) {
      const root = roots.find((r) => samePath(w.dir, r) || underDir(w.dir, r));
      openDialog((sheet, close) => {
        const tree = el("div", { class: "loc-move-tree" });
        let picked = "";
        const okBtn = el("button", { class: "btn btn-accent", disabled: true });
        okBtn.textContent = SC.t("common.ok");
        okBtn.addEventListener("click", () => { if (!picked) return; close(true); moveTo(w, picked); });
        tree.append(el("p", { class: "dim-label" }, "…"));
        sheet.append(
          dialogHead(SC.t("local.moveTitle"), nameOf(w), close),
          el("div", { class: "dialog-body" }, tree),
          el("div", { class: "dialog-foot" },
            el("span", { class: "dim-label" }, `${SC.t("local.moveCurrent")}：${dirName(w.dir) || "—"}`),
            okBtn));
        // 展开该根下的整棵文件夹树（扫描深度 ≤ 3 层，与后端一致）；根目录本身也是可选目标
        (async () => {
          const list = root ? [{ path: root, depth: 0 }] : [];
          const walk = async (dir, depth) => {
            for (const kid of await SC.listFolders(dir)) {
              list.push({ path: kid, depth });
              if (depth < 3) await walk(kid, depth + 1);
            }
          };
          if (root) await walk(root, 1);
          tree.innerHTML = "";
          for (const { path, depth } of list) {
            const isCur = samePath(path, w.dir);
            const b = el("button", {
              class: `loc-move-item ${isCur ? "is-current" : ""}`,
              style: { paddingLeft: `${10 + depth * 18}px` },
            },
              (() => { const s = el("span"); s.innerHTML = icon("folder", 15); return s; })(),
              dirName(path),
              isCur ? el("span", { class: "dim-label" }, `· ${SC.t("local.moveCurrent")}`) : null);
            b.addEventListener("click", () => {
              if (isCur) return;
              picked = path;
              okBtn.disabled = false;
              tree.querySelectorAll(".loc-move-item").forEach((n) => n.classList.remove("is-active"));
              b.classList.add("is-active");
            });
            tree.append(b);
          }
          if (!list.length) tree.append(el("p", { class: "dim-label" }, SC.t("local.folderEmpty")));
        })();
      });
    }

    renderGrid();

    // 空白处右键：刷新 / 新建文件夹 / 自动整理 / 打开目录（流式区与画布共用）
    for (const zone of [flowGrid, canvas]) {
      zone.addEventListener("contextmenu", (e) => {
        if (e.target.closest(".loc-card, .loc-tile")) return;
        e.preventDefault();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("common.refresh"), ico: "refresh", act: () => SC.refreshAll() },
          ...(localDir && !searchQuery.trim() ? [
            { label: SC.t("local.newFolder"), ico: "folderplus", act: () => openNewFolderDialog() },
            { label: SC.t("local.rearrange"), ico: "move", act: rearrange },
          ] : []),
          { label: SC.t("local.openDirs"), ico: "folder", act: openDirs },
        ]);
      });
    }

    // 拖拽导入：复用创建对话框直接落库
    viewEl.addEventListener("dragover", (e) => e.preventDefault());
    viewEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) openWallpaperDialog(null, f);
    });
  }

  // ---------------------------------------------------------------- 下载视图
  function renderDownloads() {
    viewEl.innerHTML = "";
    const dls = SC.state.downloads;
    const his = SC.state.history;
    const active = dls.filter((d) => d.isDownloading && !d.IsCanceled);

    viewEl.append(pageHead(SC.t("dl.title"), SC.t("dl.sub"),
      his.length ? el("div", { class: "page-actions" },
        el("button", {
          class: "btn btn-sm",
          onclick: () => SC.confirm({ title: SC.t("dl.clear"), body: SC.t("dl.clearConfirm"), danger: true }).then(async (ok) => { if (ok && await SC.clearHistory()) renderView(); }),
        }, SC.t("dl.clear"))) : null));

    // 全空：单一空态，不再摆两组"0 + 暂无"的空架子
    if (!active.length && !his.length) {
      viewEl.append(el("div", { class: "empty page-empty" },
        el("div", { class: "empty-ico" }, (() => { const s = el("span"); s.innerHTML = icon("download", 34); return s; })()),
        el("h3", {}, SC.t("dl.activeEmpty")),
        el("p", {}, SC.t("dl.emptyHint")),
        el("div", { class: "empty-actions" },
          el("button", { class: "btn btn-accent", onclick: () => go("hub") },
            (() => { const s = el("span"); s.innerHTML = icon("globe", 14); return s; })(), SC.t("hub.title")))));
      return;
    }

    // 进行中
    viewEl.append(el("h3", { class: "sec-title" }, SC.t("dl.active"), el("span", { class: "sec-count" }, String(active.length))));
    const actBox = el("div", { class: "dl-list" });
    if (!active.length) actBox.append(el("p", { class: "dl-hint" }, SC.t("dl.activeEmpty")));
    for (const d of active) {
      const bar = el("div", { class: "progress" }, el("div", { class: "progress-bar", style: { width: `${Math.round(d.percent || 0)}%` } }));
      actBox.append(el("div", { class: "dl-item" },
        el("div", { class: "dl-ico" }, (() => { const s = el("span"); s.innerHTML = icon("download", 18); return s; })()),
        el("div", { class: "dl-main" },
          el("div", { class: "dl-row" },
            el("span", { class: "dl-name" }, d.desc || d.id),
            el("span", { class: "dl-pct" }, `${Math.round(d.percent || 0)}%`)),
          bar,
          el("div", { class: "dl-bytes" }, `${SC.fmtBytes(d.receivedBytes)} / ${SC.fmtBytes(d.totalBytes)}`)),
        el("button", { class: "btn btn-sm", onclick: () => SC.cancelDownload(d.id) }, SC.t("dl.cancel"))));
    }
    viewEl.append(actBox);

    // 历史
    viewEl.append(el("h3", { class: "sec-title" }, SC.t("dl.history"), el("span", { class: "sec-count" }, String(his.length))));
    const hisBox = el("div", { class: "his-list" });
    if (!his.length) hisBox.append(el("p", { class: "dl-hint" }, SC.t("dl.historyEmpty")));
    for (const h of his) {
      hisBox.append(el("div", { class: "his-item" },
        el("div", { class: "his-cover" }, h.coverUrl ? el("img", { src: h.coverUrl, loading: "lazy" }) : null),
        el("div", { class: "his-main" },
          el("span", { class: "his-name" }, h.title || h.id),
          el("span", { class: "his-sub" }, `${SC.fmtBytes(h.totalBytes)} · ${new Date(h.completedAt).toLocaleString()}`)),
        el("button", { class: "icon-btn", title: SC.t("common.location"), onclick: () => { if (!SC.demo && h.filePath) SC.client.api.explore(h.filePath); else SC.toast(`${SC.t("common.demo")}`, "ok"); } },
          (() => { const s = el("span"); s.innerHTML = icon("folder", 15); return s; })()),
        el("button", { class: "icon-btn", title: SC.t("common.delete"), onclick: async () => { await SC.removeHistory(h.id); renderView(); } },
          (() => { const s = el("span"); s.innerHTML = icon("trash", 15); return s; })())));
    }
    viewEl.append(hisBox);
  }

  // ---------------------------------------------------------------- 社区视图
  function renderHub() {
    viewEl.innerHTML = "";
    const url = SC.hubUrl(SC.state.hubTarget);
    // 社区站即完整界面，不再叠加标题行；仅右下角浮标保留浏览器打开入口
    const frame = el("iframe", { src: url, class: "hub-frame", allow: "clipboard-write" });
    viewEl.append(el("div", { class: "hub-wrap" },
      frame,
      el("button", { class: "hub-float icon-btn", title: SC.t("hub.browser"), onclick: () => SC.openUrl(url) },
        (() => { const s = el("span"); s.innerHTML = icon("external", 16); return s; })())));
  }

  // ---------------------------------------------------------------- 设置视图
  let settingsTab = "general";
  const SETTINGS_TAB_IDS = ["general", "wallpaper", "appearance"];
  function renderSettings() {
    viewEl.innerHTML = "";
    const tabs = [["general", SC.t("cfg.general")], ["wallpaper", SC.t("cfg.wallpaper")], ["appearance", SC.t("cfg.appearance")]];
    const tabbar = el("div", { class: "pivot" }, tabs.map(([id, label]) =>
      el("button", { class: `pivot-item ${settingsTab === id ? "is-active" : ""}`, onclick: () => { settingsTab = id; location.hash = `#/settings/${id}`; renderSettings(); } }, label)));
    viewEl.append(pageHead(SC.t("nav.settings"), SC.t("cfg.reloadHint")));
    viewEl.append(tabbar);
    const panel = el("div", { class: "cfg-panel" });
    viewEl.append(panel);
    if (settingsTab === "general") generalTab(panel);
    else if (settingsTab === "wallpaper") wallpaperTab(panel);
    else appearanceTab(panel);
  }

  function generalTab(panel) {
    const g = SC.state.cfg.General;
    const control = (fn) => (v) => { SC.saveConfig("General", fn(v)); };
    panel.append(cardGroup([
      ["power", SC.t("cfg.autoStart"), SC.t("cfg.autoStartHint"),
        switchEl(g.autoStart, control((v) => ({ autoStart: v })))],
      ["window", SC.t("cfg.hideWindow"), SC.t("cfg.hideWindowHint"),
        switchEl(g.hideWindow, control((v) => ({ hideWindow: v })))],
      ["shield", SC.t("cfg.headless"), SC.t("cfg.headlessHint"),
        (() => { const s = switchEl(g.autoStartHeadless, control((v) => ({ autoStartHeadless: v }))); if (!g.autoStart) s.classList.add("is-disabled"); return s; })()],
      ["locale", SC.t("cfg.language"), SC.t("cfg.langHint"),
        selectEl([
          { value: "zh", label: "中文" }, { value: "en", label: "English" },
          { value: "ru", label: "Русский" }, { value: "es", label: "Español" },
        ], g.currentLan, (v) => SC.setLang(v))],
      ["external", SC.t("cfg.contribute"), "",
        el("button", { class: "btn btn-sm", onclick: () => SC.openUrl("https://github.com/GiantappMan/livewallpaper/tree/v4.x/src/giantapp-wallpaper-ui/src/dictionaries") },
          (() => { const s = el("span"); s.innerHTML = icon("external", 14); return s; })())],
    ]));
  }

  function wallpaperTab(panel) {
    const c = SC.state.cfg.Wallpaper;
    // 目录列表
    const dirs = [...(c.directories && c.directories.length ? c.directories : [""])];
    const dirBox = el("div", { class: "dir-list" });
    async function persistDirs() {
      const vals = [...dirBox.querySelectorAll("input")].map((i) => i.value.trim());
      const seen = new Set();
      const uniq = vals.filter((v) => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
      c.directories = uniq;
      await SC.saveConfig("Wallpaper", { directories: uniq });
    }
    function renderDirs() {
      dirBox.innerHTML = "";
      dirs.forEach((d, i) => {
        const input = el("input", { class: "input", type: "text", placeholder: i === 0 ? SC.t("cfg.dirsHint") : "", value: d });
        input.addEventListener("change", persistDirs);
        const browse = el("button", {
          class: "btn btn-sm",
          onclick: async () => {
            if (SC.demo) { input.value = `D:\\Wallpapers\\demo-${dirs.length}`; persistDirs(); return; }
            const res = await SC.client.shell.showFolderDialog();
            if (res && res.data) { input.value = res.data; persistDirs(); }
          },
        }, SC.t("cfg.choose"));
        const del = el("button", { class: "icon-btn", title: SC.t("common.delete"), onclick: () => { dirs.splice(i, 1); if (!dirs.length) dirs.push(""); renderDirs(); persistDirs(); } },
          (() => { const s = el("span"); s.innerHTML = icon("x", 13); return s; })());
        dirBox.append(el("div", { class: "dir-row" }, input, browse, dirs.length > 1 || i > 0 ? del : el("span", { class: "icon-ghost" })));
      });
    }
    renderDirs();
    const addBtn = el("button", { class: "btn btn-sm", onclick: () => { dirs.push(""); renderDirs(); } },
      (() => { const s = el("span"); s.innerHTML = icon("plus", 14); return s; })(), SC.t("cfg.addDir"));

    panel.append(el("div", { class: "card-group" },
      el("div", { class: "card-row" },
        el("span", { class: "card-row-ico" }, (() => { const s = el("span"); s.innerHTML = icon("folder", 17); return s; })()),
        el("div", { class: "card-text" }, el("span", { class: "card-label" }, SC.t("cfg.dirs")), el("p", { class: "card-hint" }, SC.t("cfg.dirsHint")))),
      el("div", { class: "card-sep" }),
      dirBox,
      el("div", { class: "card-more" }, addBtn)));

    panel.append(cardGroup([
      ["monitor", SC.t("cfg.covered"), "",
        selectEl([
          { value: 0, label: SC.t("cfg.covered0") }, { value: 1, label: SC.t("cfg.covered1") }, { value: 2, label: SC.t("cfg.covered2") },
        ], c.coveredBehavior, (v) => { c.coveredBehavior = Number(v); SC.saveConfig("Wallpaper", { coveredBehavior: Number(v) }); })],
      ["play", SC.t("cfg.player"), "",
        selectEl([
          { value: 1, label: SC.t("set.engine1") }, { value: 2, label: SC.t("set.engine2") },
        ], c.defaultVideoPlayer, (v) => { c.defaultVideoPlayer = Number(v); SC.saveConfig("Wallpaper", { defaultVideoPlayer: Number(v) }); })],
    ]));
    panel.append(mpvBlock());
  }

  /** MPV 状态行（Win11 InfoBar：缺失 / 下载中才亮提示条，就绪时素净一行） */
  function mpvBlock() {
    const box = el("div", { class: "infobar", role: "status" });
    let downloading = false;
    async function render() {
      const st = await SC.mpvStatus();
      box.innerHTML = "";
      box.classList.remove("is-ok", "mpv-row");
      if (!st) return;
      if (!st.available && !downloading) {
        box.append(el("span", { class: "infobar-ico" }, (() => { const s = el("span"); s.innerHTML = icon("info", 16); return s; })()),
          el("span", { class: "infobar-msg" }, SC.t("cfg.mpvMissing")),
          el("button", { class: "btn btn-sm", onclick: () => { SC.mpvDownload(); downloading = true; render(); } }, SC.t("cfg.mpvDownload")));
      } else if (downloading) {
        const pct = el("span", { class: "infobar-msg" }, SC.t("cfg.mpvProgress", 0));
        box.append(el("span", { class: "infobar-ico" }, (() => { const s = el("span"); s.innerHTML = icon("download", 16); return s; })()), pct,
          el("button", { class: "btn btn-sm", onclick: async () => { await SC.mpvCancel(); downloading = false; render(); } }, SC.t("cfg.mpvCancel")));
        SC.onMpvEvent((e) => {
          if (e.state === "progress") pct.textContent = SC.t("cfg.mpvProgress", Math.round(e.percent || 0));
          else if (e.state === "done") { downloading = false; SC.toast(SC.t("cfg.mpvDone"), "ok"); render(); }
          else if (e.state === "error") { downloading = false; SC.toast(SC.t("cfg.mpvFail", e.message || ""), "err"); render(); }
        });
      } else {
        box.classList.add("mpv-row");
      }
      box.append(el("span", { style: { flex: 1 } }),
        el("button", { class: "btn btn-sm", onclick: () => SC.mpvFolder() }, SC.t("cfg.mpvFolder")));
    }
    render();
    return box;
  }

  async function appearanceTab(panel) {
    const a = SC.state.cfg.Appearance;
    // 模式（Win11 分段选择）
    const modeWrap = el("div", { class: "seg" });
    const modes = [["system", "cfg.modeSys", "monitor"], ["light", "cfg.modeLight", "sun"], ["dark", "cfg.modeDark", "moon"]];
    function renderModes() {
      modeWrap.innerHTML = "";
      const cur = a.mode || "system";
      for (const [val, key, ic] of modes) {
        const b = el("button", { class: `seg-item ${cur === val ? "is-active" : ""}`, onclick: async () => { await SC.setMode(val); a.mode = val; renderModes(); } });
        b.innerHTML = `${icon(ic, 14)}<span>${SC.t(key)}</span>`;
        modeWrap.append(b);
      }
    }
    renderModes();
    panel.append(cardGroup([
      [null, SC.t("cfg.mode"), "", modeWrap],
    ]));

    // 皮肤
    const skins = await SC.listSkins();
    const grid = el("div", { class: "skin-grid" });
    for (const s of skins) {
      const current = s.id === a.skin || (SC.demo && s.id === SC.meta.id);
      const card = el("button", {
        class: `skin-card ${current ? "is-current" : ""} ${s.valid === false ? "is-invalid" : ""}`,
        title: s.valid === false ? (s.invalidReason || s.description || "") : (s.description || ""),
        onclick: async () => {
          if (s.valid === false || current) return;
          if (await SC.applySkin(s.id)) { SC.toast(SC.t("cfg.skinApplied", s.name), "ok"); a.skin = s.id; }
        },
      },
        el("div", { class: "skin-preview", dataset: { skin: s.id } },
          el("span", { class: "skin-dot" }), el("span", { class: "skin-line" }), el("span", { class: "skin-block" })),
        el("div", { class: "skin-meta" },
          el("span", { class: "skin-name" }, s.name || s.id, current ? el("span", { class: "skin-cur" }, SC.t("cfg.skinCurrent")) : null),
          el("span", { class: "skin-desc" }, s.valid === false ? SC.t("cfg.skinInvalid") : `${s.type === "style" ? "CSS" : "App"} · v${s.version || "?"}`)));
      grid.append(card);
    }
    panel.append(el("div", { class: "card-group" },
      el("div", { class: "card-row" },
        el("span", { class: "card-row-ico" }, (() => { const s = el("span"); s.innerHTML = icon("brush", 17); return s; })()),
        el("div", { class: "card-text" }, el("span", { class: "card-label" }, SC.t("cfg.skins")), el("p", { class: "card-hint" }, SC.t("cfg.skinHint"))),
        el("button", { class: "btn btn-sm", onclick: () => SC.openSkinsFolder() }, SC.t("cfg.skinOpen"))),
      el("div", { class: "card-sep" }),
      grid,
      el("p", { class: "cfg-note" }, SC.t("cfg.about") + " · " + SC.meta.brand + " v" + SC.meta.version)));
  }

  // ---------------------------------------------------------------- 关于视图
  function renderAbout() {
    viewEl.innerHTML = "";
    const links = [
      ["zap", SC.t("about.review"), () => SC.openStoreReview()],
      ["star", SC.t("about.github"), () => SC.openUrl("https://github.com/GiantappMan/livewallpaper")],
      ["heart", SC.t("about.donate"), () => SC.openUrl("https://afdian.net/a/mscoder")],
      ["bug", SC.t("about.feedback"), () => SC.openUrl("https://support.qq.com/products/315103")],
    ];
    viewEl.append(pageHead(SC.t("about.title"), ""));
    viewEl.append(el("div", { class: "about-hero" },
      (() => { const s = el("span"); s.innerHTML = winLogo("win-logo-lg"); return s; })(),
      el("div", {},
        el("h2", { class: "about-name" }, SC.meta.brand),
        el("p", { class: "about-ver" }, `v${SC.meta.version} · ${SC.t("about.author", "巨应君")} · ${SC.t("about.skinBy")}`))));
    const card = el("div", { class: "card-group about-links" });
    links.forEach(([ic, label, act], i) => {
      card.append(el("button", { class: "card-row about-link", onclick: act },
        el("span", { class: "card-row-ico" }, (() => { const s = el("span"); s.innerHTML = icon(ic, 17); return s; })()),
        el("div", { class: "card-text" }, el("span", { class: "card-label" }, label)),
        el("span", { class: "about-arrow" }, (() => { const s = el("span"); s.innerHTML = icon("chevr", 14); return s; })())));
      if (i < links.length - 1) card.append(el("div", { class: "card-sep" }));
    });
    viewEl.append(card);
    viewEl.append(el("div", { class: "about-foot" },
      el("button", { class: "btn btn-sm", onclick: () => SC.openLogs() }, SC.t("about.logs")),
      el("button", {
        class: "btn btn-danger btn-sm",
        onclick: () => SC.confirm({ title: SC.t("about.exit"), body: SC.t("about.exitConfirm"), danger: true }).then((ok) => { if (ok) SC.exitApp(); }),
      }, SC.t("about.exit"))));
  }

  // ---------------------------------------------------------------- 播放 Dock
  let focusIdx = 0; // 聚焦的播放中壁纸（status.wallpapers 下标）
  let dragging = false;
  let dragPos = 0;
  let lastTime = { position: 0, duration: 0 };

  function renderDock() {
    const st = SC.state.status;
    const playing = st ? st.wallpapers : [];
    dockEl.innerHTML = "";
    if (!playing.length) {
      dockEl.append(el("div", { class: "dock dock-empty" },
        (() => { const s = el("span"); s.innerHTML = icon("moon", 15); return s; })(),
        el("span", {}, SC.t("dock.nothing")), el("span", { class: "dim-label" }, SC.t("dock.nothingHint"))));
      return;
    }
    if (focusIdx >= playing.length) focusIdx = 0;
    const w = playing[focusIdx];
    const paused = !!(w.runningInfo && w.runningInfo.isPaused);
    const pl = playing.length > 1;

    // 封面 + 标题
    const thumb = el("button", { class: "dock-thumb", title: pl ? SC.t("dock.focus") : "", onclick: () => { focusIdx = (focusIdx + 1) % playing.length; renderDock(); } },
      w.coverUrl ? el("img", { src: bust(w.coverUrl) }) : null);
    const meta = el("div", { class: "dock-meta" },
      el("span", { class: "dock-name" }, (w.meta && w.meta.title) || "—"),
      el("span", { class: "dock-sub" },
        `${SC.typeName(w.meta && w.meta.type)}${pl ? ` · ${focusIdx + 1}/${playing.length}` : ""} · ${paused ? SC.t("common.paused") : SC.t("common.playing")}`));

    // 控制
    const isList = w.meta && w.meta.type === 6;
    const ctrl = el("div", { class: "dock-ctrl" });
    if (isList) {
      ctrl.append(ctlBtn("prev", SC.t("dock.prev"), () => SC.prevIn(w)));
    }
    if (SC.canPause(w)) {
      ctrl.append(ctlBtn(paused ? "play" : "pause", paused ? SC.t("dock.resume") : SC.t("dock.pause"), () => {
        const idx = SC.screenIndexOf(w);
        paused ? SC.resume(idx) : SC.pause(idx);
      }));
    }
    ctrl.append(ctlBtn("stop", SC.t("dock.stop"), async () => {
      await SC.stop(SC.screenIndexOf(w));
      focusIdx = 0;
    }));
    if (isList) {
      ctrl.append(ctlBtn("next", SC.t("dock.next"), () => SC.nextIn(w)));
    }

    // 进度
    const showProgress = w.meta && (w.meta.type === 3 || w.meta.type === 6);
    const cur = dragging ? dragPos : lastTime.position;
    const dur = lastTime.duration || 0;
    const time = el("span", { class: "dock-time" }, showProgress ? `${SC.fmtTime(cur)} / ${SC.fmtTime(dur)}` : "");
    const seekEl = el("input", { class: "dock-seek", type: "range", min: 0, max: 1000, value: dur ? Math.round((cur / dur) * 1000) : 0 });
    seekEl.addEventListener("input", () => { dragging = true; dragPos = dur * (Number(seekEl.value) / 1000); renderDockTime(); });
    seekEl.addEventListener("change", () => {
      dragging = false;
      if (dur > 0) SC.seek(dur * (Number(seekEl.value) / 1000));
    });
    function renderDockTime() {
      time.textContent = `${SC.fmtTime(dragging ? dragPos : lastTime.position)} / ${SC.fmtTime(lastTime.duration || 0)}`;
      if (!dragging && lastTime.duration > 0) seekEl.value = String(Math.round((lastTime.position / lastTime.duration) * 1000));
    }
    SC.onTime((tp) => {
      if (tp) { lastTime = tp; renderDockTime(); }
      else { lastTime = { position: 0, duration: 0 }; renderDockTime(); }
    });

    // 音量 + 音源
    const volume = st.volume || 0;
    const volBtn = el("button", { class: "icon-btn", title: SC.t("dock.volume") });
    volBtn.innerHTML = icon(volume === 0 ? "volx" : volume <= 50 ? "volq" : "vol", 16);
    const volSlider = el("input", { class: "dock-vol", type: "range", min: 0, max: 100, value: volume });
    const volNum = el("span", { class: "dock-volnum" }, String(volume));
    const doSetVol = SC.debounce((v) => SC.setVolume(v, st.audioScreenIndex < 0 ? -1 : st.audioScreenIndex), 250);
    volSlider.addEventListener("input", () => { volNum.textContent = volSlider.value; doSetVol(Number(volSlider.value)); });
    const volPop = pop(volBtn, () => el("div", { class: "pop-menu pop-vol" }, volSlider, volNum), "center");

    // 音源选择
    const audioBtn = el("button", { class: "icon-btn", title: SC.t("dock.audio") });
    audioBtn.innerHTML = icon(st.audioScreenIndex < 0 ? "volx" : "music", 16);
    const audioPop = pop(audioBtn, () => el("div", { class: "pop-menu" },
      SC.state.screens.map((s) => el("button", {
        class: `pop-item ${st.audioScreenIndex === s.index ? "is-active" : ""}`,
        onclick: () => { closePops(); SC.setVolume(Math.max(volume, 30), s.index); },
      }, SC.t("common.screen", s.deviceName || s.index))),
      el("button", {
        class: `pop-item ${st.audioScreenIndex < 0 ? "is-active" : ""}`,
        onclick: () => { closePops(); SC.setVolume(0, -1); },
      }, SC.t("dock.mute"))), "center");

    const line = el("div", { class: "dock-line" });
    if (showProgress && dur > 0) line.style.width = `${Math.min(100, (cur / dur) * 100)}%`;
    else line.style.width = paused ? "0%" : "100%";
    line.classList.toggle("is-idle", !showProgress || !dur);

    dockEl.append(el("div", { class: "dock" }, line, thumb, meta, ctrl, time, seekEl, volPop, audioPop));
  }

  function ctlBtn(ic, title, onclick) {
    const b = el("button", { class: "icon-btn dock-btn", title, onclick });
    b.innerHTML = icon(ic, 16);
    return b;
  }

  // ---------------------------------------------------------------- 视图调度
  function renderView() {
    closeCtx();
    refreshGrid = null;
    localRefresh = null;
    localReflow = null;
    if (zoomCtl) { zoomCtl.remove(); zoomCtl = null; zoomValEl = null; } // 缩放控件仅本地库视图存在
    localZoomKeys = null;
    if (currentView === "library") renderLibrary();
    else if (currentView === "local") renderLocal();
    else if (currentView === "downloads") renderDownloads();
    else if (currentView === "hub") renderHub();
    else if (currentView === "settings") renderSettings();
    else if (currentView === "about") renderAbout();
    renderDock();
  }

  // 事件 → 视图刷新
  SC.on("wallpapers", () => { if (["library", "local"].includes(currentView)) renderView(); });
  SC.on("status", () => {
    const playing = SC.playingSet();
    if (currentView === "library") {
      viewEl.querySelectorAll(".wall-card").forEach((c) => c.classList.toggle("is-playing", playing.has(c.dataset.path)));
    }
    if (currentView === "local") {
      viewEl.querySelectorAll(".loc-card, .loc-tile[data-path]").forEach((c) => c.classList.toggle("is-playing", playing.has(c.dataset.path)));
    }
    renderDock();
  });
  SC.on("downloads", () => {
    if (dlBadge) {
      const n = SC.state.downloads.filter((d) => d.isDownloading && !d.IsCanceled).length;
      dlBadge.hidden = n === 0;
      dlBadge.textContent = n > 99 ? "99+" : String(n);
    }
    if (currentView === "downloads") renderView();
  });
  SC.on("history", () => { if (currentView === "downloads") renderView(); });
  SC.on("lang", () => { buildPane(); renderView(); });
  SC.on("mode", () => { renderDock(); });
  SC.on("nav", (p) => { if (p && p.view) go(p.view); });
  SC.on("hub-session", () => { if (currentView === "hub") renderHub(); });
  SC.on("skins", () => { if (currentView === "settings" && settingsTab === "appearance") renderSettings(); });
  // 配置变化（本页保存 / refresh-page 软刷新）→ 设置页原地重渲染
  SC.on("config", (group) => { if (group === "Wallpaper" && currentView === "settings") renderSettings(); });

  // ---------------------------------------------------------------- 启动
  // 标题栏居中搜索：全局唯一入口，输入即跳转壁纸库并过滤
  const titleSearchInput = el("input", {
    type: "search", placeholder: SC.t("lib.search"),
    oninput: (e) => {
      searchQuery = e.target.value;
      if (currentView === "local") { if (localRefresh) localRefresh(); }
      else if (currentView !== "library") go("library");
      else if (refreshGrid) refreshGrid();
    },
  });
  const titleSearch = el("label", { class: "title-search", title: SC.t("lib.search") },
    (() => { const s = el("span"); s.innerHTML = icon("search", 14); return s; })(), titleSearchInput);
  SC.on("lang", () => { titleSearchInput.placeholder = SC.t("lib.search"); });

  // 左侧窗格 + 内容区组成 flex 行：窗格按文字宽度自适应收缩
  const shell = el("div", { class: "shell" }, paneEl, viewEl);
  // 窗格折叠按钮：固定于标题栏左上角（拖拽带之上，no-drag 可点）
  const paneToggle = el("button", {
    class: "pane-toggle icon-btn", title: "切换导航窗格",
    onclick: () => {
      panePref = paneEl.classList.contains("is-compact") ? "0" : "1";
      localStorage.setItem(PANE_KEY, panePref);
      applyPaneCompact();
    },
  });
  paneToggle.innerHTML = icon("menu", 17);
  document.body.append(bgEl, dragStrip, shell, brandEl, dockEl, winCtrl, titleSearch, paneToggle);
  document.body.append(paneToggle);
  window.addEventListener("resize", applyPaneCompact);
  applyPaneCompact();
  // 标题栏键字形
  winCtrl.querySelectorAll(".win-btn").forEach((b) => { b.innerHTML = winGlyph(b.title); });
  buildPane();
  const { view: initial, sub: initialTab } = parseHash();
  if (NAV.some((n) => n.id === initial)) {
    currentView = initial;
    if (initial === "settings") settingsTab = SETTINGS_TAB_IDS.includes(initialTab) ? initialTab : "general";
  }
  SC.boot(() => {
    wallpapersCache = SC.state.wallpapers;
    SC.on("wallpapers", (list) => { wallpapersCache = list || SC.state.wallpapers; });
    renderView();
  });
})();
