/**
 * 终端 Term · app.js
 * 单色荧光 HUD 极客风：tmux 状态栏 + 边框面板 + 命令面板(:) + 键盘驱动。
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

  // ---------------------------------------------------------------- 图标（极少用，主要靠字符）
  const I = {
    play: '<polygon points="8 5 19 12 8 19 8 5"/>',
    pause: '<line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6.5 9.5 17 4.5 12"/>',
    external: '<path d="M18 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h5"/><polyline points="14.5 3.5 20.5 3.5 20.5 9.5"/><line x1="10.5" y1="13.5" x2="20.5" y2="3.5"/>',
    refresh: '<polyline points="21.5 5 21.5 10.5 16 10.5"/><path d="M19.4 15a7.9 7.9 0 1 1-1.6-8.5l3.7 3.5"/>',
  };
  function icon(name, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 15}" height="${size || 15}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`;
  }
  // 作为 DOM 子节点用的图标（icon() 返回字符串，直接传给 el() 会被当文本）
  function ico(name, size) {
    const s = el("span", { style: { display: "inline-flex" } });
    s.innerHTML = icon(name, size);
    return s;
  }

  // ---------------------------------------------------------------- 壳
  let currentView = "library";
  let viewEl = el("main", { class: "tmain", id: "tmain" });
  let topbarEl = null;
  let statusEl = null;
  let miniEl = null;
  let cmdEl = null; // 命令面板

  const NAV = [
    { id: "library", key: "1", label: "LIB" },
    { id: "hub", key: "2", label: "HUB" },
    { id: "downloads", key: "3", label: "DL" },
    { id: "settings", key: "4", label: "SET" },
    { id: "about", key: "5", label: "ABI" },
  ];
  let dlBadgeEl = null;

  function buildTopbar() {
    if (topbarEl) topbarEl.remove();
    topbarEl = el("header", { class: "ttop", "data-tauri-drag-region": true },
      el("span", { class: "tt-session", "data-tauri-drag-region": true, ondblclick: () => { if (SC.client) SC.client.win.toggleMaximize(); } }, `▮ ${SC.meta.brand}`),
      el("nav", { class: "tt-nav" },
        NAV.map((n) => el("button", {
          class: `tt-tab ${currentView === n.id ? "is-active" : ""}`,
          dataset: { view: n.id },
          onclick: () => go(n.id),
          title: `${SC.t("nav." + n.id)} [${n.key}]`,
        }, `${n.key}:${n.label}`, n.id === "downloads" ? (dlBadgeEl = el("span", { class: "tt-badge", hidden: true })) : null))),
      el("span", { class: "tt-right", id: "tt-right" }));
    document.body.prepend(topbarEl);
    updateTopRight();
  }
  function updateTopRight() {
    const box = topbarEl && topbarEl.querySelector("#tt-right");
    if (!box) return;
    const st = SC.state.status;
    const n = SC.state.downloads.filter((d) => d.isDownloading && !d.IsCanceled).length;
    box.innerHTML = "";
    box.append(
      el("span", { class: "tt-stat" }, `屏:${st ? st.screens.length : "-"} `),
      el("span", { class: "tt-stat" }, `♪:${st ? st.volume : "-"}% `),
      n ? el("span", { class: "tt-stat is-warn" }, `⇣${n} `) : null,
      el("span", { class: "tt-stat", id: "tt-clock" }, nowStr()));
    if (dlBadgeEl) {
      dlBadgeEl.hidden = n === 0;
      dlBadgeEl.textContent = String(n > 99 ? "99+" : n);
    }
  }
  function nowStr() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  setInterval(() => {
    const c = document.getElementById("tt-clock");
    if (c) c.textContent = nowStr();
  }, 1000);

  function buildStatusLine() {
    if (statusEl) statusEl.remove();
    statusEl = el("footer", { class: "tstatus" },
      el("span", { class: "ts-mode" }, document.documentElement.dataset.mode === "light" ? "LIGHT" : "TERM"),
      el("span", { class: "ts-hints" },
        "[1-5]视图 [j/k]选择 [Enter]应用 [s]设置 [e]编辑 [d]删除 [o]位置 [:]命令"),
      el("span", { class: "ts-event", id: "ts-event" }, ""));
    document.body.append(statusEl);
  }
  let lastEventName = "";
  function markEvent(name) {
    lastEventName = name;
    const box = document.getElementById("ts-event");
    if (box) box.textContent = `⇢ ${name} ${nowStr()}`;
  }

  function go(view) {
    currentView = view;
    location.hash = `#/${view}`;
    topbarEl.querySelectorAll(".tt-tab").forEach((n) => n.classList.toggle("is-active", n.dataset.view === view));
    renderView();
  }
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace(/^#\//, "") || "library";
    if (id !== currentView && NAV.some((n) => n.id === id)) go(id);
  });

  // ---------------------------------------------------------------- 通用部件
  function pane(title, sub) {
    return el("div", { class: "tpane" },
      el("div", { class: "tpane-head" },
        el("span", { class: "tpane-title" }, `┤ ${title} ├`),
        sub ? el("span", { class: "tpane-sub" }, sub) : null));
  }

  function barAscii(pct, width) {
    const w = width || 16;
    const filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * w);
    return "▰".repeat(filled) + "▱".repeat(w - filled);
  }

  function checkboxEl(checked, onchange, label) {
    const input = el("input", { type: "checkbox" });
    input.checked = !!checked;
    if (onchange) input.addEventListener("change", () => onchange(input.checked));
    return el("label", { class: "tcheck" }, input, el("span", { class: "tcheck-box" }, "✔"), label ? el("span", {}, label) : null);
  }

  function selectEl(options, value, onchange) {
    const sel = el("select", { class: "tsel" });
    for (const o of options) sel.append(el("option", { value: String(o.value) }, o.label));
    sel.value = String(value);
    sel.addEventListener("change", () => onchange && onchange(sel.value));
    return sel;
  }

  // ---------------------------------------------------------------- 弹窗
  function openDialog(build, opts) {
    opts = opts || {};
    const box = el("div", { class: "tdialog" });
    const overlay = el("div", { class: "tdialog-veil" }, box);
    let closed = false;
    async function close(force) {
      if (closed) return;
      if (!force && opts.beforeClose) { const ok = await opts.beforeClose(); if (!ok) return; }
      closed = true;
      overlay.remove();
      window.removeEventListener("keydown", esc, true);
    }
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    window.addEventListener("keydown", esc, true);
    document.body.append(overlay);
    build(box, close);
    const first = box.querySelector("input, select, textarea, button");
    if (first) first.focus();
    return { close };
  }
  function dlgHead(title, close) {
    return el("div", { class: "tdlg-head" },
      el("span", { class: "tpane-title" }, `┤ ${title} ├`),
      el("button", { class: "tbtn", onclick: () => close() }, "[x]"));
  }

  // ---------------------------------------------------------------- 壁纸库
  let wallpapersCache = [];
  let applyTarget = -1;
  let searchQuery = "";
  let focusPath = null;

  function renderLibrary() {
    viewEl.innerHTML = "";
    const all = wallpapersCache;
    const screens = SC.state.screens;
    const playing = SC.playingSet();

    const head = pane(`${SC.t("lib.title")} LIBRARY`, `${all.length} items`);
    const tool = el("div", { class: "ttool" },
      el("span", { class: "mut" }, SC.t("lib.target") + ":"),
      selectEl(
        [{ value: -1, label: SC.t("common.allScreens") }].concat(screens.map((s) => ({ value: s.index, label: `#${s.index} ${s.deviceName || ""}` }))),
        applyTarget, (v) => { applyTarget = Number(v); }),
      el("input", { class: "tinput", type: "search", placeholder: "/ " + SC.t("lib.search"), value: searchQuery }),
      el("button", { class: "tbtn is-primary", onclick: () => openWallpaperDialog(null) }, `[+] ${SC.t("create.wallpaper")}`),
      el("button", { class: "tbtn", onclick: () => openWallpaperDialog({ playlist: true }) }, `[+] ${SC.t("create.playlist")}`));
    head.append(tool);
    viewEl.append(head);

    const grid = el("div", { class: "tgrid" });
    viewEl.append(grid);
    const statusTable = el("div", { class: "tscr" });
    viewEl.append(statusTable);

    function renderGrid() {
      grid.innerHTML = "";
      const q = searchQuery.trim().toLowerCase();
      const items = q ? all.filter((w) => ((w.meta && w.meta.title) || "").toLowerCase().includes(q) || (w.fileName || "").toLowerCase().includes(q)) : all;
      if (!items.length) {
        grid.append(el("div", { class: "tempty" }, `// ${SC.t("lib.empty")} -- ${SC.t("lib.emptyHint")}`));
        return;
      }
      for (const w of items) {
        const isPlaying = playing.has(w.filePath);
        const isSel = focusPath && focusPath === w.filePath;
        const card = el("button", {
          class: `tcard ${isPlaying ? "is-playing" : ""} ${isSel ? "is-sel" : ""}`,
          dataset: { path: w.filePath || "" },
          onclick: () => { focusPath = w.filePath; SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]); },
          oncontextmenu: (e) => { e.preventDefault(); cardMenu(e.clientX, e.clientY, w); },
        },
          el("div", { class: "tcard-cover" },
            (w.coverUrl || w.fileUrl) ? el("img", { src: bust(w.coverUrl || w.fileUrl), loading: "lazy" }) : null,
            isPlaying ? el("span", { class: "tcard-live" }, "▶ LIVE") : null,
            screens.length > 1 ? el("span", { class: "tcard-screens" },
              el("button", { title: SC.t("common.allScreens"), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, []); } }, "ALL"),
              screens.map((s) => el("button", { title: SC.t("common.screen", s.deviceName || s.index), onclick: (e) => { e.stopPropagation(); SC.applyWallpaper(w, [s.index]); } }, `#${s.index}`))) : null),
          el("div", { class: "tcard-meta" },
            el("span", { class: "tcard-tag" }, `[${(SC.typeName(w.meta && w.meta.type) || "?").toUpperCase()}]`),
            el("span", { class: "tcard-name" }, (w.meta && w.meta.title) || "—")));
        grid.append(card);
      }
    }
    function renderScrTable() {
      const st = SC.state.status;
      statusTable.innerHTML = "";
      if (!st) return;
      statusTable.append(pane(SC.t("dock.focus") + " / SCREENS", ""));
      const rows = el("div", { class: "tscr-rows" });
      for (const s of st.screens) {
        const w = st.wallpapers.find((x) => (x.runningInfo.screenIndexes || []).includes(s.index));
        rows.append(el("div", { class: "tscr-row" },
          el("span", { class: "tcard-tag" }, `SCR#${s.index}${s.primary ? "*" : ""}`),
          el("span", { class: "mut" }, s.bounds || ""),
          el("span", { class: w ? "" : "mut" }, w ? `${w.meta.title || "?"} [${w.runningInfo.isPaused ? SC.t("common.paused") : SC.t("common.playing")}]` : `-- ${SC.t("common.idle")} --`)));
      }
      statusTable.append(rows);
    }

    const searchInput = tool.querySelector("input");
    searchInput.addEventListener("input", SC.debounce(() => { searchQuery = searchInput.value; renderGrid(); }, 120));

    renderGrid();
    renderScrTable();

    viewEl.addEventListener("dragover", (e) => e.preventDefault());
    viewEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) openWallpaperDialog(null, f);
    });
  }

  function cardMenu(x, y, w) {
    openMenuAt(x, y, [
      { label: `[${SC.t("common.apply")}]`, act: () => SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]) },
      { label: `[${SC.t("nav.settings")}]`, act: () => openSettingDialog(w) },
      { label: `[${SC.t("common.edit")}]`, act: () => openWallpaperDialog(w) },
      { label: `[${SC.t("common.location")}]`, act: () => SC.reveal(w) },
      { label: `[${SC.t("common.delete")}]`, act: () => removeWallpaper(w), danger: true },
    ]);
  }
  let menuEl = null;
  function openMenuAt(x, y, items) {
    closeMenu();
    menuEl = el("div", { class: "tmenu" }, items.map((it) =>
      el("button", { class: `tmenu-item ${it.danger ? "is-danger" : ""}`, onclick: () => { closeMenu(); it.act(); } }, it.label)));
    document.body.append(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = `${Math.min(x, window.innerWidth - r.width - 8)}px`;
    menuEl.style.top = `${Math.min(y, window.innerHeight - r.height - 8)}px`;
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

    openDialog((box, close) => {
      const bodyEl = el("div", { class: "tdlg-body" });
      const foot = el("div", { class: "tdlg-foot" });
      const okBtn = el("button", { class: "tbtn is-primary" }, isEdit ? `[${SC.t("common.save")}]` : `[${SC.t("common.create")}]`);
      foot.append(el("span", { class: "mut", id: "dlg-hint" }, mode === "wall" && file ? `${file.name || ""}` : ""), okBtn);

      function render() {
        bodyEl.innerHTML = "";
        const titleInput = el("input", { class: "tinput is-block", type: "text", placeholder: SC.t("create.titleField"), value: title });
        titleInput.addEventListener("input", () => { title = titleInput.value; });
        bodyEl.append(el("div", { class: "tfield" }, el("span", { class: "mut" }, SC.t("create.titleField")), titleInput));
        if (mode === "wall") {
          const zone = el("div", { class: "tdrop" });
          function renderZone() {
            zone.innerHTML = "";
            if (previewEl || (fileUrl && !file)) {
              const media = previewEl || (isVideoName(fileUrl) ? el("video", { src: fileUrl, autoplay: true, loop: true, muted: true, playsinline: true }) : el("img", { src: fileUrl }));
              if (!previewEl) {
                media.addEventListener("loadeddata", () => { previewEl = media; });
                media.addEventListener("load", () => { previewEl = media; });
              }
              previewEl = previewEl || media;
              zone.append(media, el("button", { class: "tbtn drop-re", onclick: (e) => { e.stopPropagation(); file = null; previewEl = null; fileUrl = ""; picker.click(); } }, `[${SC.t("create.reselect")}]`));
            } else {
              zone.append(el("span", { class: "tdrop-ico" }, "⬒"), el("span", {}, SC.t("create.file")), el("span", { class: "mut" }, SC.t("create.fileHint")));
            }
            zone.classList.toggle("is-filled", !!(previewEl || fileUrl));
            if (progress >= 0 && progress < 100) zone.append(el("div", { class: "mut" }, SC.t("create.importing", progress)));
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
            const hint = foot.querySelector("#dlg-hint");
            if (hint) hint.textContent = f.name;
          });
          zone.addEventListener("click", () => picker.click());
          zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-over"); });
          zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
          zone.addEventListener("drop", (e) => {
            e.preventDefault(); zone.classList.remove("is-over");
            if (e.dataTransfer.files[0]) { picker.files = e.dataTransfer.files; picker.dispatchEvent(new Event("change")); }
          });
          bodyEl.append(zone, picker);
        } else {
          const grid = el("div", { class: "tmember-grid" });
          function renderMembers() {
            grid.innerHTML = "";
            if (!members.length) { grid.append(el("span", { class: "mut" }, SC.t("create.membersEmpty"))); return; }
            members.forEach((m, i) => {
              grid.append(el("span", { class: "tmember" },
                el("span", { class: "tmember-cover" }, m.coverUrl ? el("img", { src: m.coverUrl }) : null),
                el("span", { class: "tmember-name" }, (m.meta && m.meta.title) || "—"),
                el("button", { class: "tbtn", onclick: () => { members.splice(i, 1); renderMembers(); } }, "[x]")));
            });
          }
          const addBtn = el("button", { class: "tbtn", onclick: () => openMemberPicker(members, renderMembers) }, `[+] ${SC.t("create.addMembers")}`);
          bodyEl.append(el("div", { class: "trow" }, el("span", { class: "mut" }, SC.t("create.members", members.length)), addBtn), grid);
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
            okBtn.textContent = SC.t("create.creating");
            const ok = await SC.createMediaWallpaper({
              title: title.trim(), file, previewEl,
              onProgress: (p) => { progress = p; okBtn.textContent = `[${SC.t("create.importing", p)}]`; },
            });
            if (ok) { SC.toast(SC.t("create.created"), "ok"); close(true); renderView(); }
            else okBtn.textContent = `[${SC.t("common.create")}]`;
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

      box.append(
        dlgHead(isEdit ? (playlistMode ? SC.t("create.editList") : SC.t("create.editWallpaper")) : (playlistMode ? SC.t("create.playlist") : SC.t("create.wallpaper")), close),
        bodyEl, foot);
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  function isVideoName(name) { return /\.(mp4|webm|mkv|flv|blv|avi|mov|m4v)$/i.test(name || ""); }

  function openMemberPicker(members, onChanged) {
    const picked = new Set(members.map((m) => m.filePath));
    openDialog((box, close) => {
      const candidates = wallpapersCache.filter((w) => w.meta.type !== 6);
      const grid = el("div", { class: "tpick-grid" });
      const allBtn = el("button", { class: "tbtn", onclick: () => {
        const allOn = candidates.every((c) => picked.has(c.filePath));
        if (allOn) candidates.forEach((c) => picked.delete(c.filePath));
        else candidates.forEach((c) => picked.add(c.filePath));
        renderGrid();
      } }, `[${SC.t("create.selectAll")}]`);
      function renderGrid() {
        grid.innerHTML = "";
        for (const w of candidates) {
          const on = picked.has(w.filePath);
          grid.append(el("button", { class: `tpick ${on ? "is-on" : ""}`, onclick: () => { on ? picked.delete(w.filePath) : picked.add(w.filePath); renderGrid(); } },
            el("span", { class: "tpick-cover" }, w.coverUrl ? el("img", { src: w.coverUrl, loading: "lazy" }) : null, on ? el("span", { class: "tpick-mark" }, ico("check", 12)) : null),
            el("span", { class: "tpick-name" }, (w.meta && w.meta.title) || "—")));
        }
      }
      renderGrid();
      box.append(
        dlgHead(SC.t("create.pickTitle"), close),
        el("div", { class: "tdlg-body" }, el("div", { class: "trow" }, allBtn, el("span", { class: "mut" }, SC.t("create.pickHint"))), grid),
        el("div", { class: "tdlg-foot" },
          el("span", { class: "mut" }, SC.t("create.members", picked.size)),
          el("button", {
            class: "tbtn is-primary",
            onclick: () => {
              members.length = 0;
              for (const w of wallpapersCache) if (picked.has(w.filePath)) members.push(w);
              close(true); onChanged && onChanged();
            },
          }, `[${SC.t("common.ok")}]`)));
    });
  }

  // ---------------------------------------------------------------- 单壁纸设置
  function openSettingDialog(w) {
    const s0 = w.setting || SC.defaultSetting();
    const type = w.meta.type;
    const cur = { ...s0 };
    const dirty = () => JSON.stringify(cur) !== JSON.stringify(s0);
    openDialog((box, close) => {
      const bodyEl = el("div", { class: "tdlg-body" });
      function rebuild() {
        bodyEl.innerHTML = "";
        if (type !== 6) {
          const dur = el("input", { class: "tinput", type: "time", value: cur.duration || "" });
          dur.addEventListener("change", () => { cur.duration = dur.value || null; });
          bodyEl.append(tfield(SC.t("set.duration"), dur, SC.t("set.durationHint")));
        }
        if (type === 6) {
          bodyEl.append(tfield(SC.t("set.playMode"), selectEl([{ value: 0, label: SC.t("set.order") }, { value: 1, label: SC.t("set.random") }], cur.playMode, (v) => { cur.playMode = Number(v); })));
        }
        if (type === 4 || type === 5) {
          bodyEl.append(tfield(SC.t("set.mouse"), checkboxEl(cur.enableMouseEvent, (v) => { cur.enableMouseEvent = v; }), SC.t("set.mouseHint")));
        }
        if (type === 3) {
          bodyEl.append(tfield(SC.t("set.player"), selectEl([{ value: 0, label: SC.t("set.engine0") }, { value: 1, label: SC.t("set.engine1") }, { value: 2, label: SC.t("set.engine2") }], cur.videoPlayer, (v) => { cur.videoPlayer = Number(v); })));
          bodyEl.append(tfield(SC.t("set.hwdec"), checkboxEl(cur.hardwareDecoding, (v) => { cur.hardwareDecoding = v; }), SC.t("set.hwdecHint")));
          bodyEl.append(tfield(SC.t("set.panscan"), checkboxEl(cur.isPanScan, (v) => { cur.isPanScan = v; }), SC.t("set.panscanHint")));
        }
        if (type === 1) {
          bodyEl.append(tfield(SC.t("set.fit"), selectEl([0, 1, 2, 3, 4, 5].map((i) => ({ value: i, label: SC.t(`set.fit${i}`) })), cur.fit, (v) => { cur.fit = Number(v); })));
          bodyEl.append(tfield(SC.t("set.keep"), checkboxEl(cur.keepWallpaper, (v) => { cur.keepWallpaper = v; }), SC.t("set.keepHint")));
        }
      }
      function tfield(label, control, hint) {
        return el("div", { class: "tfield-row" }, el("span", { class: "tfield-label" }, label), control, hint ? el("span", { class: "mut tfield-hint" }, hint) : el("span", { class: "tfield-hint" }));
      }
      rebuild();
      const saveBtn = el("button", { class: "tbtn is-primary" }, `[${SC.t("common.save")}]`);
      saveBtn.addEventListener("click", async () => { if (await SC.saveWallpaperSetting(w, { ...cur })) close(true); });
      box.append(dlgHead(SC.t("set.title") + ` — ${(w.meta && w.meta.title) || ""}`, close), bodyEl,
        el("div", { class: "tdlg-foot" }, saveBtn));
    }, { beforeClose: async () => !dirty() || await SC.confirm({ title: SC.t("create.unsaved"), body: SC.t("create.unsavedBody"), danger: true }) });
  }

  // ---------------------------------------------------------------- 下载
  function renderDownloads() {
    viewEl.innerHTML = "";
    const dls = SC.state.downloads;
    const his = SC.state.history;
    const active = dls.filter((d) => d.isDownloading && !d.IsCanceled);

    viewEl.append(pane(`${SC.t("dl.title")} DOWNLOADS`, `${active.length} active / ${his.length} done`));
    const actBox = el("div", { class: "tdl" });
    if (!active.length) actBox.append(el("div", { class: "mut", style: { padding: "10px 2px" } }, `// ${SC.t("dl.activeEmpty")}`));
    for (const d of active) {
      actBox.append(el("div", { class: "tdl-item" },
        el("div", { class: "trow" },
          el("span", { class: "tdl-name" }, `⇣ ${d.desc || d.id}`),
          el("span", { class: "mut" }, `${Math.round(d.percent || 0)}% ${SC.fmtBytes(d.receivedBytes)}/${SC.fmtBytes(d.totalBytes)}`)),
        el("div", { class: "tdl-bar" },
          el("span", { class: "mono" }, barAscii(d.percent || 0)),
          el("button", { class: "tbtn", onclick: () => SC.cancelDownload(d.id) }, `[${SC.t("dl.cancel")}]`))));
    }
    const hisBox = el("div", { class: "tdl" });
    hisBox.append(pane(`${SC.t("dl.history")} HISTORY`, his.length ? "" : `// ${SC.t("dl.historyEmpty")}`));
    const rows = el("div", { class: "tdl-rows" });
    for (const h of his) {
      rows.append(el("div", { class: "thist" },
        el("span", { class: "thist-cover" }, h.coverUrl ? el("img", { src: h.coverUrl, loading: "lazy" }) : null),
        el("span", { class: "thist-name" }, h.title || h.id),
        el("span", { class: "mut" }, `${SC.fmtBytes(h.totalBytes)} · ${new Date(h.completedAt).toLocaleString()}`),
        el("button", { class: "tbtn", onclick: () => { if (!SC.demo && h.filePath) SC.client.api.explore(h.filePath); } }, `[${SC.t("common.location")}]`),
        el("button", { class: "tbtn is-danger", onclick: async () => { await SC.removeHistory(h.id); renderView(); } }, `[${SC.t("common.delete")}]`)));
    }
    const clearBtn = el("button", {
      class: "tbtn is-danger",
      onclick: () => SC.confirm({ title: SC.t("dl.clear"), body: SC.t("dl.clearConfirm"), danger: true }).then(async (ok) => { if (ok && await SC.clearHistory()) renderView(); }),
    }, `[${SC.t("dl.clear")}]`);
    hisBox.append(clearBtn, rows);
    viewEl.append(actBox, hisBox);
  }

  // ---------------------------------------------------------------- 社区
  function renderHub() {
    viewEl.innerHTML = "";
    const url = SC.hubUrl(SC.state.hubTarget);
    const head = pane(`${SC.t("hub.title")} HUB`, url.slice(0, 42) + "…");
    head.append(el("div", { class: "ttool" },
      el("button", { class: "tbtn is-primary", onclick: () => SC.communityLogin() }, `[${SC.t("hub.login")}]`),
      el("span", { class: "mut" }, SC.t("hub.loginHint")),
      el("button", { class: "tbtn", onclick: () => { const f = viewEl.querySelector("iframe"); if (f) f.src = f.src; } }, `[${SC.t("hub.reload")}]`, ico("refresh", 12)),
      el("button", { class: "tbtn", onclick: () => SC.openUrl(url) }, `[${SC.t("hub.browser")}]`, ico("external", 12))));
    viewEl.append(head, el("div", { class: "thub" }, el("iframe", { src: url, class: "thub-frame", allow: "clipboard-write" })));
  }

  // ---------------------------------------------------------------- 设置
  let settingsTab = "general";
  function renderSettings() {
    viewEl.innerHTML = "";
    viewEl.append(pane(`${SC.t("nav.settings")} SETTINGS`, SC.t("cfg.reloadHint")));
    const tabs = el("div", { class: "ttabs" },
      [["general", SC.t("cfg.general")], ["wallpaper", SC.t("cfg.wallpaper")], ["appearance", SC.t("cfg.appearance")]].map(([id, label]) =>
        el("button", { class: `tbtn ${settingsTab === id ? "is-active" : ""}`, onclick: () => { settingsTab = id; renderSettings(); } }, `[${label}]`)));
    viewEl.append(tabs);
    const panel = el("div", { class: "tcfg" });
    viewEl.append(panel);
    if (settingsTab === "general") generalTab(panel);
    else if (settingsTab === "wallpaper") wallpaperTab(panel);
    else appearanceTab(panel);
  }

  function generalTab(panel) {
    const g = SC.state.cfg.General;
    const row = (label, hint, control) => el("div", { class: "tcfg-row" },
      el("div", {}, el("span", { class: "tcfg-label" }, `» ${label}`), hint ? el("p", { class: "mut" }, hint) : null), control);
    panel.append(
      row(SC.t("cfg.autoStart"), SC.t("cfg.autoStartHint"), checkboxEl(g.autoStart, (v) => { SC.saveConfig("General", { autoStart: v }); g.autoStart = v; })),
      row(SC.t("cfg.hideWindow"), SC.t("cfg.hideWindowHint"), checkboxEl(g.hideWindow, (v) => { SC.saveConfig("General", { hideWindow: v }); g.hideWindow = v; })),
      row(SC.t("cfg.headless"), SC.t("cfg.headlessHint"),
        (() => { const c = checkboxEl(g.autoStartHeadless, (v) => { SC.saveConfig("General", { autoStartHeadless: v }); g.autoStartHeadless = v; }); if (!g.autoStart) c.classList.add("is-disabled"); return c; })()),
      row(SC.t("cfg.language"), SC.t("cfg.langHint"),
        selectEl([{ value: "zh", label: "中文" }, { value: "en", label: "English" }, { value: "ru", label: "Русский" }, { value: "es", label: "Español" }], g.currentLan, (v) => SC.setLang(v))));
  }

  function wallpaperTab(panel) {
    const c = SC.state.cfg.Wallpaper;
    const dirs = [...(c.directories && c.directories.length ? c.directories : [""])];
    const dirBox = el("div", { class: "tdirs" });
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
        const input = el("input", { class: "tinput is-grow", type: "text", placeholder: i === 0 ? SC.t("cfg.dirsHint") : "", value: d });
        input.addEventListener("change", persistDirs);
        const browse = el("button", {
          class: "tbtn",
          onclick: async () => {
            if (SC.demo) { input.value = `D:\\Wallpapers\\demo-${dirs.length}`; persistDirs(); return; }
            const res = await SC.client.shell.showFolderDialog();
            if (res && res.data) { input.value = res.data; persistDirs(); }
          },
        }, `[${SC.t("cfg.choose")}]`);
        dirBox.append(el("div", { class: "trow" }, input, browse,
          el("button", { class: "tbtn is-danger", onclick: () => { dirs.splice(i, 1); if (!dirs.length) dirs.push(""); renderDirs(); persistDirs(); } }, "[x]")));
      });
    }
    renderDirs();
    panel.append(
      el("div", { class: "tcfg-block" },
        el("span", { class: "tcfg-label" }, `» ${SC.t("cfg.dirs")}`), dirBox,
        el("button", { class: "tbtn", onclick: () => { dirs.push(""); renderDirs(); } }, `[+] ${SC.t("cfg.addDir")}`)),
      el("div", { class: "tcfg-block" },
        cfgLine(SC.t("cfg.covered"), selectEl([{ value: 0, label: SC.t("cfg.covered0") }, { value: 1, label: SC.t("cfg.covered1") }, { value: 2, label: SC.t("cfg.covered2") }], c.coveredBehavior, (v) => { c.coveredBehavior = Number(v); SC.saveConfig("Wallpaper", { coveredBehavior: Number(v) }); })),
        cfgLine(SC.t("cfg.player"), selectEl([{ value: 1, label: SC.t("set.engine1") }, { value: 2, label: SC.t("set.engine2") }], c.defaultVideoPlayer, (v) => { c.defaultVideoPlayer = Number(v); SC.saveConfig("Wallpaper", { defaultVideoPlayer: Number(v) }); }))),
      mpvBlock());
  }
  function cfgLine(label, control) {
    return el("div", { class: "tcfg-row" }, el("span", { class: "tcfg-label" }, `» ${label}`), control);
  }

  function mpvBlock() {
    const box = el("div", { class: "trow tmpv" });
    let downloading = false;
    async function render() {
      const st = await SC.mpvStatus();
      box.innerHTML = "";
      if (!st) return;
      if (!st.available && !downloading) {
        box.append(el("span", { class: "mut is-warn" }, `!! ${SC.t("cfg.mpvMissing")}`),
          el("button", { class: "tbtn is-primary", onclick: () => { SC.mpvDownload(); downloading = true; render(); } }, `[${SC.t("cfg.mpvDownload")}]`));
      } else if (downloading) {
        const pct = el("span", { class: "mut" }, SC.t("cfg.mpvProgress", 0));
        box.append(pct, el("button", { class: "tbtn", onclick: async () => { await SC.mpvCancel(); downloading = false; render(); } }, `[${SC.t("cfg.mpvCancel")}]`));
        SC.onMpvEvent((e) => {
          if (e.state === "progress") pct.textContent = SC.t("cfg.mpvProgress", Math.round(e.percent || 0));
          else if (e.state === "done") { downloading = false; SC.toast(SC.t("cfg.mpvDone"), "ok"); render(); }
          else if (e.state === "error") { downloading = false; SC.toast(SC.t("cfg.mpvFail", e.message || ""), "err"); render(); }
        });
      }
      box.append(el("button", { class: "tbtn", onclick: () => SC.mpvFolder() }, `[${SC.t("cfg.mpvFolder")}]`));
    }
    render();
    return box;
  }

  async function appearanceTab(panel) {
    const a = SC.state.cfg.Appearance;
    const modeSel = selectEl([
      { value: "system", label: SC.t("cfg.modeSys") }, { value: "light", label: SC.t("cfg.modeLight") }, { value: "dark", label: SC.t("cfg.modeDark") },
    ], a.mode || "system", (v) => { SC.setMode(v); a.mode = v; });
    panel.append(el("div", { class: "tcfg-block" }, cfgLine(SC.t("cfg.mode"), modeSel)));

    const skins = await SC.listSkins();
    const box = el("div", { class: "tcfg-block" });
    box.append(el("div", { class: "trow" },
      el("span", { class: "tcfg-label" }, `» ${SC.t("cfg.skins")}`),
      el("button", { class: "tbtn", onclick: () => SC.openSkinsFolder() }, `[${SC.t("cfg.skinOpen")}]`)));
    const list = el("div", { class: "tskins" });
    for (const s of skins) {
      const current = s.id === a.skin || (SC.demo && s.id === SC.meta.id);
      list.append(el("button", {
        class: `tskin ${current ? "is-current" : ""} ${s.valid === false ? "is-invalid" : ""}`,
        title: s.valid === false ? (s.invalidReason || "") : (s.description || ""),
        onclick: async () => {
          if (s.valid === false || current) return;
          if (await SC.applySkin(s.id)) { SC.toast(SC.t("cfg.skinApplied", s.name), "ok"); a.skin = s.id; }
        },
      },
        el("span", { class: "tskin-marker" }, current ? "●" : s.valid === false ? "×" : "○"),
        el("span", { class: "tskin-name" }, s.name || s.id),
        el("span", { class: "mut" }, `${s.type === "style" ? "CSS" : "APP"} v${s.version || "?"} · ${s.author || ""}`),
        current ? el("span", { class: "tskin-cur" }, SC.t("cfg.skinCurrent")) : null));
    }
    box.append(list, el("p", { class: "mut" }, `${SC.t("cfg.about")} · ${SC.meta.brand} v${SC.meta.version}`));
    panel.append(box);
  }

  // ---------------------------------------------------------------- 关于
  function renderAbout() {
    viewEl.innerHTML = "";
    viewEl.append(pane(`${SC.t("about.title")} ABOUT`));
    const links = [
      [SC.t("about.review"), () => SC.openStoreReview()],
      ["GitHub", () => SC.openUrl("https://github.com/GiantappMan/livewallpaper")],
      [SC.t("about.donate"), () => SC.openUrl("https://afdian.net/a/mscoder")],
      [SC.t("about.feedback"), () => SC.openUrl("https://support.qq.com/products/315103")],
    ];
    viewEl.append(
      el("div", { class: "tabout" },
        (() => {
          const W = 27;
          const rowS = (s) => "| " + String(s).padEnd(W - 4).slice(0, W - 4) + " |";
          const logo = ["+" + "-".repeat(W - 2) + "+",
            rowS("> GIANTAPP WALLPAPER"),
            rowS(SC.meta.brand),
            rowS("v" + SC.meta.version),
            "+" + "-".repeat(W - 2) + "+"].join("\n");
          return el("pre", { class: "tlogo" }, logo);
        })(),
        el("p", { class: "mut" }, `${SC.t("about.author", "巨应君")} · ${SC.t("about.skinBy")}`)),
      el("div", { class: "tabout-links" }, links.map(([label, act]) =>
        el("button", { class: "tbtn", onclick: act }, `[${label}]`, ico("external", 11)))),
      el("div", { class: "trow", style: { marginTop: "18px" } },
        el("button", { class: "tbtn", onclick: () => SC.openLogs() }, `[${SC.t("about.logs")}]`),
        el("button", {
          class: "tbtn is-danger",
          onclick: () => SC.confirm({ title: SC.t("about.exit"), body: SC.t("about.exitConfirm"), danger: true }).then((ok) => { if (ok) SC.exitApp(); }),
        }, `[${SC.t("about.exit")}]`)));
  }

  // ---------------------------------------------------------------- 迷你播放器
  let focusIdx = 0;
  let dragging = false;
  let dragPos = 0;
  let lastTime = { position: 0, duration: 0 };

  function renderMini() {
    const st = SC.state.status;
    const playing = st ? st.wallpapers : [];
    miniEl.innerHTML = "";
    if (!playing.length) {
      miniEl.append(el("div", { class: "tmini-idle mut" }, `-- ${SC.t("dock.nothing")} -- ${SC.t("dock.nothingHint")}`));
      return;
    }
    if (focusIdx >= playing.length) focusIdx = 0;
    const w = playing[focusIdx];
    const paused = !!(w.runningInfo && w.runningInfo.isPaused);
    const isList = w.meta && w.meta.type === 6;
    const pl = playing.length > 1;
    const g = (txt, title, act) => el("button", { class: "tbtn tmini-btn", title, onclick: act }, txt);

    const showProgress = w.meta && (w.meta.type === 3 || w.meta.type === 6);
    const cur = dragging ? dragPos : lastTime.position;
    const dur = lastTime.duration || 0;
    const timeTxt = el("span", { class: "mono tmini-time" }, showProgress ? `${SC.fmtTime(cur)}/${SC.fmtTime(dur)}` : "∞");
    const asciiBar = el("span", { class: "mono tmini-ascii" }, showProgress && dur ? barAscii((cur / dur) * 100, 14) : barAscii(paused ? 0 : 100, 14));

    SC.onTime((tp) => {
      if (tp) lastTime = tp; else lastTime = { position: 0, duration: 0 };
      if (dragging) return;
      if (showProgress) {
        timeTxt.textContent = `${SC.fmtTime(lastTime.position)}/${SC.fmtTime(lastTime.duration)}`;
        if (lastTime.duration) asciiBar.textContent = barAscii((lastTime.position / lastTime.duration) * 100, 14);
      }
    });

    // ascii bar 可点击 seek
    asciiBar.style.cursor = "pointer";
    asciiBar.addEventListener("click", (e) => {
      if (!showProgress || !lastTime.duration) return;
      const r = asciiBar.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      SC.seek(lastTime.duration * frac);
    });

    const volume = st.volume || 0;
    const volNum = el("span", { class: "mono" }, `${volume}%`);
    const volRange = el("input", { class: "tmini-vol", type: "range", min: 0, max: 100, value: volume, title: SC.t("dock.volume") });
    const doSetVol = SC.debounce((v) => SC.setVolume(v, st.audioScreenIndex < 0 ? -1 : st.audioScreenIndex), 250);
    volRange.addEventListener("input", () => { volNum.textContent = `${volRange.value}%`; doSetVol(Number(volRange.value)); });

    const srcBtn = el("button", { class: "tbtn tmini-btn", title: SC.t("dock.audio") }, `[♪#${st.audioScreenIndex < 0 ? "M" : st.audioScreenIndex}]`);
    srcBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openMenuAt(e.clientX - 80, e.clientY - 36 - SC.state.screens.length * 32,
        SC.state.screens.map((s) => ({ label: `[${SC.t("common.screen", s.deviceName || s.index)}]`, act: () => SC.setVolume(Math.max(volume, 30), s.index) }))
          .concat([{ label: `[${SC.t("dock.mute")}]`, act: () => SC.setVolume(0, -1) }]));
    });

    miniEl.append(el("div", { class: "tmini" },
      ...(SC.canPause(w) ? [g(paused ? "▶" : "⏸", paused ? SC.t("dock.resume") : SC.t("dock.pause"), () => {
        const idx = SC.screenIndexOf(w);
        paused ? SC.resume(idx) : SC.pause(idx);
      })] : []),
      g("■", SC.t("dock.stop"), async () => { await SC.stop(SC.screenIndexOf(w)); focusIdx = 0; }),
      isList ? g("◧", SC.t("dock.prev"), () => SC.prevIn(w)) : null,
      isList ? g("◨", SC.t("dock.next"), () => SC.nextIn(w)) : null,
      el("span", { class: "tmini-name" }, (w.meta && w.meta.title) || "—"),
      el("span", { class: "mut" }, `[${SC.typeName(w.meta && w.meta.type).toUpperCase()}]`),
      pl ? el("span", { class: "mut" }, `${focusIdx + 1}/${playing.length}`) : null,
      paused ? el("span", { class: "mut is-warn" }, `‖ ${SC.t("common.paused")}`) : null,
      asciiBar, timeTxt, volRange, volNum, srcBtn));
  }

  // ---------------------------------------------------------------- 命令面板
  const COMMANDS = [
    { cmd: "help", desc: "显示全部命令", hint: "help" },
    { cmd: "play", desc: "应用第 N 个壁纸: play 3", hint: "play <n>" },
    { cmd: "screen", desc: "应用到指定屏: screen 1", hint: "screen <n>" },
    { cmd: "pause", desc: "暂停", hint: "pause" },
    { cmd: "resume", desc: "继续播放", hint: "resume" },
    { cmd: "stop", desc: "停止(参数可省略=全部)", hint: "stop [n]" },
    { cmd: "next", desc: "播放列表下一项", hint: "next" },
    { cmd: "prev", desc: "播放列表上一项", hint: "prev" },
    { cmd: "vol", desc: "设置音量: vol 60", hint: "vol <0-100>" },
    { cmd: "mute", desc: "静音", hint: "mute" },
    { cmd: "mode", desc: "外观模式: mode dark", hint: "mode <sys|light|dark>" },
    { cmd: "lang", desc: "语言: lang en", hint: "lang <zh|en>" },
    { cmd: "new", desc: "创建壁纸", hint: "new" },
    { cmd: "playlist", desc: "创建播放列表", hint: "playlist" },
    { cmd: "skins", desc: "打开皮肤目录", hint: "skins" },
    { cmd: "quit", desc: "退出应用", hint: "quit" },
  ];
  function openPalette() {
    if (cmdEl) return;
    const input = el("input", { class: "tpalette-input", type: "text", placeholder: ":" });
    const list = el("div", { class: "tpalette-list" });
    cmdEl = el("div", { class: "tpalette" }, input, list);
    document.body.append(cmdEl);

    function renderList(q) {
      const query = q.trim().toLowerCase();
      const items = COMMANDS.filter((c) => !query || c.cmd.startsWith(query.split(" ")[0]) || c.desc.includes(query));
      list.innerHTML = "";
      for (const c of items.slice(0, 8)) {
        list.append(el("div", { class: "tpalette-item", onclick: () => { input.value = c.hint; input.focus(); } },
          el("span", { class: "mono" }, `:${c.hint}`),
          el("span", { class: "mut" }, c.desc)));
      }
    }
    renderList("");

    input.focus();
    input.addEventListener("input", () => renderList(input.value));
    input.addEventListener("keydown", async (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { cmdEl.remove(); cmdEl = null; return; }
      if (e.key !== "Enter") return;
      const raw = input.value.trim();
      const ok = await execCommand(raw);
      if (ok !== "keep") { cmdEl.remove(); cmdEl = null; }
    });
  }
  async function execCommand(raw) {
    const [cmd, arg] = raw.replace(/^:/, "").trim().split(/\s+/);
    const num = Number(arg);
    const lib = () => wallpapersCache;
    switch ((cmd || "").toLowerCase()) {
      case "": return "keep";
      case "help":
        SC.toast(COMMANDS.map((c) => `:${c.hint}`).join("  "), "ok");
        return "keep";
      case "play": {
        const w = lib()[isNaN(num) ? 0 : num];
        if (!w) { SC.toast("no such wallpaper", "err"); return "keep"; }
        await SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]);
        break;
      }
      case "screen": {
        if (!isNaN(num)) applyTarget = num;
        const w = lib()[0];
        if (w) await SC.applyWallpaper(w, applyTarget < 0 ? [] : [applyTarget]);
        break;
      }
      case "pause": await SC.pause(); break;
      case "resume": await SC.resume(); break;
      case "stop": await SC.stop(isNaN(num) ? -1 : num); break;
      case "next": case "prev": {
        const st = SC.state.status;
        const pl = st && st.wallpapers.find((x) => x.meta.type === 6);
        if (pl) cmd === "next" ? await SC.nextIn(pl) : await SC.prevIn(pl);
        break;
      }
      case "vol": if (!isNaN(num)) await SC.setVolume(Math.max(0, Math.min(100, num))); break;
      case "mute": await SC.setVolume(0, -1); break;
      case "mode": await SC.setMode(arg === "sys" ? "system" : ["light", "dark"].includes(arg) ? arg : "system"); renderView(); break;
      case "lang": if (["zh", "en"].includes(arg)) await SC.setLang(arg); break;
      case "new": openWallpaperDialog(null); break;
      case "playlist": openWallpaperDialog({ playlist: true }); break;
      case "skins": SC.openSkinsFolder(); break;
      case "quit":
        if (await SC.confirm({ title: SC.t("about.exit"), body: SC.t("about.exitConfirm"), danger: true })) SC.exitApp();
        break;
      default:
        SC.toast(`unknown command: ${cmd}`, "err");
        return "keep";
    }
    renderView();
  }

  // ---------------------------------------------------------------- 全局键盘
  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
    if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || e.key === ":") { e.preventDefault(); openPalette(); return; }
    if (["1", "2", "3", "4", "5"].includes(e.key)) {
      const view = NAV.find((n) => n.key === e.key);
      if (view) go(view.id);
      return;
    }
    if (currentView !== "library") return;
    const cards = [...viewEl.querySelectorAll(".tcard")];
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
    renderMini();
    updateTopRight();
  }

  SC.on("wallpapers", () => { if (currentView === "library") renderView(); });
  SC.on("status", () => {
    if (currentView === "library") {
      const playing = SC.playingSet();
      viewEl.querySelectorAll(".tcard").forEach((c) => c.classList.toggle("is-playing", playing.has(c.dataset.path)));
      const scrRows = viewEl.querySelector(".tscr");
      if (scrRows && SC.state.status) renderView();
    }
    renderMini();
    updateTopRight();
  });
  SC.on("downloads", () => {
    if (dlBadgeEl) {
      const n = SC.state.downloads.filter((d) => d.isDownloading && !d.IsCanceled).length;
      dlBadgeEl.hidden = n === 0;
      dlBadgeEl.textContent = String(n > 99 ? "99+" : n);
    }
    if (currentView === "downloads") renderView();
    updateTopRight();
  });
  SC.on("history", () => { if (currentView === "downloads") renderView(); });
  SC.on("lang", () => { buildTopbar(); buildStatusLine(); renderView(); });
  SC.on("mode", () => {
    const m = document.querySelector(".ts-mode");
    if (m) m.textContent = document.documentElement.dataset.mode === "light" ? "LIGHT" : "TERM";
    renderMini();
  });
  SC.on("nav", (p) => { if (p && p.view) go(p.view); });
  SC.on("hub-session", () => { if (currentView === "hub") renderHub(); });
  SC.on("skins", () => { if (currentView === "settings" && settingsTab === "appearance") renderSettings(); });
  ["playing-status-changed", "download-status-changed", "appearance-changed", "skins-changed", "mpv-download-event", "system-theme-changed"].forEach((name) => {
    if (SC.client) SC.client.on(name, () => markEvent(name));
  });

  // ---------------------------------------------------------------- 启动
  if (SC.demo) document.body.append(el("div", { class: "demo-flag", title: SC.t("common.demoHint") }, "DEMO // " + SC.t("common.demoHint")));
  miniEl = el("div", { class: "tmini-wrap" });
  buildTopbar();
  buildStatusLine();
  document.body.append(viewEl, miniEl);
  const initial = location.hash.replace(/^#\//, "");
  if (NAV.some((n) => n.id === initial)) currentView = initial;
  topbarEl.querySelectorAll(".tt-tab").forEach((n) => n.classList.toggle("is-active", n.dataset.view === currentView));
  SC.boot(() => {
    wallpapersCache = SC.state.wallpapers;
    SC.on("wallpapers", (list) => { wallpapersCache = list || SC.state.wallpapers; });
    renderView();
  });
})();
