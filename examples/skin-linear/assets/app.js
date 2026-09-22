/**
 * 曜石 Linear · app.js
 * 科技新贵 SaaS 风：左侧栏导航、发丝线边框卡片、靛紫渐变点缀、
 * 紧凑排版 + 快捷键提示（1-5 视图 / j,k 选择 / Enter 应用 / s,e,d,o 操作）。
 * 依赖 assets/core.js（window.SC）。
 */
(function () {
  "use strict";

  const SC = window.SC;
  const { el } = SC;

  function bust(url) {
    if (!url || url.startsWith("data:")) return url;
    return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  // ---------------------------------------------------------------- 图标
  const I = {
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.8"/><path d="M21 15l-4.5-4.5L5 21"/>',
    play: '<polygon points="7.5 4.5 19.5 12 7.5 19.5 7.5 4.5"/>',
    pause: '<rect x="6.2" y="4.5" width="4" height="15" rx="1"/><rect x="13.8" y="4.5" width="4" height="15" rx="1"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    prev: '<polygon points="18.5 4.5 8.5 12 18.5 19.5 18.5 4.5"/><line x1="5.5" y1="4.5" x2="5.5" y2="19.5"/>',
    next: '<polygon points="5.5 4.5 15.5 12 5.5 19.5 5.5 4.5"/><line x1="18.5" y1="4.5" x2="18.5" y2="19.5"/>',
    vol: '<polygon points="11 5 6.5 9 3.5 9 3.5 15 6.5 15 11 19 11 5"/><path d="M14.5 8.8a4.5 4.5 0 0 1 0 6.4"/><path d="M17.5 6a8.6 8.6 0 0 1 0 12"/>',
    volq: '<polygon points="11 5 6.5 9 3.5 9 3.5 15 6.5 15 11 19 11 5"/><path d="M15 9a4.5 4.5 0 0 1 0 6"/>',
    volx: '<polygon points="11 5 6.5 9 3.5 9 3.5 15 6.5 15 11 19 11 5"/><line x1="21.5" y1="9.5" x2="16.5" y2="14.5"/><line x1="16.5" y1="9.5" x2="21.5" y2="14.5"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    listplus: '<line x1="3" y1="6" x2="12" y2="6"/><line x1="3" y1="11.5" x2="10" y2="11.5"/><line x1="3" y1="17" x2="12" y2="17"/><line x1="16.5" y1="11.5" x2="21.5" y2="11.5"/><line x1="19" y1="9" x2="19" y2="14"/>',
    sliders: '<line x1="5" y1="21" x2="5" y2="14"/><line x1="5" y1="10" x2="5" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="19" y1="21" x2="19" y2="16"/><line x1="19" y1="12" x2="19" y2="3"/><line x1="2.5" y1="14" x2="7.5" y2="14"/><line x1="9.5" y1="8" x2="14.5" y2="8"/><line x1="16.5" y1="16" x2="21.5" y2="16"/>',
    info: '<circle cx="12" cy="12" r="8.8"/><line x1="12" y1="16" x2="12" y2="11.5"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    download: '<path d="M20.5 15v3.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V15"/><polyline points="7.5 10 12 14.5 16.5 10"/><line x1="12" y1="14.5" x2="12" y2="3.5"/>',
    globe: '<circle cx="12" cy="12" r="8.8"/><line x1="3.2" y1="12" x2="20.8" y2="12"/><path d="M12 3.2c2.4 2.5 3.9 5.6 3.9 8.8s-1.5 6.3-3.9 8.8c-2.4-2.5-3.9-5.6-3.9-8.8s1.5-6.3 3.9-8.8z"/>',
    x: '<line x1="17.5" y1="6.5" x2="6.5" y2="17.5"/><line x1="6.5" y1="6.5" x2="17.5" y2="17.5"/>',
    check: '<polyline points="19.5 6.5 9.5 16.5 4.5 11.5"/>',
    pencil: '<path d="M16.8 3.2a2.6 2.6 0 1 1 3.7 3.7L7.6 19.8 2.5 21.2l1.4-5.1Z"/>',
    trash: '<polyline points="3.5 6 5.5 6 20.5 6"/><path d="M18.5 6l-.9 13.2a1.6 1.6 0 0 1-1.6 1.5H8a1.6 1.6 0 0 1-1.6-1.5L5.5 6"/><path d="M10 10.5v6"/><path d="M14 10.5v6"/><path d="M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6"/>',
    folder: '<path d="M21.5 18.5a1.6 1.6 0 0 1-1.6 1.6H4.1a1.6 1.6 0 0 1-1.6-1.6V5.6A1.6 1.6 0 0 1 4.1 4h4.4l2 2.4h9.4a1.6 1.6 0 0 1 1.6 1.6z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.8"/><line x1="20.8" y1="20.8" x2="15.5" y2="15.5"/>',
    monitor: '<rect x="2.8" y="4" width="18.4" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="4.8"/><line x1="12" y1="19.2" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="4.8" y2="12"/><line x1="19.2" y1="12" x2="21.5" y2="12"/><line x1="5.1" y1="5.1" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="18.9" y2="18.9"/><line x1="5.1" y1="18.9" x2="6.8" y2="17.2"/><line x1="17.2" y1="6.8" x2="18.9" y2="5.1"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    external: '<path d="M18 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h5"/><polyline points="14.5 3.5 20.5 3.5 20.5 9.5"/><line x1="10" y1="14" x2="20.5" y2="3.5"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    refresh: '<polyline points="22.5 4 22.5 10 16.5 10"/><path d="M20.2 15.5A8.5 8.5 0 1 1 18.5 6l4 4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    chevron: '<polyline points="6 9.5 12 15 18 9.5"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    star: '<polygon points="12 2.5 15 9 22 9.8 17 14.6 18.2 21.5 12 18 5.8 21.5 7 14.6 2 9.8 9 9"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    bug: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M12 20v-14M2 12h20"/>',
  };
  function icon(name, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 15}" height="${size || 15}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`;
  }
  function ico(name, size) {
    const s = el("span", { style: { display: "inline-flex" } });
    s.innerHTML = icon(name, size);
    return s;
  }
  function kbd(key) { return el("kbd", { class: "ln-kbd" }, key); }

  // ---------------------------------------------------------------- 壳
  let currentView = "library";
  let searchQuery = "";
  let applyTarget = -1;
  let focusPath = null;
  const sidebar = el("aside", { class: "ln-side" });
  const viewEl = el("main", { class: "ln-view" });
  const barEl = el("div", { class: "ln-player" });

  const NAV = [
    { id: "library", icon: "image", key: "1", label: "nav.library" },
    { id: "hub", icon: "globe", key: "2", label: "nav.hub" },
    { id: "downloads", icon: "download", key: "3", label: "nav.downloads", badge: true },
    { id: "settings", icon: "sliders", key: "4", label: "nav.settings" },
    { id: "about", icon: "info", key: "5", label: "nav.about" },
  ];
  let dlBadge = null;

  function buildSidebar() {
    sidebar.innerHTML = "";
    sidebar.append(
      el("div", { class: "ln-brand", "data-tauri-drag-region": true },
        el("span", { class: "ln-logo" }, "◆"),
        el("span", { class: "ln-brand-name", ondblclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } }, SC.meta.brand)),
      el("nav", { class: "ln-nav" },
        NAV.map((n) => el("button", {
          class: `ln-nav-item ${currentView === n.id ? "is-active" : ""}`,
          dataset: { view: n.id },
          onclick: () => go(n.id),
        },
          el("span", { class: "ln-nav-ico" }, (() => { const s = el("span"); s.innerHTML = icon(n.icon, 15); return s; })()),
          el("span", { class: "ln-nav-label" }, SC.t(n.label)),
          n.badge ? (dlBadge = el("span", { class: "ln-badge", hidden: true })) : null,
          kbd(n.key)))),
      el("div", { class: "ln-side-foot" },
        el("button", { class: "ln-nav-item", id: "mode-btn", onclick: cycleMode }),
        SC.demo ? el("div", { class: "ln-demo", title: SC.t("common.demoHint") }, SC.t("common.demo")) : null,
        el("button", { class: "ln-win", title: "—", onclick: () => { if (SC.client) SC.client.win.minimize(); } }, "–"),
        el("button", { class: "ln-win", title: "□", onclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } }, "▫"),
        el("button", { class: "ln-win is-close", title: "×", onclick: () => { if (SC.client) SC.client.win.close(); } }, "×")));
    updateModeBtn();
  }
  function updateModeBtn() {
    const btn = sidebar.querySelector("#mode-btn");
    if (!btn) return;
    const using = (SC.state.cfg && SC.state.cfg.Appearance.mode) || "system";
    btn.innerHTML = icon(using === "system" ? "monitor" : using === "light" ? "sun" : "moon", 15);
    btn.title = `${SC.t("cfg.mode")} · ${SC.t(using === "system" ? "cfg.modeSys" : using === "light" ? "cfg.modeLight" : "cfg.modeDark")}`;
  }
  async function cycleMode() {
    const order = ["system", "light", "dark"];
    const cur = (SC.state.cfg && SC.state.cfg.Appearance.mode) || "system";
    await SC.setMode(order[(order.indexOf(cur) + 1) % order.length]);
    updateModeBtn();
  }
  function go(view) {
    currentView = view;
    location.hash = `#/${view}`;
    sidebar.querySelectorAll(".ln-nav-item[data-view]").forEach((n) => n.classList.toggle("is-active", n.dataset.view === view));
    renderView();
  }
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace(/^#\//, "") || "library";
    if (id !== currentView && NAV.some((n) => n.id === id)) go(id);
  });

  // ---------------------------------------------------------------- 小部件
  function viewHead(title, count, extra) {
    return el("header", { class: "ln-head" },
      el("div", { class: "ln-head-titles" },
        el("h1", { class: "ln-title" }, title),
        count ? el("span", { class: "ln-count" }, count) : null),
      el("div", { class: "ln-head-actions" }, extra || null));
  }

  function switchEl(checked, onchange) {
    const input = el("input", { type: "checkbox" });
    input.checked = !!checked;
    if (onchange) input.addEventListener("change", () => onchange(input.checked));
    return el("label", { class: "ln-switch" }, input, el("span", { class: "ln-switch-ui" }, el("i")));
  }

  function selectEl(options, value, onchange) {
    const wrap = el("div", { class: "ln-select" });
    const btn = el("button", { class: "ln-btn", type: "button" });
    const renderLabel = () => {
      const cur = options.find((o) => String(o.value) === String(value));
      btn.innerHTML = `<span>${cur ? cur.label : ""}</span>${icon("chevron", 12)}`;
    };
    renderLabel();
    const menu = el("div", { class: "ln-menu" });
    menu.addEventListener("click", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = wrap.classList.contains("is-open");
      closeAll();
      if (open) return;
      menu.innerHTML = "";
      for (const o of options) {
        menu.append(el("button", {
          class: `ln-menu-item ${String(o.value) === String(value) ? "is-active" : ""}`,
          type: "button",
          onclick: () => { value = o.value; renderLabel(); wrap.classList.remove("is-open"); onchange && onchange(o.value); },
        },
          el("span", {}, o.label),
          String(o.value) === String(value) ? (() => { const s = el("span", { class: "ln-menu-check" }); s.innerHTML = icon("check", 12); return s; })() : el("span", { class: "ln-menu-check" })));
      }
      wrap.classList.add("is-open");
    });
    wrap.append(btn, menu);
    return wrap;
  }
  function closeAll() { document.querySelectorAll(".ln-select.is-open").forEach((n) => n.classList.remove("is-open")); }
  window.addEventListener("click", closeAll);

  function fieldRow(label, control, hint) {
    return el("div", { class: "ln-field" },
      el("div", { class: "ln-field-head" }, el("span", { class: "ln-field-label" }, label), control),
      hint ? el("p", { class: "ln-field-hint" }, hint) : null);
  }

  // ---------------------------------------------------------------- 弹窗
  function openDialog(build, opts) {
    opts = opts || {};
    const panel = el("div", { class: "ln-dialog" });
    const overlay = el("div", { class: "ln-veil" }, panel);
    let closed = false;
    async function close(force) {
      if (closed) return;
      if (!force && opts.beforeClose) { const ok = await opts.beforeClose(); if (!ok) return; }
      closed = true;
      overlay.classList.add("is-out");
      setTimeout(() => overlay.remove(), 160);
    }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const esc = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    document.body.append(overlay);
    build(panel, close);
    const first = panel.querySelector("input");
    if (first) first.focus();
    return { close };
  }
  function dialogHead(title, sub, close) {
    return el("div", { class: "ln-dialog-head" },
      el("div", {},
        el("h2", { class: "ln-dialog-title" }, title),
        sub ? el("p", { class: "ln-dialog-sub" }, sub) : null),
      el("button", { class: "ln-icon-btn", onclick: () => close() },
        (() => { const s = el("span"); s.innerHTML = icon("x", 14); return s; })()));
  }

  // ---------------------------------------------------------------- 壁纸库
  let wallpapersCache = [];
  function renderLibrary() {
    viewEl.innerHTML = "";
    const all = wallpapersCache;
    const screens = SC.state.screens;
    const playing = SC.playingSet();

    const targetSel = selectEl(
      [{ value: -1, label: SC.t("common.allScreens") }].concat(screens.map((s) => ({ value: s.index, label: SC.t("common.screen", s.deviceName || s.index) }))),
      applyTarget, (v) => { applyTarget = Number(v); });

    const searchWrap = el("label", { class: "ln-search" },
      (() => { const s = el("span"); s.innerHTML = icon("search", 13); return s; })(),
      el("input", { type: "search", placeholder: SC.t("lib.search"), value: searchQuery }),
      kbd("/"));
    const searchInput = searchWrap.querySelector("input");
    searchInput.addEventListener("input", SC.debounce(() => { searchQuery = searchInput.value; renderGrid(); }, 120));

    const createBtn = el("button", { class: "ln-btn ln-btn-primary" }, ico("plus", 13), SC.t("common.create"));
    createBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      openMenuAt(r.right - 160, r.bottom + 6, [
        { label: SC.t("create.wallpaper"), act: () => openWallpaperDialog(null) },
        { label: SC.t("create.playlist"), act: () => openWallpaperDialog({ playlist: true }) },
      ]);
    });

    viewEl.append(viewHead(SC.t("lib.title"), SC.t("lib.count", all.length),
      el("div", { class: "ln-inline" }, targetSel, searchWrap, createBtn)));

    const grid = el("div", { class: "ln-grid" });
    viewEl.append(grid);

    function renderGrid() {
      grid.innerHTML = "";
      const q = searchQuery.trim().toLowerCase();
      const items = q ? all.filter((w) => ((w.meta && w.meta.title) || "").toLowerCase().includes(q) || (w.fileName || "").toLowerCase().includes(q)) : all;
      if (!items.length) {
        grid.append(el("div", { class: "ln-empty" },
          el("div", { class: "ln-empty-glow" }, (() => { const s = el("span"); s.innerHTML = icon("image", 26); return s; })()),
          el("h3", {}, SC.t("lib.empty")),
          el("p", {}, SC.t("lib.emptyHint")),
          el("div", { class: "ln-empty-actions" },
            el("button", { class: "ln-btn ln-btn-primary", onclick: () => openWallpaperDialog(null) }, SC.t("create.wallpaper")),
            el("button", { class: "ln-btn", onclick: () => go("settings") }, SC.t("cfg.dirs")))));
        return;
      }
      for (const w of items) grid.append(cardOf(w));
    }

    function cardOf(w) {
      const isPlaying = playing.has(w.filePath);
      const isSel = focusPath === w.filePath;
      const card = el("article", {
        class: `ln-card ${isPlaying ? "is-playing" : ""} ${isSel ? "is-sel" : ""}`,
        dataset: { path: w.filePath || "" }, tabindex: "0",
      });
      const cover = el("div", { class: "ln-card-cover" },
        (w.coverUrl || w.fileUrl) ? el("img", { src: bust(w.coverUrl || w.fileUrl), loading: "lazy", alt: "" }) : null,
        isPlaying ? el("span", { class: "ln-card-live" }, "● " + SC.t("lib.playingBadge")) : null,
        screens.length > 1 ? el("div", { class: "ln-card-screens" },
          el("button", { title: SC.t("common.allScreens"), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, []); } }, "ALL"),
          screens.map((s) => el("button", { title: SC.t("common.screen", s.deviceName || s.index), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, [s.index]); } }, `#${s.index + 1}`))) : null);
      const cap = el("div", { class: "ln-card-cap" },
        el("span", { class: "ln-card-name" }, (w.meta && w.meta.title) || "—"),
        el("span", { class: "ln-card-type" }, SC.typeName(w.meta && w.meta.type)),
        el("div", { class: "ln-card-acts" },
          actBtn("sliders", SC.t("nav.settings"), () => openSettingDialog(w)),
          actBtn("pencil", SC.t("common.edit"), () => openWallpaperDialog(w)),
          actBtn("folder", SC.t("common.location"), () => SC.reveal(w)),
          actBtn("trash", SC.t("common.delete"), () => removeWallpaper(w))));
      card.append(cover, cap);
      card.addEventListener("click", () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]));
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenuAt(e.clientX, e.clientY, [
          { label: SC.t("common.apply"), act: () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]) },
          { label: SC.t("common.edit"), act: () => openWallpaperDialog(w) },
          { label: SC.t("common.location"), act: () => SC.reveal(w) },
          { label: SC.t("common.delete"), act: () => removeWallpaper(w), danger: true },
        ]);
      });
      return card;
    }
    function actBtn(ic, title, act) {
      const b = el("button", { class: "ln-icon-btn", title, onclick: (e) => { e.stopPropagation(); act(); } });
      b.innerHTML = icon(ic, 13);
      return b;
    }
    renderGrid();

    grid.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".ln-card")) return;
      e.preventDefault();
      openMenuAt(e.clientX, e.clientY, [
        { label: SC.t("create.wallpaper"), act: () => openWallpaperDialog(null) },
        { label: SC.t("create.playlist"), act: () => openWallpaperDialog({ playlist: true }) },
      ]);
    });
    viewEl.addEventListener("dragover", (e) => e.preventDefault());
    viewEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) openWallpaperDialog(null, f);
    });
  }

  let menuEl = null;
  function openMenuAt(x, y, items) {
    closeMenu();
    menuEl = el("div", { class: "ln-context" }, items.map((it) =>
      el("button", { class: `ln-context-item ${it.danger ? "is-danger" : ""}`, onclick: () => { closeMenu(); it.act(); } }, it.label)));
    document.body.append(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = `${Math.max(8, Math.min(x, window.innerWidth - r.width - 10))}px`;
    menuEl.style.top = `${Math.max(8, Math.min(y, window.innerHeight - r.height - 10))}px`;
    setTimeout(() => {
      window.addEventListener("click", closeMenu);
      window.addEventListener("blur", closeMenu);
      window.addEventListener("keydown", closeMenu);
    });
  }
  function closeMenu() {
    if (!menuEl) return;
    menuEl.remove(); menuEl = null;
    window.removeEventListener("click", closeMenu);
    window.removeEventListener("blur", closeMenu);
    window.removeEventListener("keydown", closeMenu);
  }

  function removeWallpaper(w) {
    SC.confirm({ title: SC.t("common.delete"), body: `「${(w.meta && w.meta.title) || w.fileName}」`, okText: SC.t("common.delete"), danger: true })
      .then(async (ok) => { if (ok && await SC.deleteWallpaper(w)) renderView(); });
  }

  // ---------------------------------------------------------------- 创建 / 编辑
  function openWallpaperDialog(existing, presetFile) {
    const playlistMode = existing ? existing.meta && existing.meta.type === 6 : !!(existing && existing.playlist);
    const isEdit = !!existing;
    const mode = playlistMode ? "list" : "wall";
    let title = isEdit ? (existing.meta.title || "") : "";
    let file = presetFile || null;
    let fileUrl = isEdit && !playlistMode ? existing.fileUrl : "";
    let previewEl = null;
    let members = isEdit && playlistMode ? [...(existing.meta.wallpapers || [])] : [];
    let progress = -1;
    const dirty = () => {
      if (!isEdit) return !!(title || file || members.length);
      if (playlistMode) return JSON.stringify(members.map((m) => m.filePath)) !== JSON.stringify((existing.meta.wallpapers || []).map((m) => m.filePath)) || title !== (existing.meta.title || "");
      return title !== (existing.meta.title || "") || !!file;
    };

    openDialog((panel, close) => {
      const body = el("div", { class: "ln-dialog-body" });
      const okBtn = el("button", { class: "ln-btn ln-btn-primary" }, isEdit ? SC.t("common.save") : SC.t("common.create"));

      function render() {
        body.innerHTML = "";
        const titleInput = el("input", { class: "ln-input", type: "text", placeholder: SC.t("create.titlePh", playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")), value: title });
        titleInput.addEventListener("input", () => { title = titleInput.value; });
        body.append(fieldRow(SC.t("create.titleField"), titleInput));

        if (mode === "wall") {
          const zone = el("div", { class: "ln-drop" });
          function renderZone() {
            zone.innerHTML = "";
            if (previewEl || (fileUrl && !file)) {
              const media = previewEl || (isVideoName(fileUrl) ? el("video", { src: fileUrl, autoplay: true, loop: true, muted: true, playsinline: true }) : el("img", { src: fileUrl }));
              if (!previewEl) {
                media.addEventListener("loadeddata", () => { previewEl = media; });
                media.addEventListener("load", () => { previewEl = media; });
              }
              previewEl = previewEl || media;
              zone.append(media, el("button", { class: "ln-btn ln-drop-re", onclick: (e) => { e.stopPropagation(); file = null; previewEl = null; fileUrl = ""; picker.click(); } }, SC.t("create.reselect")));
            } else {
              zone.append(ico("plus", 20), el("p", { class: "ln-drop-main" }, SC.t("create.file")), el("p", { class: "ln-drop-hint" }, SC.t("create.fileHint")));
            }
            zone.classList.toggle("is-filled", !!(previewEl || fileUrl));
            if (progress >= 0 && progress < 100) zone.append(el("div", { class: "ln-progress" }, el("i", { style: { width: `${progress}%` } })));
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
            if (e.dataTransfer.files[0]) { picker.files = e.dataTransfer.files; picker.dispatchEvent(new Event("change")); }
          });
          body.append(zone, picker);
        } else {
          const sub = panel.querySelector(".ln-dialog-sub");
          const grid = el("div", { class: "ln-member-grid" });
          function renderMembers() {
            grid.innerHTML = "";
            sub.textContent = SC.t("create.members", members.length);
            if (!members.length) { grid.append(el("p", { class: "ln-drop-hint", style: { padding: "14px 0" } }, SC.t("create.membersEmpty"))); return; }
            members.forEach((m, i) => {
              grid.append(el("div", { class: "ln-member" },
                el("div", { class: "ln-member-cover" }, m.coverUrl ? el("img", { src: m.coverUrl, loading: "lazy" }) : null),
                el("span", { class: "ln-member-name" }, (m.meta && m.meta.title) || "—"),
                el("button", { class: "ln-icon-btn ln-member-x", onclick: () => { members.splice(i, 1); renderMembers(); } },
                  (() => { const s = el("span"); s.innerHTML = icon("x", 11); return s; })())));
            });
          }
          const addBtn = el("button", { class: "ln-btn" }, ico("listplus", 13), SC.t("create.addMembers"));
          addBtn.addEventListener("click", () => openMemberPicker(members, renderMembers));
          body.append(el("div", { class: "ln-field-head" }, el("span", { class: "ln-field-label" }, SC.t("create.members", members.length)), addBtn), grid);
          renderMembers();
        }
      }
      render();

      okBtn.addEventListener("click", async () => {
        if (!title.trim()) { SC.toast(SC.t("create.titleEmpty"), "err"); return; }
        if (mode === "wall") {
          if (!isEdit && !file) { SC.toast(SC.t("create.noFile"), "err"); return; }
          if (file) {
            if (isEdit) {
              const updated = JSON.parse(JSON.stringify(existing));
              updated.fileUrl = await SC.uploadFile(file);
              const cover = SC.captureCover(previewEl);
              if (cover) updated.coverUrl = await SC.uploadCover(cover);
              updated.meta.title = title;
              if (await SC.updateWallpaper(updated)) { SC.toast(SC.t("create.updated"), "ok"); close(true); renderView(); }
              return;
            }
            const ok = await SC.createMediaWallpaper({
              title: title.trim(), file, previewEl,
              onProgress: (p) => { progress = p; okBtn.textContent = SC.t("create.importing", p); },
            });
            if (ok) { SC.toast(SC.t("create.created"), "ok"); close(true); renderView(); }
            else okBtn.textContent = SC.t("common.create");
            return;
          }
          if (isEdit) {
            const updated = JSON.parse(JSON.stringify(existing));
            updated.meta.title = title;
            if (await SC.updateWallpaper(updated)) { SC.toast(SC.t("create.updated"), "ok"); close(true); renderView(); }
          }
          return;
        }
        if (!members.length) { SC.toast(SC.t("create.listEmpty"), "err"); return; }
        if (isEdit) {
          const updated = JSON.parse(JSON.stringify(existing));
          updated.meta.title = title;
          updated.meta.wallpapers = members;
          if (await SC.updateWallpaper(updated)) { SC.toast(SC.t("create.updated"), "ok"); close(true); renderView(); }
          return;
        }
        if (await SC.createPlaylist({ title: title.trim(), members })) { SC.toast(SC.t("create.created"), "ok"); close(true); renderView(); }
      });

      panel.append(
        dialogHead(
          isEdit ? (playlistMode ? SC.t("create.editList") : SC.t("create.editWallpaper")) : (playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")),
          playlistMode ? SC.t("create.members", members.length) : SC.t("create.fileHint"),
          close),
        body,
        el("div", { class: "ln-dialog-foot" }, okBtn));
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  function isVideoName(name) { return /\.(mp4|webm|mkv|flv|blv|avi|mov|m4v)$/i.test(name || ""); }

  function openMemberPicker(members, onChanged) {
    const picked = new Set(members.map((m) => m.filePath));
    openDialog((panel, close) => {
      const candidates = wallpapersCache.filter((w) => w.meta.type !== 6);
      const grid = el("div", { class: "ln-pick-grid" });
      const allBtn = el("button", { class: "ln-btn", onclick: () => {
        const allOn = candidates.every((c) => picked.has(c.filePath));
        if (allOn) candidates.forEach((c) => picked.delete(c.filePath));
        else candidates.forEach((c) => picked.add(c.filePath));
        renderGrid();
      } }, SC.t("create.selectAll"));
      function renderGrid() {
        grid.innerHTML = "";
        for (const w of candidates) {
          const on = picked.has(w.filePath);
          grid.append(el("button", { class: `ln-pick ${on ? "is-on" : ""}`, onclick: () => { on ? picked.delete(w.filePath) : picked.add(w.filePath); renderGrid(); } },
            el("div", { class: "ln-pick-cover" }, w.coverUrl ? el("img", { src: w.coverUrl, loading: "lazy" }) : null),
            on ? el("span", { class: "ln-pick-check" }, (() => { const s = el("span"); s.innerHTML = icon("check", 11); return s; })()) : null,
            el("span", { class: "ln-pick-name" }, (w.meta && w.meta.title) || "—")));
        }
      }
      renderGrid();
      panel.append(
        dialogHead(SC.t("create.pickTitle"), SC.t("create.pickHint"), close),
        el("div", { class: "ln-dialog-body" }, el("div", { class: "ln-row" }, allBtn, el("span", { class: "ln-drop-hint" }, SC.t("create.pickHint"))), grid),
        el("div", { class: "ln-dialog-foot" },
          el("span", { class: "ln-drop-hint" }, SC.t("create.members", picked.size)),
          el("button", {
            class: "ln-btn ln-btn-primary",
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
    openDialog((panel, close) => {
      const body = el("div", { class: "ln-dialog-body" });
      function rebuild() {
        body.innerHTML = "";
        if (type !== 6) {
          const dur = el("input", { class: "ln-input ln-time", type: "time", value: cur.duration || "" });
          dur.addEventListener("change", () => { cur.duration = dur.value || null; });
          body.append(fieldRow(SC.t("set.duration"), dur, SC.t("set.durationHint")));
        }
        if (type === 6) {
          body.append(fieldRow(SC.t("set.playMode"), selectEl([{ value: 0, label: SC.t("set.order") }, { value: 1, label: SC.t("set.random") }], cur.playMode, (v) => { cur.playMode = Number(v); })));
        }
        if (type === 4 || type === 5) {
          body.append(fieldRow(SC.t("set.mouse"), switchEl(cur.enableMouseEvent, (v) => { cur.enableMouseEvent = v; }), SC.t("set.mouseHint")));
        }
        if (type === 3) {
          body.append(fieldRow(SC.t("set.player"), selectEl([{ value: 0, label: SC.t("set.engine0") }, { value: 2, label: SC.t("set.engine2") }, { value: 1, label: SC.t("set.engine1") }], cur.videoPlayer, (v) => { cur.videoPlayer = Number(v); })));
          body.append(fieldRow(SC.t("set.hwdec"), switchEl(cur.hardwareDecoding, (v) => { cur.hardwareDecoding = v; }), SC.t("set.hwdecHint")));
          body.append(fieldRow(SC.t("set.panscan"), switchEl(cur.isPanScan, (v) => { cur.isPanScan = v; }), SC.t("set.panscanHint")));
        }
        if (type === 1) {
          body.append(fieldRow(SC.t("set.fit"), selectEl([0, 1, 2, 3, 4, 5].map((i) => ({ value: i, label: SC.t(`set.fit${i}`) })), cur.fit, (v) => { cur.fit = Number(v); })));
          body.append(fieldRow(SC.t("set.keep"), switchEl(cur.keepWallpaper, (v) => { cur.keepWallpaper = v; }), SC.t("set.keepHint")));
        }
      }
      rebuild();
      const saveBtn = el("button", { class: "ln-btn ln-btn-primary" }, SC.t("common.save"));
      saveBtn.addEventListener("click", async () => { if (await SC.saveWallpaperSetting(w, { ...cur })) close(true); });
      panel.append(
        dialogHead(SC.t("set.title"), SC.t("set.sub", (w.meta && w.meta.title) || ""), close),
        body,
        el("div", { class: "ln-dialog-foot" }, saveBtn));
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  // ---------------------------------------------------------------- 下载（issue 行风格）
  function renderDownloads() {
    viewEl.innerHTML = "";
    const dls = SC.state.downloads;
    const his = SC.state.history;
    const active = dls.filter((d) => d.isDownloading && !d.IsCanceled);

    viewEl.append(viewHead(SC.t("dl.title"), SC.t("dl.sub"),
      his.length ? el("button", {
        class: "ln-btn",
        onclick: () => SC.confirm({ title: SC.t("dl.clear"), body: SC.t("dl.clearConfirm"), danger: true }).then(async (ok) => { if (ok && await SC.clearHistory()) renderView(); }),
      }, SC.t("dl.clear")) : null));

    const actBox = el("div", { class: "ln-rows" });
    if (!active.length) actBox.append(el("div", { class: "ln-empty ln-empty-sm" }, el("p", {}, SC.t("dl.activeEmpty"))));
    for (const d of active) {
      actBox.append(el("div", { class: "ln-row-item" },
        el("span", { class: "ln-pill is-progress" }, "● " + SC.t("dl.active")),
        el("div", { class: "ln-row-main" },
          el("div", { class: "ln-row-line" },
            el("span", { class: "ln-row-name" }, d.desc || d.id),
            el("span", { class: "ln-drop-hint" }, `${Math.round(d.percent || 0)}% · ${SC.fmtBytes(d.receivedBytes)} / ${SC.fmtBytes(d.totalBytes)}`)),
          el("div", { class: "ln-progress" }, el("i", { style: { width: `${Math.round(d.percent || 0)}%` } }))),
        el("button", { class: "ln-btn ln-btn-sm", onclick: () => SC.cancelDownload(d.id) }, SC.t("dl.cancel"))));
    }
    const hisBox = el("div", { class: "ln-rows" });
    if (!his.length) hisBox.append(el("div", { class: "ln-empty ln-empty-sm" }, el("p", {}, SC.t("dl.historyEmpty"))));
    for (const h of his) {
      hisBox.append(el("div", { class: "ln-row-item" },
        el("span", { class: "ln-pill is-done" }, "✓"),
        el("div", { class: "ln-row-thumb" }, h.coverUrl ? el("img", { src: h.coverUrl, loading: "lazy" }) : null),
        el("div", { class: "ln-row-main" },
          el("span", { class: "ln-row-name" }, h.title || h.id),
          el("span", { class: "ln-drop-hint" }, `${SC.fmtBytes(h.totalBytes)} · ${new Date(h.completedAt).toLocaleString()}`)),
        el("button", { class: "ln-icon-btn", title: SC.t("common.location"), onclick: () => { if (!SC.demo && h.filePath) SC.client.api.explore(h.filePath); } },
          (() => { const s = el("span"); s.innerHTML = icon("folder", 14); return s; })()),
        el("button", { class: "ln-icon-btn", title: SC.t("common.delete"), onclick: async () => { await SC.removeHistory(h.id); renderView(); } },
          (() => { const s = el("span"); s.innerHTML = icon("trash", 14); return s; })())));
    }
    viewEl.append(
      el("h3", { class: "ln-sec" }, SC.t("dl.active"), el("span", { class: "ln-sec-count" }, String(active.length))),
      actBox,
      el("h3", { class: "ln-sec" }, SC.t("dl.history"), el("span", { class: "ln-sec-count" }, String(his.length))),
      hisBox);
  }

  // ---------------------------------------------------------------- 社区
  function renderHub() {
    viewEl.innerHTML = "";
    const url = SC.hubUrl(SC.state.hubTarget);
    viewEl.append(viewHead(SC.t("hub.title"), SC.t("hub.loginHint"),
      el("div", { class: "ln-inline" },
        el("button", { class: "ln-btn ln-btn-primary", onclick: () => SC.communityLogin() }, ico("user", 13), SC.t("hub.login")),
        el("button", { class: "ln-btn", onclick: () => { const f = viewEl.querySelector("iframe"); if (f) f.src = f.src; } }, ico("refresh", 13), SC.t("hub.reload")),
        el("button", { class: "ln-btn", onclick: () => SC.openUrl(url) }, ico("external", 13), SC.t("hub.browser")))));
    viewEl.append(el("div", { class: "ln-hubbox" }, el("iframe", { src: url, class: "ln-hubframe", allow: "clipboard-write" })));
  }

  // ---------------------------------------------------------------- 设置
  let settingsTab = "general";
  function renderSettings() {
    viewEl.innerHTML = "";
    viewEl.append(viewHead(SC.t("nav.settings"), SC.t("cfg.reloadHint")));
    const tabs = el("div", { class: "ln-tabs" },
      [["general", SC.t("cfg.general")], ["wallpaper", SC.t("cfg.wallpaper")], ["appearance", SC.t("cfg.appearance")]].map(([id, label]) =>
        el("button", { class: `ln-tab ${settingsTab === id ? "is-active" : ""}`, onclick: () => { settingsTab = id; renderSettings(); } }, label)));
    viewEl.append(tabs);
    const panel = el("div", { class: "ln-cfg" });
    viewEl.append(panel);
    if (settingsTab === "general") generalTab(panel);
    else if (settingsTab === "wallpaper") wallpaperTab(panel);
    else appearanceTab(panel);
  }

  function generalTab(panel) {
    const g = SC.state.cfg.General;
    const contributeBtn = el("button", { class: "ln-btn ln-btn-sm",
      onclick: () => SC.openUrl("https://github.com/GiantappMan/livewallpaper/tree/v4.x/src/giantapp-wallpaper-ui/src/dictionaries") }, ico("external", 12));
    panel.append(card([
      cfgRow(SC.t("cfg.autoStart"), SC.t("cfg.autoStartHint"), switchEl(g.autoStart, (v) => { SC.saveConfig("General", { autoStart: v }); g.autoStart = v; })),
      cfgRow(SC.t("cfg.hideWindow"), SC.t("cfg.hideWindowHint"), switchEl(g.hideWindow, (v) => { SC.saveConfig("General", { hideWindow: v }); g.hideWindow = v; })),
      cfgRow(SC.t("cfg.headless"), SC.t("cfg.headlessHint"), (() => {
        const sw = switchEl(g.autoStartHeadless, (v) => { SC.saveConfig("General", { autoStartHeadless: v }); g.autoStartHeadless = v; });
        if (!g.autoStart) sw.classList.add("is-disabled");
        return sw;
      })()),
      cfgRow(SC.t("cfg.language"), SC.t("cfg.langHint"), selectEl([
        { value: "zh", label: "中文" }, { value: "en", label: "English" },
        { value: "ru", label: "Русский" }, { value: "es", label: "Espanol" },
      ], g.currentLan, (v) => SC.setLang(v))),
      cfgRow(SC.t("cfg.contribute"), "", contributeBtn),
    ]));
  }
  function card(rows) { return el("div", { class: "ln-card-list" }, rows); }
  function cfgRow(label, hint, control) {
    return el("div", { class: "ln-cfg-row" },
      el("div", {}, el("span", { class: "ln-cfg-label" }, label), hint ? el("p", { class: "ln-cfg-hint" }, hint) : null), control);
  }

  function wallpaperTab(panel) {
    const c = SC.state.cfg.Wallpaper;
    const dirs = [...(c.directories && c.directories.length ? c.directories : [""])];
    const dirBox = el("div", { class: "ln-dirs" });
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
        const input = el("input", { class: "ln-input", type: "text", placeholder: i === 0 ? SC.t("cfg.dirsHint") : "", value: d });
        input.addEventListener("change", persistDirs);
        const browse = el("button", {
          class: "ln-btn ln-btn-sm",
          onclick: async () => {
            if (SC.demo) { input.value = `D:\\Wallpapers\\demo-${dirs.length}`; persistDirs(); return; }
            const res = await SC.client.shell.showFolderDialog();
            if (res && res.data) { input.value = res.data; persistDirs(); }
          },
        }, SC.t("cfg.choose"));
        const del = el("button", { class: "ln-icon-btn", onclick: () => { dirs.splice(i, 1); if (!dirs.length) dirs.push(""); renderDirs(); persistDirs(); } },
          (() => { const s = el("span"); s.innerHTML = icon("x", 12); return s; })());
        dirBox.append(el("div", { class: "ln-dir-row" }, input, browse, del));
      });
    }
    renderDirs();
    panel.append(
      card([
        cfgRow(SC.t("cfg.dirs"), SC.t("cfg.dirsHint"), el("button", { class: "ln-btn ln-btn-sm", onclick: () => { dirs.push(""); renderDirs(); } }, ico("plus", 12), SC.t("cfg.addDir"))),
        el("div", { class: "ln-cfg-row" }, dirBox),
        cfgRow(SC.t("cfg.covered"), "", selectEl([{ value: 0, label: SC.t("cfg.covered0") }, { value: 1, label: SC.t("cfg.covered1") }, { value: 2, label: SC.t("cfg.covered2") }], c.coveredBehavior, (v) => { c.coveredBehavior = Number(v); SC.saveConfig("Wallpaper", { coveredBehavior: Number(v) }); })),
        cfgRow(SC.t("cfg.player"), "", selectEl([{ value: 2, label: SC.t("set.engine2") }, { value: 1, label: SC.t("set.engine1") }], c.defaultVideoPlayer, (v) => { c.defaultVideoPlayer = Number(v); SC.saveConfig("Wallpaper", { defaultVideoPlayer: Number(v) }); })),
        el("div", { class: "ln-cfg-row" }, mpvBlock()),
      ]));
  }

  function mpvBlock() {
    const box = el("div", { class: "ln-row ln-mpv" });
    let downloading = false;
    async function render() {
      const st = await SC.mpvStatus();
      box.innerHTML = "";
      if (!st) return;
      if (!st.available && !downloading) {
        box.append(el("span", { class: "ln-drop-hint" }, SC.t("cfg.mpvMissing")),
          el("button", { class: "ln-btn ln-btn-sm ln-btn-primary", onclick: () => { SC.mpvDownload(); downloading = true; render(); } }, SC.t("cfg.mpvDownload")));
      } else if (downloading) {
        const pct = el("span", { class: "ln-drop-hint" }, SC.t("cfg.mpvProgress", 0));
        box.append(pct, el("button", { class: "ln-btn ln-btn-sm", onclick: async () => { await SC.mpvCancel(); downloading = false; render(); } }, SC.t("cfg.mpvCancel")));
        SC.onMpvEvent((e) => {
          if (e.state === "progress") pct.textContent = SC.t("cfg.mpvProgress", Math.round(e.percent || 0));
          else if (e.state === "done") { downloading = false; SC.toast(SC.t("cfg.mpvDone"), "ok"); render(); }
          else if (e.state === "error") { downloading = false; SC.toast(SC.t("cfg.mpvFail", e.message || ""), "err"); render(); }
        });
      }
      box.append(el("button", { class: "ln-btn ln-btn-sm", onclick: () => SC.mpvFolder() }, SC.t("cfg.mpvFolder")));
    }
    render();
    return box;
  }

  async function appearanceTab(panel) {
    const a = SC.state.cfg.Appearance;
    const modeSel = selectEl([
      { value: "system", label: SC.t("cfg.modeSys") }, { value: "light", label: SC.t("cfg.modeLight") }, { value: "dark", label: SC.t("cfg.modeDark") },
    ], a.mode || "system", (v) => { SC.setMode(v); a.mode = v; updateModeBtn(); });

    const skins = await SC.listSkins();
    const skinRows = skins.map((s) => {
      const current = s.id === a.skin || (SC.demo && s.id === SC.meta.id);
      return el("button", {
        class: `ln-skin-row ${current ? "is-current" : ""} ${s.valid === false ? "is-invalid" : ""}`,
        title: s.valid === false ? (s.invalidReason || "") : (s.description || ""),
        onclick: async () => {
          if (s.valid === false || current) return;
          if (await SC.applySkin(s.id)) { SC.toast(SC.t("cfg.skinApplied", s.name), "ok"); a.skin = s.id; }
        },
      },
        el("span", { class: "ln-skin-dot", dataset: { skin: s.id } }),
        el("span", { class: "ln-skin-name" }, s.name || s.id),
        el("span", { class: "ln-drop-hint" }, `${s.type === "style" ? "CSS" : "App"} · v${s.version || "?"} · ${s.author || ""}`),
        current ? el("span", { class: "ln-skin-cur" }, SC.t("cfg.skinCurrent")) : el("span", { class: "ln-drop-hint ln-skin-go" }, SC.t("common.apply") + " →"));
    });
    panel.append(
      card([cfgRow(SC.t("cfg.mode"), "", modeSel)]),
      card([
        cfgRow(SC.t("cfg.skins"), SC.t("cfg.skinHint"), el("button", { class: "ln-btn ln-btn-sm", onclick: () => SC.openSkinsFolder() }, SC.t("cfg.skinOpen"))),
        el("div", { class: "ln-skins" }, skinRows),
      ]));
  }

  // ---------------------------------------------------------------- 关于
  function renderAbout() {
    viewEl.innerHTML = "";
    const links = [
      ["zap", SC.t("about.review"), () => SC.openStoreReview()],
      ["star", SC.t("about.github"), () => SC.openUrl("https://github.com/GiantappMan/livewallpaper")],
      ["heart", SC.t("about.donate"), () => SC.openUrl("https://afdian.net/a/mscoder")],
      ["bug", SC.t("about.feedback"), () => SC.openUrl("https://support.qq.com/products/315103")],
    ];
    viewEl.append(viewHead(SC.t("about.title"), ""),
      el("div", { class: "ln-hero" },
        el("div", { class: "ln-hero-glow" }),
        el("div", { class: "ln-hero-logo" }, "◆"),
        el("div", {},
          el("h2", { class: "ln-hero-name" }, SC.meta.brand),
          el("p", { class: "ln-drop-hint" }, `v${SC.meta.version} · ${SC.t("about.author", "巨应君")} · ${SC.t("about.skinBy")}`))),
      card(links.map(([ic, label, act]) => el("button", { class: "ln-cfg-row ln-link-row", onclick: act },
        el("span", { class: "ln-link-ico" }, ico(ic, 14)),
        el("span", { class: "ln-cfg-label" }, label),
        (() => { const s = el("span", { class: "ln-link-arrow" }); s.innerHTML = icon("chevron", 13); return s; })()))),
      el("div", { class: "ln-about-foot" },
        el("button", { class: "ln-btn", onclick: () => SC.openLogs() }, SC.t("about.logs")),
        el("button", {
          class: "ln-btn ln-btn-danger",
          onclick: () => SC.confirm({ title: SC.t("about.exit"), body: SC.t("about.exitConfirm"), danger: true }).then((ok) => { if (ok) SC.exitApp(); }),
        }, SC.t("about.exit"))));
  }

  // ---------------------------------------------------------------- 播放条
  let focusIdx = 0;
  let dragging = false;
  let dragPos = 0;
  let lastTime = { position: 0, duration: 0 };

  function renderPlayer() {
    barEl.innerHTML = "";
    const st = SC.state.status;
    const playing = st ? st.wallpapers : [];
    if (!playing.length) {
      barEl.classList.add("is-empty");
      return;
    }
    barEl.classList.remove("is-empty");
    if (focusIdx >= playing.length) focusIdx = 0;
    const w = playing[focusIdx];
    const paused = !!(w.runningInfo && w.runningInfo.isPaused);
    const isList = w.meta && w.meta.type === 6;
    const pl = playing.length > 1;
    const showProgress = w.meta && (w.meta.type === 3 || w.meta.type === 6);
    const cur = dragging ? dragPos : lastTime.position;
    const dur = lastTime.duration || 0;

    const thumb = el("button", { class: "ln-player-thumb", title: pl ? SC.t("dock.focus") : "", onclick: () => { focusIdx = (focusIdx + 1) % playing.length; renderPlayer(); } },
      w.coverUrl ? el("img", { src: bust(w.coverUrl) }) : null);
    const meta = el("div", { class: "ln-player-meta" },
      el("span", { class: "ln-player-name" }, (w.meta && w.meta.title) || "—"),
      el("span", { class: "ln-drop-hint" }, `${SC.typeName(w.meta && w.meta.type)}${pl ? ` · ${focusIdx + 1}/${playing.length}` : ""}${paused ? " · " + SC.t("common.paused") : ""}`));

    const ctrl = el("div", { class: "ln-player-ctrl" });
    const g = (ic, title, act) => {
      const b = el("button", { class: "ln-icon-btn ln-player-btn", title, onclick: act });
      b.innerHTML = icon(ic, 15);
      return b;
    };
    if (isList) ctrl.append(g("prev", SC.t("dock.prev"), () => SC.prevIn(w)));
    if (SC.canPause(w)) {
      ctrl.append(g(paused ? "play" : "pause", paused ? SC.t("dock.resume") : SC.t("dock.pause"), () => {
        const idx = SC.screenIndexOf(w);
        paused ? SC.resume(idx) : SC.pause(idx);
      }));
    }
    ctrl.append(g("stop", SC.t("dock.stop"), async () => { await SC.stop(SC.screenIndexOf(w)); focusIdx = 0; }));
    if (isList) ctrl.append(g("next", SC.t("dock.next"), () => SC.nextIn(w)));

    const time = el("span", { class: "ln-player-time" }, showProgress ? `${SC.fmtTime(cur)} / ${SC.fmtTime(dur)}` : "∞");
    const lineBox = el("div", { class: "ln-player-progress" }, el("i", { style: { width: showProgress && dur ? `${Math.min(100, (cur / dur) * 100)}%` : "100%" } }));
    lineBox.addEventListener("mousedown", (e) => {
      if (!showProgress || !lastTime.duration) return;
      dragging = true;
      const move = (ev) => {
        const r = lineBox.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        dragPos = lastTime.duration * frac;
        lineBox.firstChild.style.width = `${frac * 100}%`;
        time.textContent = `${SC.fmtTime(dragPos)} / ${SC.fmtTime(lastTime.duration)}`;
      };
      move(e);
      const up = (ev) => {
        move(ev);
        dragging = false;
        SC.seek(dragPos);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });

    SC.onTime((tp) => {
      if (tp) lastTime = tp; else lastTime = { position: 0, duration: 0 };
      if (dragging) return;
      if (showProgress) {
        time.textContent = `${SC.fmtTime(lastTime.position)} / ${SC.fmtTime(lastTime.duration)}`;
        lineBox.firstChild.style.width = lastTime.duration ? `${Math.min(100, (lastTime.position / lastTime.duration) * 100)}%` : "0%";
      } else time.textContent = "∞";
    });

    const volume = st.volume || 0;
    const volBtn = el("button", { class: "ln-icon-btn ln-player-btn", title: SC.t("dock.volume") });
    volBtn.innerHTML = icon(volume === 0 ? "volx" : volume <= 50 ? "volq" : "vol", 15);
    const volPop = el("div", { class: "ln-volpop" },
      el("input", { type: "range", min: 0, max: 100, value: volume }),
      el("span", { class: "ln-player-time" }, String(volume)));
    const doSetVol = SC.debounce((v) => SC.setVolume(v, st.audioScreenIndex < 0 ? -1 : st.audioScreenIndex), 250);
    volPop.querySelector("input").addEventListener("input", (e) => {
      volPop.querySelector("span").textContent = e.target.value;
      doSetVol(Number(e.target.value));
    });
    volBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = volPop.classList.contains("is-open");
      document.querySelectorAll(".ln-volpop").forEach((n) => n.classList.remove("is-open"));
      if (!open) volPop.classList.add("is-open");
    });
    window.addEventListener("click", () => volPop.classList.remove("is-open"));

    const audioBtn = el("button", { class: "ln-icon-btn ln-player-btn", title: SC.t("dock.audio") });
    audioBtn.innerHTML = icon("music", 14);
    audioBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openMenuAt(e.clientX - 90, e.clientY - 40 - SC.state.screens.length * 34,
        SC.state.screens.map((s) => ({ label: SC.t("common.screen", s.deviceName || s.index), act: () => SC.setVolume(Math.max(volume, 30), s.index) }))
          .concat([{ label: SC.t("dock.mute"), act: () => SC.setVolume(0, -1) }]));
    });

    barEl.append(el("div", { class: "ln-player-inner" }, thumb, meta, ctrl, time, lineBox, volPop, volBtn, audioBtn),
      el("div", { class: "ln-player-line" }));
  }

  // ---------------------------------------------------------------- 键盘
  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (["1", "2", "3", "4", "5"].includes(e.key)) {
      const view = NAV.find((n) => n.key === e.key);
      if (view) go(view.id);
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      const input = viewEl.querySelector(".ln-search input");
      if (input) input.focus();
      return;
    }
    if (currentView !== "library") return;
    const cards = [...viewEl.querySelectorAll(".ln-card")];
    if (!cards.length) return;
    const idx = cards.findIndex((c) => c.classList.contains("is-sel"));
    if (["j", "ArrowDown", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const next = cards[Math.min(cards.length - 1, idx + 1)] || cards[0];
      cards.forEach((c) => c.classList.remove("is-sel"));
      next.classList.add("is-sel");
      focusPath = next.dataset.path;
      next.scrollIntoView({ block: "nearest" });
    } else if (["k", "ArrowUp", "ArrowLeft"].includes(e.key)) {
      e.preventDefault();
      const prev = cards[Math.max(0, idx - 1)] || cards[0];
      cards.forEach((c) => c.classList.remove("is-sel"));
      prev.classList.add("is-sel");
      focusPath = prev.dataset.path;
      prev.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && focusPath) {
      const w = wallpapersCache.find((x) => x.filePath === focusPath);
      if (w) SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]);
    } else if (focusPath && ["s", "e", "d", "o"].includes(e.key.toLowerCase())) {
      const w = wallpapersCache.find((x) => x.filePath === focusPath);
      if (!w) return;
      if (e.key === "s") openSettingDialog(w);
      else if (e.key === "e") openWallpaperDialog(w);
      else if (e.key === "d") removeWallpaper(w);
      else if (e.key === "o") SC.reveal(w);
    }
  });

  // ---------------------------------------------------------------- 调度
  function renderView() {
    closeMenu();
    if (currentView === "library") renderLibrary();
    else if (currentView === "downloads") renderDownloads();
    else if (currentView === "hub") renderHub();
    else if (currentView === "settings") renderSettings();
    else if (currentView === "about") renderAbout();
    renderPlayer();
  }

  SC.on("wallpapers", () => { if (currentView === "library") renderView(); });
  SC.on("status", () => {
    if (currentView === "library") {
      const playing = SC.playingSet();
      viewEl.querySelectorAll(".ln-card").forEach((c) => c.classList.toggle("is-playing", playing.has(c.dataset.path)));
    }
    renderPlayer();
  });
  SC.on("downloads", () => {
    if (dlBadge) {
      const n = SC.state.downloads.filter((d) => d.isDownloading && !d.IsCanceled).length;
      dlBadge.hidden = n === 0;
      dlBadge.textContent = String(n > 99 ? "99+" : n);
    }
    if (currentView === "downloads") renderView();
  });
  SC.on("history", () => { if (currentView === "downloads") renderView(); });
  SC.on("lang", () => { buildSidebar(); renderView(); });
  SC.on("mode", () => { updateModeBtn(); renderPlayer(); });
  SC.on("nav", (p) => { if (p && p.view) go(p.view); });
  SC.on("hub-session", () => { if (currentView === "hub") renderHub(); });
  SC.on("skins", () => { if (currentView === "settings" && settingsTab === "appearance") renderSettings(); });

  // ---------------------------------------------------------------- 启动
  buildSidebar();
  document.body.append(sidebar, viewEl, barEl);
  const initial = location.hash.replace(/^#\//, "");
  if (NAV.some((n) => n.id === initial)) currentView = initial;
  sidebar.querySelectorAll(".ln-nav-item[data-view]").forEach((n) => n.classList.toggle("is-active", n.dataset.view === currentView));
  SC.boot(() => {
    wallpapersCache = SC.state.wallpapers;
    SC.on("wallpapers", (list) => { wallpapersCache = list || SC.state.wallpapers; });
    renderView();
  });
})();
