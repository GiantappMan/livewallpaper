/**
 * 便当 Bento · app.js
 * Bento Grid 暖白画布风：顶部导航条 + 模块化卡片网格（正在播放自动变主格）。
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
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    play: '<polygon points="7 4 20 12 7 20 7 4"/>',
    pause: '<rect x="5.5" y="4.5" width="4.5" height="15" rx="1.2"/><rect x="14" y="4.5" width="4.5" height="15" rx="1.2"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    prev: '<polygon points="18 4 8 12 18 20 18 4"/><line x1="5" y1="5" x2="5" y2="19"/>',
    next: '<polygon points="6 4 16 12 6 20 6 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
    vol: '<polygon points="11 5 6 9 2.5 9 2.5 15 6 15 11 19 11 5"/><path d="M15 8.6a4.8 4.8 0 0 1 0 6.8"/><path d="M18 5.6a9 9 0 0 1 0 12.8"/>',
    volq: '<polygon points="11 5 6 9 2.5 9 2.5 15 6 15 11 19 11 5"/><path d="M15.5 8.5a4.8 4.8 0 0 1 0 7"/>',
    volx: '<polygon points="11 5 6 9 2.5 9 2.5 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    listplus: '<line x1="3" y1="6" x2="12" y2="6"/><line x1="3" y1="11" x2="10" y2="11"/><line x1="3" y1="16" x2="12" y2="16"/><line x1="17" y1="11" x2="22" y2="11"/><line x1="19.5" y1="8.5" x2="19.5" y2="13.5"/>',
    sliders: '<line x1="5" y1="21" x2="5" y2="14"/><line x1="5" y1="10" x2="5" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="19" y1="21" x2="19" y2="16"/><line x1="19" y1="12" x2="19" y2="3"/><line x1="2.5" y1="14" x2="7.5" y2="14"/><line x1="9.5" y1="8" x2="14.5" y2="8"/><line x1="16.5" y1="16" x2="21.5" y2="16"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="11.5"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
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
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    star: '<polygon points="12 2.5 15 9 22 9.8 17 14.6 18.2 21.5 12 18 5.8 21.5 7 14.6 2 9.8 9 9"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    bug: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M12 20v-14M2 12h20"/>',
  };
  function icon(name, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`;
  }

  // ---------------------------------------------------------------- 全局壳
  let currentView = "library";
  let searchQuery = "";
  let applyTarget = -1; // -1 = 全部屏幕
  const railEl = el("aside", { class: "rail" });
  const viewEl = el("main", { class: "view" });
  const dockEl = el("div", { class: "dock-wrap", id: "dock" });
  const bgEl = el("div", { class: "bento-bg", "aria-hidden": "true" },
    el("div", { class: "bb bb1" }), el("div", { class: "bb bb2" }),
    el("div", { class: "bb-grid" }));
  // 自绘标题栏：顶部拖拽区 + 右上窗口键（close = 隐藏到托盘）
  const dragStrip = el("div", { class: "drag-strip", "data-tauri-drag-region": true });
  dragStrip.addEventListener("dblclick", () => { if (SC.client) SC.client.win.toggleMaximize(); });
  const winCtrl = el("div", { class: "win-ctrl" },
    el("button", { class: "win-btn", title: "—", onclick: () => { if (SC.client) SC.client.win.minimize(); } }),
    el("button", { class: "win-btn", title: "□", onclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } }),
    el("button", { class: "win-btn is-close", title: "×", onclick: () => { if (SC.client) SC.client.win.close(); } }));

  const NAV = [
    { id: "library", icon: "image", label: "nav.library" },
    { id: "hub", icon: "globe", label: "nav.hub" },
    { id: "downloads", icon: "download", label: "nav.downloads", badge: true },
    { id: "settings", icon: "sliders", label: "nav.settings" },
    { id: "about", icon: "info", label: "nav.about" },
  ];

  let dlBadge = null;
  function buildRail() {
    railEl.innerHTML = "";
    railEl.append(
      el("div", { class: "rail-logo", title: SC.meta.brand },
        el("span", { class: "rail-logo-gem" }), el("span", { class: "rail-logo-name" }, SC.meta.brand.split(" ")[0])),
    );
    const nav = el("nav", { class: "rail-nav" });
    for (const item of NAV) {
      const btn = el("button", {
        class: "rail-item",
        dataset: { view: item.id },
        title: SC.t(item.label),
        onclick: () => go(item.id),
      });
      btn.innerHTML = icon(item.icon, 17);
      btn.append(el("span", { class: "rail-label" }, SC.t(item.label)));
      if (item.badge) {
        dlBadge = el("span", { class: "rail-badge", hidden: true });
        btn.append(dlBadge);
      }
      nav.append(btn);
    }
    railEl.append(nav);
    const modeBtn = el("button", { class: "rail-item rail-mode", title: SC.t("cfg.mode"), onclick: cycleMode });
    modeBtn.innerHTML = icon("moon", 18);
    railEl.append(el("div", { class: "rail-foot" }, modeBtn));
    if (SC.demo) railEl.append(el("div", { class: "demo-flag", title: SC.t("common.demoHint") }, SC.t("common.demo")));
    updateRail();
  }
  function updateRail() {
    railEl.querySelectorAll(".rail-item[data-view]").forEach((n) => n.classList.toggle("is-active", n.dataset.view === currentView));
  }
  function updateModeIcon() {
    const btn = railEl.querySelector(".rail-mode");
    if (!btn) return;
    const mode = document.documentElement.dataset.mode;
    const using = (SC.state.cfg && SC.state.cfg.Appearance.mode) || "system";
    btn.innerHTML = icon(using === "system" ? "monitor" : using === "light" ? "sun" : "moon", 18);
    btn.title = `${SC.t("cfg.mode")} · ${SC.t(using === "system" ? "cfg.modeSys" : using === "light" ? "cfg.modeLight" : "cfg.modeDark")}`;
    btn.dataset.mode = mode;
  }
  async function cycleMode() {
    const order = ["system", "light", "dark"];
    const cur = (SC.state.cfg && SC.state.cfg.Appearance.mode) || "system";
    await SC.setMode(order[(order.indexOf(cur) + 1) % order.length]);
  }

  function go(view) {
    currentView = view;
    location.hash = `#/${view}`;
    updateRail();
    renderView();
  }
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace(/^#\//, "") || "library";
    if (id !== currentView && NAV.some((n) => n.id === id)) { currentView = id; updateRail(); renderView(); }
  });

  // ---------------------------------------------------------------- 通用小部件
  function sectionHeader(title, sub, extra) {
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
      btn.innerHTML = `<span>${cur ? cur.label : ""}</span>${icon("chevron", 14)}`;
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
          String(o.value) === String(value) ? el("span", { class: "select-check", style: { opacity: 1 } }) : null,
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
      setTimeout(() => overlay.remove(), 220);
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
      el("button", { class: "icon-btn", onclick: () => close() }, (() => { const s = el("span"); s.innerHTML = icon("x", 16); return s; })()));
  }

  // ---------------------------------------------------------------- 库视图
  let wallpapersCache = [];
  function renderLibrary() {
    viewEl.innerHTML = "";
    const all = wallpapersCache;
    const q = searchQuery.trim().toLowerCase();
    const list = q ? all.filter((w) => (w.meta && w.meta.title || "").toLowerCase().includes(q) || (w.fileName || "").toLowerCase().includes(q)) : all;
    const playing = SC.playingSet();
    const screens = SC.state.screens;

    const targetSel = selectEl(
      [{ value: -1, label: SC.t("common.allScreens") }].concat(screens.map((s) => ({ value: s.index, label: SC.t("common.screen", s.deviceName || s.index) }))),
      applyTarget,
      (v) => { applyTarget = Number(v); },
    );

    const createBtn = el("button", { class: "btn btn-primary btn-create" });
    createBtn.innerHTML = `${icon("plus", 16)}<span>${SC.t("common.create")}</span>`;
    const createPop = pop(createBtn, () => el("div", { class: "pop-menu" },
      el("button", { class: "pop-item", onclick: () => { closePops(); openWallpaperDialog(null); } },
        (() => { const s = el("span", { class: "pop-ico" }); s.innerHTML = icon("image", 15); return s; })(), SC.t("create.wallpaper")),
      el("button", { class: "pop-item", onclick: () => { closePops(); openWallpaperDialog({ playlist: true }); } },
        (() => { const s = el("span", { class: "pop-ico" }); s.innerHTML = icon("listplus", 15); return s; })(), SC.t("create.playlist")),
    ), "right");

    viewEl.append(sectionHeader(SC.t("lib.title"), SC.t("lib.count", all.length),
      el("div", { class: "page-actions" },
        el("label", { class: "search" },
          (() => { const s = el("span"); s.innerHTML = icon("search", 15); return s; })(),
          el("input", { type: "search", placeholder: SC.t("lib.search"), value: searchQuery, oninput: (e) => { searchQuery = e.target.value; renderGrid(); } })),
        el("div", { class: "field-inline" }, el("span", { class: "dim-label" }, SC.t("lib.target")), targetSel),
        createPop)));

    const grid = el("div", { class: "wall-grid", id: "wall-grid" });
    viewEl.append(grid);
    if (SC.demo) {
      const drop = el("div", { class: "dropzone", hidden: true });
      viewEl.append(drop);
    }

    function renderGrid() {
      grid.innerHTML = "";
      const q2 = searchQuery.trim().toLowerCase();
      const items = q2 ? all.filter((w) => ((w.meta && w.meta.title) || "").toLowerCase().includes(q2) || (w.fileName || "").toLowerCase().includes(q2)) : all;
      if (!items.length) {
        grid.append(el("div", { class: "empty" },
          el("div", { class: "empty-gem" }),
          el("h3", {}, SC.t("lib.empty")),
          el("p", {}, SC.t("lib.emptyHint")),
          el("div", { class: "empty-actions", style: { marginTop: "18px", display: "flex", gap: "10px", justifyContent: "center" } },
            el("button", { class: "btn btn-primary", onclick: () => openWallpaperDialog(null) }, SC.t("create.wallpaper")),
            el("button", { class: "btn", onclick: () => go("settings") }, SC.t("cfg.dirs")))));
        return;
      }
      // Bento 主格：正在播放的壁纸（或第一张）占据 2x2 大格
      const hero = items.find((w) => playing.has(w.filePath)) || items[0];
      for (const w of items) grid.append(cardOf(w, playing, w === hero));
    }

    function cardOf(w, playingSet, isHero) {
      const isPlaying = playingSet.has(w.filePath);
      const card = el("article", { class: `wall-card ${isPlaying ? "is-playing" : ""} ${isHero ? "is-hero" : ""}`, dataset: { path: w.filePath || "" } });
      const cover = el("div", { class: "wall-cover" });
      if (w.coverUrl || w.fileUrl) {
        const coverSrc = w.coverUrl || w.fileUrl;
        const img = el("img", { src: bust(coverSrc), loading: "lazy", alt: "" });
        img.addEventListener("error", () => { img.remove(); cover.classList.add("is-fallback"); });
        cover.append(img);
      } else cover.classList.add("is-fallback");

      const typeBadge = el("span", { class: `wall-type t${w.meta && w.meta.type}` }, SC.typeName(w.meta && w.meta.type));
      const playDot = el("span", { class: "wall-live" }, (() => { const s = el("span"); s.innerHTML = icon("play", 10); return s; })(), SC.t("lib.playingBadge"));

      // 悬停操作条（底部）
      const acts = el("div", { class: "wall-acts" },
        actBtn("sliders", SC.t("common.apply") + " · " + SC.t("nav.settings"), () => openSettingDialog(w)),
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
        el("span", { class: "wall-sub" }, typeBadge));

      card.append(cover, playDot, screenChips || "", acts, title);
      card.addEventListener("click", () => {
        const target = applyTarget < 0 ? [] : [applyTarget];
        SC.applyWallpaper(w, target);
      });
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu(e.clientX, e.clientY, [
          { label: SC.t("common.apply"), act: () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]) },
          ...(screens.length > 1 ? [{ label: SC.t("common.screen", screens[0].deviceName || 1), act: () => SC.applyWallpaper(w, [screens[0].index]) }] : []),
          { label: SC.t("common.edit"), act: () => openWallpaperDialog(w) },
          { label: SC.t("common.location"), act: () => SC.reveal(w) },
          { label: SC.t("common.delete"), act: () => removeWallpaper(w), danger: true },
        ]);
      });
      return card;
    }

    function actBtn(ic, title, onclick) {
      const b = el("button", { class: "icon-btn glass", title, onclick: (e) => { e.stopPropagation(); onclick(); } });
      b.innerHTML = icon(ic, 15);
      return b;
    }

    renderGrid();

    // 空白处右键：创建入口
    grid.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".wall-card")) return;
      e.preventDefault();
      ctxMenu(e.clientX, e.clientY, [
        { label: SC.t("create.wallpaper"), act: () => openWallpaperDialog(null) },
        { label: SC.t("create.playlist"), act: () => openWallpaperDialog({ playlist: true }) },
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

  // 右键菜单
  let ctx = null;
  function ctxMenu(x, y, items) {
    closeCtx();
    ctx = el("div", { class: "ctx" }, items.map((it) =>
      el("button", { class: `ctx-item ${it.danger ? "is-danger" : ""}`, onclick: () => { closeCtx(); it.act(); } }, it.label)));
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
      const saveBtn = el("button", { class: "btn btn-primary" }, isEdit ? SC.t("common.save") : SC.t("common.create"));
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
              class: "btn btn-ghost btn-sm drop-re",
              onclick: () => { file = null; previewEl = null; fileUrl = ""; picker.click(); },
            }, SC.t("create.reselect")));
          } else {
            zone.append(
              el("div", { class: "drop-ico" }),
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
              el("button", { class: "icon-btn glass member-x", title: SC.t("common.remove"), onclick: () => { members.splice(i, 1); renderMembers(); renderCount(); } },
                (() => { const s = el("span"); s.innerHTML = icon("x", 12); return s; })())));
          });
        }
        function renderCount() { headSub.textContent = SC.t("create.members", members.length); }
        const headSub = sheet.querySelector(".dialog-sub");
        const addBtn = el("button", { class: "btn btn-ghost" });
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
          const saveBtn = sheet.querySelector(".dialog-foot .btn-primary");
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
            class: "btn btn-primary",
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
      const saveBtn = el("button", { class: "btn btn-primary" }, SC.t("common.save"));

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

    viewEl.append(sectionHeader(SC.t("dl.title"), SC.t("dl.sub"),
      el("div", { class: "page-actions" },
        his.length ? el("button", {
          class: "btn btn-ghost btn-sm",
          onclick: () => SC.confirm({ title: SC.t("dl.clear"), body: SC.t("dl.clearConfirm"), danger: true }).then(async (ok) => { if (ok && await SC.clearHistory()) renderView(); }),
        }, SC.t("dl.clear")) : null)));

    // 进行中
    const actBox = el("div", { class: "dl-list" });
    if (!active.length) actBox.append(el("div", { class: "empty empty-sm" }, el("p", {}, SC.t("dl.activeEmpty"))));
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
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => SC.cancelDownload(d.id) }, SC.t("dl.cancel"))));
    }

    // 历史
    const hisBox = el("div", { class: "his-list" });
    if (!his.length) hisBox.append(el("div", { class: "empty empty-sm" }, el("p", {}, SC.t("dl.historyEmpty"))));
    for (const h of his) {
      hisBox.append(el("div", { class: "his-item" },
        el("div", { class: "his-cover" }, h.coverUrl ? el("img", { src: h.coverUrl, loading: "lazy" }) : null),
        el("div", { class: "his-main" },
          el("span", { class: "his-name" }, h.title || h.id),
          el("span", { class: "his-sub" }, `${SC.fmtBytes(h.totalBytes)} · ${new Date(h.completedAt).toLocaleString()}`)),
        el("button", { class: "icon-btn glass", title: SC.t("common.location"), onclick: () => { if (!SC.demo && h.filePath) SC.client.api.explore(h.filePath); else SC.toast(`${SC.t("common.demo")}`, "ok"); } },
          (() => { const s = el("span"); s.innerHTML = icon("folder", 15); return s; })()),
        el("button", { class: "icon-btn glass", title: SC.t("common.delete"), onclick: async () => { await SC.removeHistory(h.id); renderView(); } },
          (() => { const s = el("span"); s.innerHTML = icon("trash", 15); return s; })())));
    }

    viewEl.append(
      el("h3", { class: "sec-title" }, SC.t("dl.active"), el("span", { class: "sec-count" }, String(active.length))),
      actBox,
      el("h3", { class: "sec-title" }, SC.t("dl.history"), el("span", { class: "sec-count" }, String(his.length))),
      hisBox);
  }

  // ---------------------------------------------------------------- 社区视图
  let hubBuilt = false;
  function renderHub() {
    viewEl.innerHTML = "";
    const url = SC.hubUrl(SC.state.hubTarget);
    const bar = el("div", { class: "hub-bar" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => SC.communityLogin() },
        (() => { const s = el("span"); s.innerHTML = icon("user", 15); return s; })(), SC.t("hub.login")),
      el("span", { class: "dim-label" }, SC.t("hub.loginHint")),
      el("span", { style: { flex: 1 } }),
      el("button", {
        class: "icon-btn glass", title: SC.t("hub.reload"),
        onclick: () => { const f = viewEl.querySelector("iframe"); if (f) f.src = f.src; },
      }, (() => { const s = el("span"); s.innerHTML = icon("refresh", 15); return s; })()),
      el("button", { class: "icon-btn glass", title: SC.t("hub.browser"), onclick: () => SC.openUrl(url) },
        (() => { const s = el("span"); s.innerHTML = icon("external", 15); return s; })()));
    const frame = el("iframe", { src: url, class: "hub-frame", allow: "clipboard-write" });
    viewEl.append(sectionHeader(SC.t("hub.title"), ""), bar, el("div", { class: "hub-wrap" }, frame));
    hubBuilt = true;
  }

  // ---------------------------------------------------------------- 设置视图
  let settingsTab = "general";
  function renderSettings() {
    viewEl.innerHTML = "";
    const tabs = [["general", SC.t("cfg.general")], ["wallpaper", SC.t("cfg.wallpaper")], ["appearance", SC.t("cfg.appearance")]];
    const tabbar = el("div", { class: "tabbar" }, tabs.map(([id, label]) =>
      el("button", { class: `tab ${settingsTab === id ? "is-active" : ""}`, onclick: () => { settingsTab = id; renderSettings(); } }, label)));
    viewEl.append(sectionHeader(SC.t("nav.settings"), SC.t("cfg.reloadHint")));
    viewEl.append(tabbar);
    const panel = el("div", { class: "cfg-panel" });
    viewEl.append(panel);
    if (settingsTab === "general") generalTab(panel);
    else if (settingsTab === "wallpaper") wallpaperTab(panel);
    else appearanceTab(panel);
  }

  function generalTab(panel) {
    const g = SC.state.cfg.General;
    const row = (label, hint, control) => el("div", { class: "cfg-row" },
      el("div", { class: "cfg-text" }, el("span", { class: "cfg-label" }, label), hint ? el("p", { class: "cfg-hint" }, hint) : null), control);
    panel.append(el("div", { class: "cfg-block" },
      row(SC.t("cfg.autoStart"), SC.t("cfg.autoStartHint"), switchEl(g.autoStart, (v) => { SC.saveConfig("General", { autoStart: v }); g.autoStart = v; })),
      row(SC.t("cfg.hideWindow"), SC.t("cfg.hideWindowHint"), switchEl(g.hideWindow, (v) => { SC.saveConfig("General", { hideWindow: v }); g.hideWindow = v; })),
      row(SC.t("cfg.headless"), SC.t("cfg.headlessHint"),
        (() => { const s = switchEl(g.autoStartHeadless, (v) => { SC.saveConfig("General", { autoStartHeadless: v }); g.autoStartHeadless = v; }); if (!g.autoStart) s.classList.add("is-disabled"); return s; })()),
      row(SC.t("cfg.language"), SC.t("cfg.langHint"),
        selectEl([
          { value: "zh", label: "中文" }, { value: "en", label: "English" },
          { value: "ru", label: "Русский" }, { value: "es", label: "Español" },
        ], g.currentLan, (v) => SC.setLang(v))),
      row(SC.t("cfg.contribute"), "",
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => SC.openUrl("https://github.com/GiantappMan/livewallpaper/tree/v4.x/src/giantapp-wallpaper-ui/src/dictionaries") },
          (() => { const s = el("span"); s.innerHTML = icon("external", 14); return s; })()))));
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
          class: "btn btn-ghost btn-sm",
          onclick: async () => {
            if (SC.demo) { input.value = `D:\\Wallpapers\\demo-${dirs.length}`; persistDirs(); return; }
            const res = await SC.client.shell.showFolderDialog();
            if (res && res.data) { input.value = res.data; persistDirs(); }
          },
        }, SC.t("cfg.choose"));
        const del = el("button", { class: "icon-btn glass", title: SC.t("common.delete"), onclick: () => { dirs.splice(i, 1); if (!dirs.length) dirs.push(""); renderDirs(); persistDirs(); } },
          (() => { const s = el("span"); s.innerHTML = icon("x", 13); return s; })());
        dirBox.append(el("div", { class: "dir-row" }, input, browse, dirs.length > 1 || i > 0 ? del : el("span", { class: "icon-ghost" })));
      });
    }
    renderDirs();
    const addBtn = el("button", { class: "btn btn-ghost btn-sm", onclick: () => { dirs.push(""); renderDirs(); } },
      (() => { const s = el("span"); s.innerHTML = icon("plus", 14); return s; })(), SC.t("cfg.addDir"));

    panel.append(
      el("div", { class: "cfg-block" },
        el("div", { class: "cfg-row" }, el("div", { class: "cfg-text" }, el("span", { class: "cfg-label" }, SC.t("cfg.dirs")))),
        dirBox,
        el("div", { class: "cfg-more" }, addBtn)),
      el("div", { class: "cfg-block" },
        fieldRow(SC.t("cfg.covered"), selectEl([
          { value: 0, label: SC.t("cfg.covered0") }, { value: 1, label: SC.t("cfg.covered1") }, { value: 2, label: SC.t("cfg.covered2") },
        ], c.coveredBehavior, (v) => { c.coveredBehavior = Number(v); SC.saveConfig("Wallpaper", { coveredBehavior: Number(v) }); })),
        el("div", { class: "cfg-gap" }),
        fieldRow(SC.t("cfg.player"), selectEl([
          { value: 1, label: SC.t("set.engine1") }, { value: 2, label: SC.t("set.engine2") },
        ], c.defaultVideoPlayer, (v) => { c.defaultVideoPlayer = Number(v); SC.saveConfig("Wallpaper", { defaultVideoPlayer: Number(v) }); }))),
      mpvBlock());
  }

  function mpvBlock() {
    const box = el("div", { class: "cfg-mpv" });
    let downloading = false;
    async function render() {
      const st = await SC.mpvStatus();
      box.innerHTML = "";
      if (!st) return;
      if (!st.available && !downloading) {
        box.append(el("span", { class: "mpv-hint" }, SC.t("cfg.mpvMissing")),
          el("button", { class: "btn btn-ghost btn-sm", onclick: () => { SC.mpvDownload(); downloading = true; render(); } }, SC.t("cfg.mpvDownload")));
      } else if (downloading) {
        const pct = el("span", { class: "mpv-hint" }, SC.t("cfg.mpvProgress", 0));
        box.append(pct,
          el("button", { class: "btn btn-ghost btn-sm", onclick: async () => { await SC.mpvCancel(); downloading = false; render(); } }, SC.t("cfg.mpvCancel")));
        SC.onMpvEvent((e) => {
          if (e.state === "progress") pct.textContent = SC.t("cfg.mpvProgress", Math.round(e.percent || 0));
          else if (e.state === "done") { downloading = false; SC.toast(SC.t("cfg.mpvDone"), "ok"); render(); }
          else if (e.state === "error") { downloading = false; SC.toast(SC.t("cfg.mpvFail", e.message || ""), "err"); render(); }
        });
      }
      box.append(el("button", { class: "btn btn-ghost btn-sm", onclick: () => SC.mpvFolder() }, SC.t("cfg.mpvFolder")));
    }
    render();
    return box;
  }

  async function appearanceTab(panel) {
    const a = SC.state.cfg.Appearance;
    // 模式
    const modeWrap = el("div", { class: "seg" });
    const modes = [["system", "cfg.modeSys", "monitor"], ["light", "cfg.modeLight", "sun"], ["dark", "cfg.modeDark", "moon"]];
    function renderModes() {
      modeWrap.innerHTML = "";
      const cur = a.mode || "system";
      for (const [val, key, ic] of modes) {
        const b = el("button", { class: `seg-item ${cur === val ? "is-active" : ""}`, onclick: async () => { await SC.setMode(val); a.mode = val; renderModes(); updateModeIcon(); } });
        b.innerHTML = `${icon(ic, 15)}<span>${SC.t(key)}</span>`;
        modeWrap.append(b);
      }
    }
    renderModes();
    panel.append(el("div", { class: "cfg-block" },
      el("div", { class: "cfg-row" }, el("div", { class: "cfg-text" }, el("span", { class: "cfg-label" }, SC.t("cfg.mode"))), modeWrap)));

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
    panel.append(el("div", { class: "cfg-block" },
      el("div", { class: "cfg-row" },
        el("div", { class: "cfg-text" }, el("span", { class: "cfg-label" }, SC.t("cfg.skins")), el("p", { class: "cfg-hint" }, SC.t("cfg.skinHint"))),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => SC.openSkinsFolder() }, SC.t("cfg.skinOpen"))),
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
    viewEl.append(sectionHeader(SC.t("about.title"), ""),
      el("div", { class: "about-hero" },
        el("div", { class: "about-gem" }),
        el("div", {},
          el("h2", { class: "about-name" }, SC.meta.brand),
          el("p", { class: "about-ver" }, `v${SC.meta.version} · ${SC.t("about.author", "巨应君")} · ${SC.t("about.skinBy")}`))),
      el("div", { class: "about-links" }, links.map(([ic, label, act]) =>
        el("button", { class: "about-link", onclick: act },
          (() => { const s = el("span", { class: "about-ico" }); s.innerHTML = icon(ic, 17); return s; })(),
          el("span", {}, label),
          (() => { const s = el("span", { class: "about-arrow" }); s.innerHTML = icon("chevron", 14); return s; })()))),
      el("div", { class: "about-foot" },
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => SC.openLogs() }, SC.t("about.logs")),
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
        (() => { const s = el("span"); s.innerHTML = icon("moon", 16); return s; })(),
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
    const volBtn = el("button", { class: "icon-btn glass", title: SC.t("dock.volume") });
    volBtn.innerHTML = icon(volume === 0 ? "volx" : volume <= 50 ? "volq" : "vol", 16);
    const volSlider = el("input", { class: "dock-vol", type: "range", min: 0, max: 100, value: volume });
    const volNum = el("span", { class: "dock-volnum" }, String(volume));
    const doSetVol = SC.debounce((v) => SC.setVolume(v, st.audioScreenIndex < 0 ? -1 : st.audioScreenIndex), 250);
    volSlider.addEventListener("input", () => { volNum.textContent = volSlider.value; doSetVol(Number(volSlider.value)); });
    const volPop = pop(volBtn, () => el("div", { class: "pop-menu pop-vol" }, volSlider, volNum), "center");

    // 音源选择
    const audioBtn = el("button", { class: "icon-btn glass", title: SC.t("dock.audio") });
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
    const b = el("button", { class: "icon-btn glass dock-btn", title, onclick });
    b.innerHTML = icon(ic, 17);
    return b;
  }

  // ---------------------------------------------------------------- 视图调度
  function renderView() {
    closeCtx();
    if (currentView === "library") renderLibrary();
    else if (currentView === "downloads") renderDownloads();
    else if (currentView === "hub") renderHub();
    else if (currentView === "settings") renderSettings();
    else if (currentView === "about") renderAbout();
    renderDock();
    updateModeIcon();
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
  SC.on("lang", () => { buildRail(); renderView(); });
  SC.on("mode", () => { updateModeIcon(); renderDock(); });
  SC.on("nav", (p) => { if (p && p.view) go(p.view); });
  SC.on("hub-session", () => { if (currentView === "hub") renderHub(); });
  SC.on("skins", () => { if (currentView === "settings" && settingsTab === "appearance") renderSettings(); });

  // ---------------------------------------------------------------- 启动
  document.body.append(bgEl, dragStrip, railEl, viewEl, dockEl, winCtrl);
  buildRail();
  const initial = location.hash.replace(/^#\//, "");
  if (NAV.some((n) => n.id === initial)) currentView = initial;
  SC.boot(() => {
    wallpapersCache = SC.state.wallpapers;
    SC.on("wallpapers", (list) => { wallpapersCache = list || SC.state.wallpapers; });
    renderView();
  });
})();
