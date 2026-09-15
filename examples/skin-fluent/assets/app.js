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
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
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
    { id: "hub", icon: "globe", label: "nav.hub" },
    // Win11 惯例：低频项（下载 / 设置 / 关于）沉到窗格底部 FooterMenuItems 区
    { id: "downloads", icon: "download", label: "nav.downloads", badge: true, foot: true },
    { id: "settings", icon: "gear", label: "nav.settings", foot: true },
    { id: "about", icon: "info", label: "nav.about", foot: true },
  ];

  let dlBadge = null;
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
  function buildPane() {
    paneEl.innerHTML = "";
    paneEl.append(el("div", { class: "pane-brand" },
      (() => { const s = el("span"); s.innerHTML = winLogo(); return s; })(),
      el("span", { class: "pane-brand-name" }, SC.meta.brand)));

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
  }
  function updatePane() {
    paneEl.querySelectorAll(".nav-item[data-view]").forEach((n) => n.classList.toggle("is-active", n.dataset.view === currentView));
  }

  function go(view) {
    currentView = view;
    location.hash = `#/${view}`;
    updatePane();
    renderView();
  }
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace(/^#\//, "") || "library";
    if (id !== currentView && NAV.some((n) => n.id === id)) { currentView = id; updatePane(); renderView(); }
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
            el("button", { class: "btn", onclick: () => go("settings") }, SC.t("cfg.dirs")))));
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
  function renderSettings() {
    viewEl.innerHTML = "";
    const tabs = [["general", SC.t("cfg.general")], ["wallpaper", SC.t("cfg.wallpaper")], ["appearance", SC.t("cfg.appearance")]];
    const tabbar = el("div", { class: "pivot" }, tabs.map(([id, label]) =>
      el("button", { class: `pivot-item ${settingsTab === id ? "is-active" : ""}`, onclick: () => { settingsTab = id; renderSettings(); } }, label)));
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
    if (currentView === "library") renderLibrary();
    else if (currentView === "downloads") renderDownloads();
    else if (currentView === "hub") renderHub();
    else if (currentView === "settings") renderSettings();
    else if (currentView === "about") renderAbout();
    renderDock();
  }

  // 事件 → 视图刷新
  SC.on("wallpapers", () => { if (["library"].includes(currentView)) renderView(); });
  SC.on("status", () => {
    if (currentView === "library") {
      const playing = SC.playingSet();
      viewEl.querySelectorAll(".wall-card").forEach((c) => c.classList.toggle("is-playing", playing.has(c.dataset.path)));
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

  // ---------------------------------------------------------------- 启动
  // 标题栏居中搜索：全局唯一入口，输入即跳转壁纸库并过滤
  const titleSearchInput = el("input", {
    type: "search", placeholder: SC.t("lib.search"),
    oninput: (e) => {
      searchQuery = e.target.value;
      if (currentView !== "library") go("library");
      else if (refreshGrid) refreshGrid();
    },
  });
  const titleSearch = el("label", { class: "title-search", title: SC.t("lib.search") },
    (() => { const s = el("span"); s.innerHTML = icon("search", 14); return s; })(), titleSearchInput);
  SC.on("lang", () => { titleSearchInput.placeholder = SC.t("lib.search"); });

  document.body.append(bgEl, dragStrip, paneEl, viewEl, dockEl, winCtrl, titleSearch);
  // 标题栏键字形
  winCtrl.querySelectorAll(".win-btn").forEach((b) => { b.innerHTML = winGlyph(b.title); });
  buildPane();
  const initial = location.hash.replace(/^#\//, "");
  if (NAV.some((n) => n.id === initial)) currentView = initial;
  SC.boot(() => {
    wallpapersCache = SC.state.wallpapers;
    SC.on("wallpapers", (list) => { wallpapersCache = list || SC.state.wallpapers; });
    renderView();
  });
})();
