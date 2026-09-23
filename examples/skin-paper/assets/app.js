/**
 * 素笺 Paper Ink · app.js
 * 纸感编辑部极简风：顶部报头导航 + 居中文档栏式内容 + 底部刊脚播放条。
 * 依赖 assets/core.js（window.SC）。
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

  // ---------------------------------------------------------------- 图标（细线，纸感）
  const I = {
    image: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><circle cx="9" cy="9" r="1.8"/><path d="M21 15l-5-5L5 21"/>',
    play: '<polygon points="7.5 4.5 19.5 12 7.5 19.5 7.5 4.5"/>',
    pause: '<line x1="8.5" y1="5" x2="8.5" y2="19"/><line x1="15.5" y1="5" x2="15.5" y2="19"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1"/>',
    prev: '<line x1="6" y1="5" x2="6" y2="19"/><polyline points="18 5 9 12 18 19"/>',
    next: '<line x1="18" y1="5" x2="18" y2="19"/><polyline points="6 5 15 12 6 19"/>',
    vol: '<polygon points="11 5.5 6.5 9.5 3.5 9.5 3.5 14.5 6.5 14.5 11 18.5 11 5.5"/><path d="M14.5 9a4.4 4.4 0 0 1 0 6"/><path d="M17.5 6.2a8.6 8.6 0 0 1 0 11.6"/>',
    volq: '<polygon points="11 5.5 6.5 9.5 3.5 9.5 3.5 14.5 6.5 14.5 11 18.5 11 5.5"/><path d="M15 9.2a4.4 4.4 0 0 1 0 5.6"/>',
    volx: '<polygon points="11 5.5 6.5 9.5 3.5 9.5 3.5 14.5 6.5 14.5 11 18.5 11 5.5"/><line x1="21.5" y1="9.5" x2="16" y2="14.5"/><line x1="16" y1="9.5" x2="21.5" y2="14.5"/>',
    plus: '<line x1="12" y1="5.5" x2="12" y2="18.5"/><line x1="5.5" y1="12" x2="18.5" y2="12"/>',
    listplus: '<line x1="3.5" y1="6.5" x2="12" y2="6.5"/><line x1="3.5" y1="11.5" x2="10" y2="11.5"/><line x1="3.5" y1="16.5" x2="12" y2="16.5"/><line x1="17" y1="11.5" x2="21.5" y2="11.5"/><line x1="19.25" y1="9.25" x2="19.25" y2="13.75"/>',
    sliders: '<line x1="5" y1="20" x2="5" y2="14"/><line x1="5" y1="10" x2="5" y2="4"/><line x1="12" y1="20" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="4"/><line x1="19" y1="20" x2="19" y2="16"/><line x1="19" y1="12" x2="19" y2="4"/><line x1="3.5" y1="14" x2="6.5" y2="14"/><line x1="10.5" y1="8" x2="13.5" y2="8"/><line x1="17.5" y1="16" x2="20.5" y2="16"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><line x1="12" y1="16" x2="12" y2="11.5"/><line x1="12" y1="8.2" x2="12.01" y2="8.2"/>',
    download: '<path d="M20.5 15v3.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V15"/><polyline points="7.5 10.5 12 15 16.5 10.5"/><line x1="12" y1="15" x2="12" y2="3.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><path d="M12 3.5c2.3 2.4 3.7 5.3 3.7 8.5s-1.4 6.1-3.7 8.5c-2.3-2.4-3.7-5.3-3.7-8.5s1.4-6.1 3.7-8.5z"/>',
    x: '<line x1="17.5" y1="6.5" x2="6.5" y2="17.5"/><line x1="6.5" y1="6.5" x2="17.5" y2="17.5"/>',
    check: '<polyline points="19.5 6.5 9.5 16.5 4.5 11.5"/>',
    pencil: '<path d="M16.8 3.2a2.6 2.6 0 1 1 3.7 3.7L7.6 19.8 2.5 21.2l1.4-5.1Z"/>',
    trash: '<polyline points="3.5 6 5.5 6 20.5 6"/><path d="M18.5 6l-.9 13.2a1.6 1.6 0 0 1-1.6 1.5H8a1.6 1.6 0 0 1-1.6-1.5L5.5 6"/><path d="M10 10.5v6"/><path d="M14 10.5v6"/><path d="M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6"/>',
    folder: '<path d="M21.5 18.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 4 4h4.5l2 2.5H20a1.5 1.5 0 0 1 1.5 1.5z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="20.5" y1="20.5" x2="15.5" y2="15.5"/>',
    monitor: '<rect x="3" y="4.5" width="18" height="12.5" rx="1.5"/><line x1="8.5" y1="20.5" x2="15.5" y2="20.5"/><line x1="12" y1="17" x2="12" y2="20.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.2" y1="5.2" x2="7" y2="7"/><line x1="17" y1="17" x2="18.8" y2="18.8"/><line x1="5.2" y1="18.8" x2="7" y2="17"/><line x1="17" y1="7" x2="18.8" y2="5.2"/>',
    moon: '<path d="M20.5 13A8.5 8.5 0 1 1 11 3.5 6.6 6.6 0 0 0 20.5 13z"/>',
    external: '<path d="M17.5 13.5v5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V8a1.5 1.5 0 0 1 1.5-1.5h5"/><polyline points="14.5 3.5 20.5 3.5 20.5 9.5"/><line x1="10" y1="14" x2="20.5" y2="3.5"/>',
    user: '<path d="M19.5 20.5v-1.5a3.8 3.8 0 0 0-3.8-3.8H8.3a3.8 3.8 0 0 0-3.8 3.8v1.5"/><circle cx="12" cy="7.5" r="3.8"/>',
    refresh: '<polyline points="21.5 4.5 21.5 10 16 10"/><path d="M19.5 15a8 8 0 1 1-1.6-8.6l3.6 3.6"/>',
    music: '<path d="M9 17.5V5.5l11-1.8v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.7" r="2.5"/>',
    chevron: '<polyline points="6.5 9.5 12 15 17.5 9.5"/>',
    zap: '<polygon points="13 2.5 4 13.5 11.5 13.5 11 21.5 20 10.5 12.5 10.5 13 2.5"/>',
    star: '<polygon points="12 3 14.8 8.8 21 9.6 16.5 14 17.6 20.2 12 17.2 6.4 20.2 7.5 14 3 9.6 9.2 8.8"/>',
    heart: '<path d="M20 5.2a4.9 4.9 0 0 0-7 0L12 6.2l-1-1a4.9 4.9 0 0 0-7 7l1 1 7 6.8 7-6.8 1-1a4.9 4.9 0 0 0 0-7z"/>',
    bug: '<rect x="8.5" y="7" width="7" height="13" rx="3.5"/><path d="M18.5 7.5l-2.6 1.7M5.5 7.5l2.6 1.7M18.5 19l-2.6-1.7M5.5 19l2.6-1.7M12 20V7M3 13h18"/>',
  };
  function icon(name, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 17}" height="${size || 17}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`;
  }
  // 作为 DOM 子节点用的图标（icon() 返回字符串，直接传给 el() 会被当文本）
  function ico(name, size) {
    const s = el("span", { style: { display: "inline-flex" } });
    s.innerHTML = icon(name, size);
    return s;
  }

  // ---------------------------------------------------------------- 壳与导航
  let currentView = "library";
  let searchQuery = "";
  let applyTarget = -1;
  const viewEl = el("main", { class: "page" });
  const stripEl = el("footer", { class: "strip" });

  const NAV = [
    { id: "library", no: "01", label: "nav.library" },
    { id: "hub", no: "02", label: "nav.hub" },
    { id: "downloads", no: "03", label: "nav.downloads", badge: true },
    { id: "settings", no: "04", label: "nav.settings" },
    { id: "about", no: "05", label: "nav.about" },
  ];
  let dlBadge = null;
  let masthead = null;

  function buildMasthead() {
    if (masthead) masthead.remove();
    masthead = el("header", { class: "masthead" },
      el("div", { class: "mast-brand", "data-tauri-drag-region": true, ondblclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } },
        el("span", { class: "mast-seal" }, "巨"),
        el("div", { class: "mast-name" },
          el("strong", {}, "素笺"),
          el("span", { class: "mast-en" }, "PAPER INK"))),
      el("nav", { class: "mast-nav" },
        NAV.map((n) => el("button", {
          class: `mast-link ${currentView === n.id ? "is-active" : ""}`,
          dataset: { view: n.id },
          onclick: () => go(n.id),
        },
          el("span", { class: "mast-no" }, n.no),
          SC.t(n.label),
          n.badge ? (dlBadge = el("sup", { class: "mast-badge", hidden: true })) : null))),
      el("div", { class: "mast-tools" },
        el("button", { class: "tool-btn", id: "mode-btn", title: SC.t("cfg.mode"), onclick: cycleMode }),
        el("span", { class: "mast-win" },
          el("button", { class: "win-dot", title: "—", onclick: () => { if (SC.client) SC.client.win.minimize(); } }),
          el("button", { class: "win-dot", title: "□", onclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } }),
          el("button", { class: "win-dot is-close", title: "×", onclick: () => { if (SC.client) SC.client.win.close(); } }))));
    document.body.prepend(masthead);
    updateModeBtn();
  }
  function updateModeBtn() {
    const btn = masthead && masthead.querySelector("#mode-btn");
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
    masthead.querySelectorAll(".mast-link").forEach((n) => n.classList.toggle("is-active", n.dataset.view === view));
    renderView();
  }
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace(/^#\//, "") || "library";
    if (id !== currentView && NAV.some((n) => n.id === id)) go(id);
  });

  // ---------------------------------------------------------------- 小部件
  function sectionHead(no, title, en, extra) {
    return el("header", { class: "sec-head" },
      el("div", { class: "sec-titles" },
        el("span", { class: "sec-no" }, `${no} — ${en}`),
        el("h1", { class: "sec-title" }, title)),
      extra || null);
  }

  function switchEl(checked, onchange) {
    const input = el("input", { type: "checkbox" });
    input.checked = !!checked;
    if (onchange) input.addEventListener("change", () => onchange(input.checked));
    return el("label", { class: "pswitch" }, input, el("span", { class: "pswitch-ui" }, el("b", {}, "ON"), el("b", {}, "OFF"), el("i", { class: "pswitch-knob" })));
  }

  function selectEl(options, value, onchange) {
    const wrap = el("div", { class: "psel" });
    const btn = el("button", { class: "psel-btn", type: "button" });
    const renderLabel = () => {
      const cur = options.find((o) => String(o.value) === String(value));
      btn.innerHTML = `<span>${cur ? cur.label : ""}</span>${icon("chevron", 13)}`;
    };
    renderLabel();
    const menu = el("div", { class: "psel-menu" });
    menu.addEventListener("click", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = wrap.classList.contains("is-open");
      closeAll();
      if (open) return;
      menu.innerHTML = "";
      for (const o of options) {
        menu.append(el("button", {
          class: `psel-item ${String(o.value) === String(value) ? "is-active" : ""}`,
          type: "button",
          onclick: () => { value = o.value; renderLabel(); wrap.classList.remove("is-open"); onchange && onchange(o.value); },
        }, o.label));
      }
      wrap.classList.add("is-open");
    });
    wrap.append(btn, menu);
    return wrap;
  }
  function closeAll() { document.querySelectorAll(".psel.is-open").forEach((n) => n.classList.remove("is-open")); }
  window.addEventListener("click", closeAll);

  function fieldRow(label, control, hint) {
    return el("div", { class: "pfield" },
      el("div", { class: "pfield-head" }, el("span", { class: "pfield-label" }, label), control),
      hint ? el("p", { class: "pfield-hint" }, hint) : null);
  }

  // ---------------------------------------------------------------- 弹窗
  function openDialog(build, opts) {
    opts = opts || {};
    const sheet = el("div", { class: "sheet" });
    const overlay = el("div", { class: "sheet-veil" }, sheet);
    let closed = false;
    async function close(force) {
      if (closed) return;
      if (!force && opts.beforeClose) { const ok = await opts.beforeClose(); if (!ok) return; }
      closed = true;
      overlay.classList.add("is-out");
      setTimeout(() => overlay.remove(), 200);
    }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const esc = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    document.body.append(overlay);
    build(sheet, close);
    return { close };
  }
  function sheetHead(title, sub, close) {
    return el("div", { class: "sheet-head" },
      el("div", {},
        el("h2", { class: "sheet-title" }, title),
        sub ? el("p", { class: "sheet-sub" }, sub) : null),
      el("button", { class: "seal-close", title: SC.t("common.close"), onclick: () => close() }, "关"));
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

    const search = el("input", { class: "search-line", type: "search", placeholder: SC.t("lib.search"), value: searchQuery });
    search.addEventListener("input", SC.debounce(() => { searchQuery = search.value; renderGrid(); }, 120));

    const createBtn = el("button", { class: "ink-btn" });
    createBtn.innerHTML = `${icon("plus", 14)}<span>${SC.t("common.create")}</span>`;
    createBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openMenu(e.currentTarget, [
        { label: SC.t("create.wallpaper"), act: () => openWallpaperDialog(null) },
        { label: SC.t("create.playlist"), act: () => openWallpaperDialog({ playlist: true }) },
      ]);
    });

    viewEl.append(sectionHead("01", SC.t("lib.title"), "LIBRARY",
      el("div", { class: "sec-tools" }, search,
        el("div", { class: "inline-target" }, el("span", { class: "mut" }, SC.t("lib.target")), targetSel),
        createBtn)));

    const metaLine = el("p", { class: "count-line" }, SC.t("lib.count", all.length), screens.length ? el("span", { class: "mut" }, ` · ${screens.length} screen${screens.length > 1 ? "s" : ""}`) : null);
    viewEl.append(metaLine);
    const grid = el("div", { class: "paper-grid" });
    viewEl.append(grid);

    function renderGrid() {
      grid.innerHTML = "";
      const q = searchQuery.trim().toLowerCase();
      const items = q ? all.filter((w) => ((w.meta && w.meta.title) || "").toLowerCase().includes(q) || (w.fileName || "").toLowerCase().includes(q)) : all;
      if (!items.length) {
        grid.append(el("div", { class: "paper-empty" },
          el("span", { class: "paper-empty-char" }, "空"),
          el("h3", {}, SC.t("lib.empty")),
          el("p", {}, SC.t("lib.emptyHint")),
          el("div", { class: "row-end", style: { justifyContent: "center", marginTop: "18px", gap: "12px" } },
            el("button", { class: "ink-btn", onclick: () => openWallpaperDialog(null) }, SC.t("create.wallpaper")),
            el("button", { class: "ghost-btn", onclick: () => go("settings") }, SC.t("cfg.dirs")))));
        return;
      }
      for (const w of items) grid.append(cardOf(w));
    }

    function cardOf(w) {
      const isPlaying = playing.has(w.filePath);
      const card = el("article", { class: `pcard ${isPlaying ? "is-playing" : ""}`, dataset: { path: w.filePath || "" }, tabindex: "0" });
      const cover = el("div", { class: "pcard-cover" },
        (w.coverUrl || w.fileUrl) ? el("img", { src: bust(w.coverUrl || w.fileUrl), loading: "lazy", alt: "" }) : null,
        isPlaying ? el("span", { class: "pcard-live" }, "◉ " + SC.t("lib.playingBadge")) : null,
        screens.length > 1 ? el("span", { class: "pcard-screens" },
          el("button", { title: SC.t("common.allScreens"), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, []); } }, "全"),
          screens.map((s) => el("button", { title: SC.t("common.screen", s.deviceName || s.index), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, [s.index]); } }, String(s.index + 1)))) : null);
      const cap = el("div", { class: "pcard-cap" },
        el("div", { class: "pcard-line" },
          el("span", { class: "pcard-title", title: w.meta && w.meta.title }, (w.meta && w.meta.title) || "—"),
          el("span", { class: "pcard-type" }, SC.typeName(w.meta && w.meta.type))),
        el("div", { class: "pcard-acts" },
          actLink(SC.t("nav.settings"), () => openSettingDialog(w)),
          actLink(SC.t("common.edit"), () => openWallpaperDialog(w)),
          actLink(SC.t("common.location"), () => SC.reveal(w)),
          actLink(SC.t("common.delete"), () => removeWallpaper(w), true)));
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
    function actLink(label, act, danger) {
      return el("button", { class: `act-link ${danger ? "is-danger" : ""}`, onclick: (e) => { e.stopPropagation(); act(); } }, label);
    }
    renderGrid();

    // 空白处右键：创建入口
    grid.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".pcard")) return;
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

  // 文字菜单（下拉 / 右键共用）
  let menuEl = null;
  function openMenuAt(x, y, items) {
    closeMenu();
    menuEl = el("div", { class: "pmenu" }, items.map((it) =>
      el("button", { class: `pmenu-item ${it.danger ? "is-danger" : ""}`, onclick: () => { closeMenu(); it.act(); } }, it.label)));
    document.body.append(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = `${Math.min(x, window.innerWidth - r.width - 10)}px`;
    menuEl.style.top = `${Math.min(y, window.innerHeight - r.height - 10)}px`;
    setTimeout(() => {
      window.addEventListener("click", closeMenu);
      window.addEventListener("blur", closeMenu);
      window.addEventListener("keydown", closeMenu);
    });
  }
  function openMenu(anchor, items) {
    const r = anchor.getBoundingClientRect();
    openMenuAt(r.right - 150, r.bottom + 6, items);
  }
  function closeMenu() {
    if (!menuEl) return;
    menuEl.remove(); menuEl = null;
    window.removeEventListener("click", closeMenu);
    window.removeEventListener("blur", closeMenu);
    window.removeEventListener("keydown", closeMenu);
  }

  function removeWallpaper(w) {
    SC.confirm({
      title: SC.t("common.delete"),
      body: `「${(w.meta && w.meta.title) || w.fileName}」`,
      okText: SC.t("common.delete"),
      danger: true,
    }).then(async (ok) => { if (ok && await SC.deleteWallpaper(w)) renderView(); });
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

    openDialog((sheet, close) => {
      const box = el("div", { class: "sheet-body" });
      const saveBtn = el("button", { class: "ink-btn" }, isEdit ? SC.t("common.save") : SC.t("common.create"));
      const foot = el("div", { class: "sheet-foot" });
      if (mode === "wall") foot.append(el("span", { class: "mut" }, file ? `${SC.t("create.imported")} · ${file.name || ""}` : ""));
      foot.append(saveBtn);

      function render() {
        box.innerHTML = "";
        const titleInput = el("input", { class: "line-input", type: "text", placeholder: SC.t("create.titlePh", playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")), value: title });
        titleInput.addEventListener("input", () => { title = titleInput.value; });
        box.append(el("div", { class: "pfield" }, el("span", { class: "pfield-label" }, SC.t("create.titleField")), titleInput));

        if (mode === "wall") {
          const zone = el("div", { class: "pdrop" });
          function renderZone() {
            zone.innerHTML = "";
            if (previewEl || (fileUrl && !file)) {
              const media = previewEl || (isVideoName(fileUrl) ? el("video", { src: fileUrl, autoplay: true, loop: true, muted: true, playsinline: true }) : el("img", { src: fileUrl }));
              if (!previewEl) {
                media.addEventListener("loadeddata", () => { previewEl = media; });
                media.addEventListener("load", () => { previewEl = media; });
              }
              previewEl = previewEl || media;
              zone.append(media, el("button", { class: "ghost-btn drop-re", onclick: (e) => { e.stopPropagation(); file = null; previewEl = null; fileUrl = ""; picker.click(); } }, SC.t("create.reselect")));
            } else {
              zone.append(el("p", { class: "pdrop-main" }, SC.t("create.file")), el("p", { class: "mut" }, SC.t("create.fileHint")));
            }
            zone.classList.toggle("is-filled", !!(previewEl || fileUrl));
            if (progress >= 0 && progress < 100) zone.append(el("div", { class: "pline-progress" }, el("i", { style: { width: `${progress}%` } })));
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
          box.append(zone, picker);
        } else {
          const sub = sheet.querySelector(".sheet-sub");
          const grid = el("div", { class: "pmember-grid" });
          function renderMembers() {
            grid.innerHTML = "";
            sub.textContent = SC.t("create.members", members.length);
            if (!members.length) { grid.append(el("p", { class: "mut", style: { padding: "16px 0" } }, SC.t("create.membersEmpty"))); return; }
            members.forEach((m, i) => {
              grid.append(el("div", { class: "pmember" },
                el("div", { class: "pmember-cover" }, m.coverUrl ? el("img", { src: m.coverUrl, loading: "lazy" }) : null),
                el("span", { class: "pmember-name" }, (m.meta && m.meta.title) || "—"),
                el("button", { class: "pmember-x", title: SC.t("common.remove"), onclick: () => { members.splice(i, 1); renderMembers(); } }, "×")));
            });
          }
          const addBtn = el("button", { class: "ghost-btn" });
          addBtn.innerHTML = `${icon("listplus", 14)}<span>${SC.t("create.addMembers")}</span>`;
          addBtn.addEventListener("click", () => openMemberPicker(members, renderMembers));
          box.append(el("div", { class: "row-between" }, el("span", { class: "pfield-label" }, SC.t("create.members", members.length)), addBtn), grid);
          renderMembers();
        }
      }
      render();

      saveBtn.addEventListener("click", async () => {
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
            saveBtn.textContent = SC.t("create.creating");
            const ok = await SC.createMediaWallpaper({
              title: title.trim(), file, previewEl,
              onProgress: (p) => { progress = p; saveBtn.textContent = SC.t("create.importing", p); },
            });
            if (ok) { SC.toast(SC.t("create.created"), "ok"); close(true); renderView(); }
            else saveBtn.textContent = SC.t("common.create");
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

      sheet.append(
        sheetHead(
          isEdit ? (playlistMode ? SC.t("create.editList") : SC.t("create.editWallpaper")) : (playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")),
          playlistMode ? SC.t("create.members", members.length) : SC.t("create.fileHint"),
          close),
        box, foot);
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  function isVideoName(name) { return /\.(mp4|webm|mkv|flv|blv|avi|mov|m4v)$/i.test(name || ""); }

  function openMemberPicker(members, onChanged) {
    const picked = new Set(members.map((m) => m.filePath));
    openDialog((sheet, close) => {
      const candidates = wallpapersCache.filter((w) => w.meta.type !== 6);
      const grid = el("div", { class: "pick-grid" });
      const allBox = el("input", { type: "checkbox" });
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
            el("div", { class: "pick-cover" }, w.coverUrl ? el("img", { src: w.coverUrl, loading: "lazy" }) : null),
            el("span", { class: "pick-mark" }, on ? "✓" : ""),
            el("span", { class: "pick-name" }, (w.meta && w.meta.title) || "—")));
        }
      }
      renderGrid(); syncAll();
      sheet.append(
        sheetHead(SC.t("create.pickTitle"), SC.t("create.pickHint"), close),
        el("div", { class: "sheet-body" },
          el("label", { class: "check-line" }, allBox, el("span", {}, SC.t("create.selectAll"))),
          grid),
        el("div", { class: "sheet-foot" },
          el("span", { class: "mut" }, SC.t("create.members", picked.size)),
          el("button", {
            class: "ink-btn",
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
      const box = el("div", { class: "sheet-body" });
      function rebuild() {
        box.innerHTML = "";
        if (type !== 6) {
          const dur = el("input", { class: "line-input line-time", type: "time", value: cur.duration || "" });
          dur.addEventListener("change", () => { cur.duration = dur.value || null; });
          box.append(fieldRow(SC.t("set.duration"), dur, SC.t("set.durationHint")));
        }
        if (type === 6) {
          box.append(fieldRow(SC.t("set.playMode"), selectEl([{ value: 0, label: SC.t("set.order") }, { value: 1, label: SC.t("set.random") }], cur.playMode, (v) => { cur.playMode = Number(v); })));
        }
        if (type === 4 || type === 5) {
          box.append(fieldRow(SC.t("set.mouse"), switchEl(cur.enableMouseEvent, (v) => { cur.enableMouseEvent = v; }), SC.t("set.mouseHint")));
        }
        if (type === 3) {
          box.append(fieldRow(SC.t("set.player"), selectEl([{ value: 0, label: SC.t("set.engine0") }, { value: 2, label: SC.t("set.engine2") }, { value: 1, label: SC.t("set.engine1") }], cur.videoPlayer, (v) => { cur.videoPlayer = Number(v); })));
          box.append(fieldRow(SC.t("set.hwdec"), switchEl(cur.hardwareDecoding, (v) => { cur.hardwareDecoding = v; }), SC.t("set.hwdecHint")));
          box.append(fieldRow(SC.t("set.panscan"), switchEl(cur.isPanScan, (v) => { cur.isPanScan = v; }), SC.t("set.panscanHint")));
        }
        if (type === 1) {
          box.append(fieldRow(SC.t("set.fit"), selectEl([0, 1, 2, 3, 4, 5].map((i) => ({ value: i, label: SC.t(`set.fit${i}`) })), cur.fit, (v) => { cur.fit = Number(v); })));
          box.append(fieldRow(SC.t("set.keep"), switchEl(cur.keepWallpaper, (v) => { cur.keepWallpaper = v; }), SC.t("set.keepHint")));
        }
      }
      rebuild();
      const saveBtn = el("button", { class: "ink-btn" }, SC.t("common.save"));
      saveBtn.addEventListener("click", async () => {
        if (await SC.saveWallpaperSetting(w, { ...cur })) close(true);
      });
      sheet.append(
        sheetHead(SC.t("set.title"), SC.t("set.sub", (w.meta && w.meta.title) || ""), close),
        box,
        el("div", { class: "sheet-foot" }, saveBtn));
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  // ---------------------------------------------------------------- 下载
  function renderDownloads() {
    viewEl.innerHTML = "";
    const dls = SC.state.downloads;
    const his = SC.state.history;
    const active = dls.filter((d) => d.isDownloading && !d.IsCanceled);

    viewEl.append(sectionHead("03", SC.t("dl.title"), "DOWNLOADS",
      his.length ? el("button", {
        class: "ghost-btn",
        onclick: () => SC.confirm({ title: SC.t("dl.clear"), body: SC.t("dl.clearConfirm"), danger: true }).then(async (ok) => { if (ok && await SC.clearHistory()) renderView(); }),
      }, SC.t("dl.clear")) : null));

    const actBox = el("div", { class: "pdl-list" });
    if (!active.length) actBox.append(el("p", { class: "mut pad-v" }, SC.t("dl.activeEmpty")));
    for (const d of active) {
      actBox.append(el("div", { class: "pdl-item" },
        el("div", { class: "row-between" },
          el("span", { class: "pdl-name" }, d.desc || d.id),
          el("span", { class: "mut" }, `${Math.round(d.percent || 0)}% · ${SC.fmtBytes(d.receivedBytes)} / ${SC.fmtBytes(d.totalBytes)}`)),
        el("div", { class: "pline-progress" }, el("i", { style: { width: `${Math.round(d.percent || 0)}%` } })),
        el("div", { class: "row-end" }, el("button", { class: "act-link", onclick: () => SC.cancelDownload(d.id) }, SC.t("dl.cancel")))));
    }

    const hisBox = el("div", { class: "phis-list" });
    if (!his.length) hisBox.append(el("p", { class: "mut pad-v" }, SC.t("dl.historyEmpty")));
    for (const h of his) {
      hisBox.append(el("div", { class: "phis-item" },
        el("div", { class: "phis-cover" }, h.coverUrl ? el("img", { src: h.coverUrl, loading: "lazy" }) : null),
        el("div", { class: "phis-main" },
          el("span", { class: "phis-name" }, h.title || h.id),
          el("span", { class: "mut" }, `${SC.fmtBytes(h.totalBytes)} · ${new Date(h.completedAt).toLocaleString()}`)),
        el("button", { class: "act-link", onclick: () => { if (!SC.demo && h.filePath) SC.client.api.explore(h.filePath); } }, SC.t("common.location")),
        el("button", { class: "act-link is-danger", onclick: async () => { await SC.removeHistory(h.id); renderView(); } }, SC.t("common.delete"))));
    }

    viewEl.append(
      el("h3", { class: "psub-head" }, SC.t("dl.active"), el("span", { class: "sec-no" }, ` (${active.length})`)),
      actBox,
      el("h3", { class: "psub-head" }, SC.t("dl.history"), el("span", { class: "sec-no" }, ` (${his.length})`)),
      hisBox);
  }

  // ---------------------------------------------------------------- 社区
  function renderHub() {
    viewEl.innerHTML = "";
    const url = SC.hubUrl(SC.state.hubTarget);
    viewEl.append(sectionHead("02", SC.t("hub.title"), "COMMUNITY"));
    const bar = el("div", { class: "hubbar" },
      el("button", { class: "ghost-btn", onclick: () => SC.communityLogin() }, ico("user", 14), SC.t("hub.login")),
      el("span", { class: "mut" }, SC.t("hub.loginHint")),
      el("span", { style: { flex: 1 } }),
      el("button", { class: "ghost-btn", onclick: () => { const f = viewEl.querySelector("iframe"); if (f) f.src = f.src; } }, ico("refresh", 14), SC.t("hub.reload")),
      el("button", { class: "ghost-btn", onclick: () => SC.openUrl(url) }, ico("external", 14), SC.t("hub.browser")));
    viewEl.append(bar, el("div", { class: "hubbox" }, el("iframe", { src: url, class: "hubframe", allow: "clipboard-write" })));
  }

  // ---------------------------------------------------------------- 设置
  let settingsTab = "general";
  function renderSettings() {
    viewEl.innerHTML = "";
    const tabs = [["general", SC.t("cfg.general")], ["wallpaper", SC.t("cfg.wallpaper")], ["appearance", SC.t("cfg.appearance")]];
    viewEl.append(sectionHead("04", SC.t("nav.settings"), "SETTINGS", SC.t("cfg.reloadHint")));
    const layout = el("div", { class: "cfg-layout" },
      el("aside", { class: "cfg-toc" }, tabs.map(([id, label], i) =>
        el("button", { class: `cfg-toc-item ${settingsTab === id ? "is-active" : ""}`, onclick: () => { settingsTab = id; renderSettings(); } },
          el("span", { class: "sec-no" }, `0${i + 1}`), label))),
      el("div", { class: "cfg-body", id: "cfg-body" }));
    viewEl.append(layout);
    const panel = layout.querySelector("#cfg-body");
    if (settingsTab === "general") generalTab(panel);
    else if (settingsTab === "wallpaper") wallpaperTab(panel);
    else appearanceTab(panel);
  }

  function generalTab(panel) {
    const g = SC.state.cfg.General;
    const row = (label, hint, control) => el("div", { class: "cfg-line" },
      el("div", {}, el("span", { class: "cfg-label" }, label), hint ? el("p", { class: "mut small" }, hint) : null), control);
    panel.append(
      row(SC.t("cfg.autoStart"), SC.t("cfg.autoStartHint"), switchEl(g.autoStart, (v) => { SC.saveConfig("General", { autoStart: v }); g.autoStart = v; })),
      row(SC.t("cfg.hideWindow"), SC.t("cfg.hideWindowHint"), switchEl(g.hideWindow, (v) => { SC.saveConfig("General", { hideWindow: v }); g.hideWindow = v; })),
      row(SC.t("cfg.headless"), SC.t("cfg.headlessHint"),
        (() => { const s = switchEl(g.autoStartHeadless, (v) => { SC.saveConfig("General", { autoStartHeadless: v }); g.autoStartHeadless = v; }); if (!g.autoStart) s.classList.add("is-disabled"); return s; })()),
      row(SC.t("cfg.language"), SC.t("cfg.langHint"),
        selectEl([{ value: "zh", label: "中文" }, { value: "en", label: "English" }, { value: "ru", label: "Русский" }, { value: "es", label: "Español" }], g.currentLan, (v) => SC.setLang(v))),
      row(SC.t("cfg.contribute"), "",
        el("button", { class: "ghost-btn", onclick: () => SC.openUrl("https://github.com/GiantappMan/livewallpaper/tree/v4.x/src/giantapp-wallpaper-ui/src/dictionaries") }, ico("external", 13))));
  }

  function wallpaperTab(panel) {
    const c = SC.state.cfg.Wallpaper;
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
        const input = el("input", { class: "line-input", type: "text", placeholder: i === 0 ? SC.t("cfg.dirsHint") : "", value: d });
        input.addEventListener("change", persistDirs);
        const browse = el("button", {
          class: "ghost-btn",
          onclick: async () => {
            if (SC.demo) { input.value = `D:\\Wallpapers\\demo-${dirs.length}`; persistDirs(); return; }
            const res = await SC.client.shell.showFolderDialog();
            if (res && res.data) { input.value = res.data; persistDirs(); }
          },
        }, SC.t("cfg.choose"));
        const del = el("button", { class: "act-link is-danger", onclick: () => { dirs.splice(i, 1); if (!dirs.length) dirs.push(""); renderDirs(); persistDirs(); } }, SC.t("common.delete"));
        dirBox.append(el("div", { class: "dir-line" }, input, browse, del));
      });
    }
    renderDirs();
    panel.append(
      el("div", { class: "cfg-block" },
        el("div", { class: "cfg-line" }, el("span", { class: "cfg-label" }, SC.t("cfg.dirs"))),
        dirBox,
        el("div", { class: "row-end" }, el("button", { class: "ghost-btn", onclick: () => { dirs.push(""); renderDirs(); } }, ico("plus", 13), SC.t("cfg.addDir")))),
      el("div", { class: "cfg-block" },
        fieldRow(SC.t("cfg.covered"), selectEl([{ value: 0, label: SC.t("cfg.covered0") }, { value: 1, label: SC.t("cfg.covered1") }, { value: 2, label: SC.t("cfg.covered2") }], c.coveredBehavior, (v) => { c.coveredBehavior = Number(v); SC.saveConfig("Wallpaper", { coveredBehavior: Number(v) }); })),
        el("div", { class: "rule" }),
        fieldRow(SC.t("cfg.player"), selectEl([{ value: 2, label: SC.t("set.engine2") }, { value: 1, label: SC.t("set.engine1") }], c.defaultVideoPlayer, (v) => { c.defaultVideoPlayer = Number(v); SC.saveConfig("Wallpaper", { defaultVideoPlayer: Number(v) }); syncMpv(); }))));
    // MPV 下载提示仅在默认引擎选中 MPV 时展示
    const mpvBox = mpvBlock();
    function syncMpv() { mpvBox.style.display = c.defaultVideoPlayer === 1 ? "" : "none"; }
    panel.append(mpvBox);
    syncMpv();
  }

  function mpvBlock() {
    const box = el("div", { class: "mpv-line" });
    let downloading = false;
    async function render() {
      const st = await SC.mpvStatus();
      box.innerHTML = "";
      if (!st) return;
      if (!st.available && !downloading) {
        box.append(el("span", { class: "mut" }, SC.t("cfg.mpvMissing")),
          el("button", { class: "ghost-btn", onclick: () => { SC.mpvDownload(); downloading = true; render(); } }, SC.t("cfg.mpvDownload")));
      } else if (downloading) {
        const pct = el("span", { class: "mut" }, SC.t("cfg.mpvProgress", 0));
        box.append(pct, el("button", { class: "ghost-btn", onclick: async () => { await SC.mpvCancel(); downloading = false; render(); } }, SC.t("cfg.mpvCancel")));
        SC.onMpvEvent((e) => {
          if (e.state === "progress") pct.textContent = SC.t("cfg.mpvProgress", Math.round(e.percent || 0));
          else if (e.state === "done") { downloading = false; SC.toast(SC.t("cfg.mpvDone"), "ok"); render(); }
          else if (e.state === "error") { downloading = false; SC.toast(SC.t("cfg.mpvFail", e.message || ""), "err"); render(); }
        });
      }
      box.append(el("button", { class: "ghost-btn", onclick: () => SC.mpvFolder() }, SC.t("cfg.mpvFolder")));
    }
    render();
    return box;
  }

  async function appearanceTab(panel) {
    const a = SC.state.cfg.Appearance;
    const modeWrap = el("div", { class: "pseg" });
    const modes = [["system", "cfg.modeSys"], ["light", "cfg.modeLight"], ["dark", "cfg.modeDark"]];
    function renderModes() {
      modeWrap.innerHTML = "";
      const cur = a.mode || "system";
      for (const [val, key] of modes) {
        modeWrap.append(el("button", {
          class: `pseg-item ${cur === val ? "is-active" : ""}`,
          onclick: async () => { await SC.setMode(val); a.mode = val; renderModes(); updateModeBtn(); },
        }, SC.t(key)));
      }
    }
    renderModes();

    const skins = await SC.listSkins();
    const grid = el("div", { class: "pskin-list" });
    for (const s of skins) {
      const current = s.id === a.skin || (SC.demo && s.id === SC.meta.id);
      grid.append(el("button", {
        class: `pskin ${current ? "is-current" : ""} ${s.valid === false ? "is-invalid" : ""}`,
        title: s.valid === false ? (s.invalidReason || "") : (s.description || ""),
        onclick: async () => {
          if (s.valid === false || current) return;
          if (await SC.applySkin(s.id)) { SC.toast(SC.t("cfg.skinApplied", s.name), "ok"); a.skin = s.id; }
        },
      },
        el("div", {},
          el("span", { class: "pskin-name" }, s.name || s.id),
          el("span", { class: "mut small" }, ` ${s.type === "style" ? "CSS" : "App"} · v${s.version || "?"} · ${s.author || ""}`),
          s.valid === false ? el("span", { class: "pskin-invalid" }, SC.t("cfg.skinInvalid")) : null),
        current ? el("span", { class: "pskin-cur" }, SC.t("cfg.skinCurrent")) : null));
    }

    panel.append(
      el("div", { class: "cfg-block" }, el("div", { class: "cfg-line" }, el("span", { class: "cfg-label" }, SC.t("cfg.mode")), modeWrap)),
      el("div", { class: "cfg-block" },
        el("div", { class: "cfg-line" },
          el("div", {}, el("span", { class: "cfg-label" }, SC.t("cfg.skins")), el("p", { class: "mut small" }, SC.t("cfg.skinHint"))),
          el("button", { class: "ghost-btn", onclick: () => SC.openSkinsFolder() }, SC.t("cfg.skinOpen"))),
        grid));
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
    viewEl.append(sectionHead("05", SC.t("about.title"), "COLOPHON"),
      el("div", { class: "about-hero" },
        el("span", { class: "seal-big" }, "巨"),
        el("div", {},
          el("h2", { class: "about-name" }, SC.meta.brand),
          el("p", { class: "mut" }, `v${SC.meta.version} · ${SC.t("about.author", "巨应君")} · ${SC.t("about.skinBy")}`))),
      el("div", { class: "plist" }, links.map(([ic, label, act]) =>
        el("button", { class: "plist-row", onclick: act },
          el("span", { class: "plist-ico" }, ico(ic, 15)),
          el("span", {}, label),
          el("span", { class: "plist-arrow" }, "→")))),
      el("div", { class: "about-foot" },
        el("button", { class: "ghost-btn", onclick: () => SC.openLogs() }, SC.t("about.logs")),
        el("button", {
          class: "ghost-btn is-danger",
          onclick: () => SC.confirm({ title: SC.t("about.exit"), body: SC.t("about.exitConfirm"), danger: true }).then((ok) => { if (ok) SC.exitApp(); }),
        }, SC.t("about.exit"))));
  }

  // ---------------------------------------------------------------- 刊脚播放条
  let focusIdx = 0;
  let dragging = false;
  let dragPos = 0;
  let lastTime = { position: 0, duration: 0 };

  function renderStrip() {
    const st = SC.state.status;
    const playing = st ? st.wallpapers : [];
    stripEl.innerHTML = "";
    if (!playing.length) {
      stripEl.append(el("div", { class: "strip-idle" },
        el("span", { class: "mut" }, SC.t("dock.nothing")), el("span", { class: "mut" }, " · " + SC.t("dock.nothingHint"))));
      return;
    }
    if (focusIdx >= playing.length) focusIdx = 0;
    const w = playing[focusIdx];
    const paused = !!(w.runningInfo && w.runningInfo.isPaused);
    const isList = w.meta && w.meta.type === 6;
    const pl = playing.length > 1;

    const thumb = el("button", { class: "strip-thumb", title: pl ? SC.t("dock.focus") : "", onclick: () => { focusIdx = (focusIdx + 1) % playing.length; renderStrip(); } },
      w.coverUrl ? el("img", { src: bust(w.coverUrl) }) : null);

    const ctrl = el("div", { class: "strip-ctrl" });
    const glyph = (txt, title, act) => el("button", { class: "glyph-btn", title, onclick: act }, txt);
    if (isList) ctrl.append(glyph("◧", SC.t("dock.prev"), () => SC.prevIn(w)));
    if (SC.canPause(w)) {
      ctrl.append(glyph(paused ? "▶" : "⏸", paused ? SC.t("dock.resume") : SC.t("dock.pause"), () => {
        const idx = SC.screenIndexOf(w);
        paused ? SC.resume(idx) : SC.pause(idx);
      }));
    }
    ctrl.append(glyph("■", SC.t("dock.stop"), async () => { await SC.stop(SC.screenIndexOf(w)); focusIdx = 0; }));
    if (isList) ctrl.append(glyph("◨", SC.t("dock.next"), () => SC.nextIn(w)));

    const showProgress = w.meta && (w.meta.type === 3 || w.meta.type === 6);
    const cur = dragging ? dragPos : lastTime.position;
    const dur = lastTime.duration || 0;
    const time = el("span", { class: "strip-time" }, showProgress ? `${SC.fmtTime(cur)} / ${SC.fmtTime(dur)}` : "∞");

    SC.onTime((tp) => {
      if (tp) lastTime = tp; else lastTime = { position: 0, duration: 0 };
      if (!dragging) {
        time.textContent = showProgress ? `${SC.fmtTime(lastTime.position)} / ${SC.fmtTime(lastTime.duration)}` : "∞";
        line.style.width = showProgress && lastTime.duration ? `${Math.min(100, (lastTime.position / lastTime.duration) * 100)}%` : (showProgress ? "0%" : "100%");
      }
    });

    // 进度线（点击/拖动 seek）
    const line = el("i", { class: "strip-line-fill" });
    line.style.width = showProgress && dur ? `${Math.min(100, (cur / dur) * 100)}%` : (showProgress ? "0%" : "100%");
    const lineBox = el("div", { class: "strip-line" }, line);
    lineBox.addEventListener("mousedown", (e) => {
      if (!showProgress || !lastTime.duration) return;
      dragging = true;
      const move = (ev) => {
        const r = lineBox.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        dragPos = lastTime.duration * frac;
        line.style.width = `${frac * 100}%`;
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

    // 音量
    const volume = st.volume || 0;
    const volGlyph = el("button", { class: "glyph-btn", title: SC.t("dock.volume") }, volume === 0 ? "🔇" : volume <= 50 ? "🔉" : "🔊");
    const volPop = el("div", { class: "vol-flyout" },
      el("input", { type: "range", min: 0, max: 100, value: volume }),
      el("span", { class: "vol-num" }, String(volume)));
    const doSetVol = SC.debounce((v) => SC.setVolume(v, st.audioScreenIndex < 0 ? -1 : st.audioScreenIndex), 250);
    volPop.querySelector("input").addEventListener("input", (e) => {
      volPop.querySelector(".vol-num").textContent = e.target.value;
      doSetVol(Number(e.target.value));
    });
    volGlyph.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = volPop.classList.contains("is-open");
      document.querySelectorAll(".vol-flyout").forEach((n) => n.classList.remove("is-open"));
      if (!open) volPop.classList.add("is-open");
    });
    window.addEventListener("click", () => volPop.classList.remove("is-open"));

    // 音源
    const audioBtn = el("button", { class: "glyph-btn text", title: SC.t("dock.audio") }, st.audioScreenIndex < 0 ? "🔇" : `♪${st.audioScreenIndex}`);
    audioBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openMenuAt(e.clientX - 60, e.clientY - 40 - SC.state.screens.length * 34,
        SC.state.screens.map((s) => ({ label: SC.t("common.screen", s.deviceName || s.index), act: () => SC.setVolume(Math.max(volume, 30), s.index) }))
          .concat([{ label: SC.t("dock.mute"), act: () => SC.setVolume(0, -1) }]));
    });

    stripEl.append(el("div", { class: "strip-inner" },
      thumb,
      el("div", { class: "strip-meta" },
        el("span", { class: "strip-name" }, (w.meta && w.meta.title) || "—"),
        el("span", { class: "strip-sub" }, `${SC.typeName(w.meta && w.meta.type)}${pl ? ` · ${focusIdx + 1}/${playing.length}` : ""} · ${paused ? SC.t("common.paused") : SC.t("common.playing")}`)),
      ctrl, time, volPop, volGlyph, audioBtn),
      lineBox);
  }

  // ---------------------------------------------------------------- 调度
  function renderView() {
    closeMenu();
    if (currentView === "library") renderLibrary();
    else if (currentView === "downloads") renderDownloads();
    else if (currentView === "hub") renderHub();
    else if (currentView === "settings") renderSettings();
    else if (currentView === "about") renderAbout();
    renderStrip();
  }

  SC.on("wallpapers", () => { if (currentView === "library") renderView(); });
  SC.on("status", () => {
    if (currentView === "library") {
      const playing = SC.playingSet();
      viewEl.querySelectorAll(".pcard").forEach((c) => c.classList.toggle("is-playing", playing.has(c.dataset.path)));
    }
    renderStrip();
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
  SC.on("lang", () => { buildMasthead(); renderView(); });
  SC.on("mode", () => { updateModeBtn(); renderStrip(); });
  SC.on("nav", (p) => { if (p && p.view) go(p.view); });
  SC.on("hub-session", () => { if (currentView === "hub") renderHub(); });
  SC.on("skins", () => { if (currentView === "settings" && settingsTab === "appearance") renderSettings(); });

  // ---------------------------------------------------------------- 启动
  if (SC.demo) document.body.append(el("div", { class: "demo-flag", title: SC.t("common.demoHint") }, SC.t("common.demo")));
  buildMasthead();
  document.body.append(viewEl, stripEl);
  const initial = location.hash.replace(/^#\//, "");
  if (NAV.some((n) => n.id === initial)) currentView = initial;
  SC.boot(() => {
    wallpapersCache = SC.state.wallpapers;
    SC.on("wallpapers", (list) => { wallpapersCache = list || SC.state.wallpapers; });
    masthead.querySelectorAll(".mast-link").forEach((n) => n.classList.toggle("is-active", n.dataset.view === currentView));
    renderView();
  });
})();
