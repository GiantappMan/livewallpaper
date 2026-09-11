/**
 * 面板：壁纸库
 * 默认皮肤「首页」的全功能对应：网格浏览、应用到屏幕、删除、
 * 导入媒体创建壁纸、勾选成员创建播放列表、逐壁纸设置编辑。
 */
(function () {
  "use strict";

  const { el, call } = window.DevSkin;

  // 与前端 types.ts defaultSetting() 一致
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

  let wallpapers = [];
  let screens = [];
  let selected = new Set(); // filePath 集合（播放列表成员 / 删除用）
  let editing = null; // 当前编辑设置的壁纸

  function playingPaths() {
    const status = window.DevSkin.status;
    if (!status) return new Set();
    return new Set(
      status.wallpapers.flatMap((w) =>
        [w.filePath, ...(w.meta?.wallpapers || []).map((m) => m.filePath)].filter(Boolean)
      )
    );
  }

  async function reload(root) {
    wallpapers = (await call(window.DevSkin.client.api.getWallpapers())) || [];
    screens = (await call(window.DevSkin.client.api.getScreens())) || [];
    render(root);
  }

  function render(root) {
    root.innerHTML = "";
    const playing = playingPaths();

    // ---- 工具行 ----
    const screenSelect = el(
      "select",
      {},
      el("option", { value: "" }, "全部屏幕"),
      screens.map((s) => el("option", { value: String(s.index) }, `屏幕 ${s.index}${s.primary ? "（主）" : ""}`))
    );

    async function applyTo(wallpaper) {
      const target = screenSelect.value === "" ? [] : [Number(screenSelect.value)];
      wallpaper.runningInfo = { screenIndexes: target, isPaused: false };
      await call(window.DevSkin.client.api.showWallpaper(wallpaper), "已应用");
      window.DevSkin.refreshStatus();
    }

    async function deleteSelected() {
      const items = wallpapers.filter((w) => selected.has(w.filePath));
      if (!items.length) return window.DevSkin.toast("先勾选要删除的壁纸", "err");
      if (!confirm(`删除选中的 ${items.length} 个壁纸？（正在播放的会先停止）`)) return;
      for (const w of items) {
        await call(window.DevSkin.client.api.deleteWallpaper(w));
        selected.delete(w.filePath);
      }
      reload(root);
    }

    // ---- 创建播放列表 ----
    const playlistTitle = el("input", { type: "text", placeholder: "播放列表标题", style: { width: "160px" } });
    async function createPlaylist() {
      const members = wallpapers.filter((w) => selected.has(w.filePath));
      if (members.length < 1) return window.DevSkin.toast("先勾选播放列表成员", "err");
      const fileUrl = await window.DevSkin.uploadPlaylistPlaceholder();
      if (!fileUrl) return;
      const coverUrl = await window.DevSkin.generatePlaylistCover(members.map((m) => m.coverUrl));
      await call(
        window.DevSkin.client.api.createWallpaperNew({
          fileUrl,
          coverUrl: coverUrl || "",
          meta: { title: playlistTitle.value || "新播放列表", type: 6, playIndex: 0, wallpapers: members },
          setting: defaultSetting(),
          runningInfo: { screenIndexes: [], isPaused: false },
        }),
        "播放列表已创建"
      );
      selected.clear();
      reload(root);
    }

    // ---- 导入媒体 ----
    const importTitle = el("input", { type: "text", placeholder: "标题（留空用文件名）", style: { width: "180px" } });
    const importFile = el("input", { type: "file", style: { display: "none" } });
    const importBtn = el("button", { class: "primary" }, "导入媒体文件…");
    importBtn.onclick = () => importFile.click();
    importFile.onchange = async () => {
      const file = importFile.files[0];
      importFile.value = "";
      if (!file) return;
      importBtn.disabled = true;
      importBtn.textContent = "上传中 0%";
      try {
        const fileUrl = await window.DevSkin.uploadToTmp(file, (p) => { importBtn.textContent = `上传中 ${p}%`; });
        await call(
          window.DevSkin.client.api.createWallpaperNew({
            fileUrl,
            coverUrl: "",
            meta: { title: importTitle.value || file.name.replace(/\.[^.]+$/, ""), type: 0, playIndex: 0, wallpapers: [] },
            setting: defaultSetting(),
            runningInfo: { screenIndexes: [], isPaused: false },
          }),
          "壁纸已创建（封面生成中，稍后自动出现）"
        );
        importTitle.value = "";
        reload(root);
      } catch (e) {
        window.DevSkin.toast(String(e.message || e), "err");
      } finally {
        importBtn.disabled = false;
        importBtn.textContent = "导入媒体文件…";
      }
    };

    // ---- 网格 ----
    const grid = el("div", { class: "grid" });
    for (const w of wallpapers) {
      const isPlaying = playing.has(w.filePath);
      const checkbox = el("input", {
        type: "checkbox",
        checked: selected.has(w.filePath),
        onclick: (e) => {
          e.stopPropagation();
          if (e.target.checked) selected.add(w.filePath);
          else selected.delete(w.filePath);
          card.classList.toggle("selected", e.target.checked);
        },
      });
      const delBtn = el("button", {
        class: "mini danger",
        title: "删除该壁纸",
        onclick: async (e) => {
          e.stopPropagation();
          if (!confirm(`删除「${w.meta?.title || w.fileName}」？正在播放会先停止。`)) return;
          const res = await window.DevSkin.client.api.deleteWallpaper(JSON.parse(JSON.stringify(w)));
          if (res.error) return window.DevSkin.toast(`删除失败: ${window.DevSkin.pretty(res.error)}`, "err");
          selected.delete(w.filePath);
          window.DevSkin.toast("已删除", "ok");
          reload(root);
        },
      }, "删除");
      const card = el(
        "div",
        {
          class: `card ${isPlaying ? "playing" : ""} ${selected.has(w.filePath) ? "selected" : ""}`,
          title: `${w.meta?.title || ""}\n${w.filePath || ""}`,
          onclick: () => applyTo(JSON.parse(JSON.stringify(w))),
        },
        checkbox,
        w.coverUrl ? el("img", { src: w.coverUrl, loading: "lazy" }) : null,
        el("div", { class: "name", style: { display: "flex", alignItems: "center", gap: "6px" } },
          el("span", { style: { flex: "1", overflow: "hidden", textOverflow: "ellipsis" } },
            el("span", { class: "type" }, window.DevSkin.typeName(w.meta?.type)),
            w.meta?.title || "(无标题)"
          ),
          delBtn,
        )
      );
      grid.append(card);
    }

    // ---- 设置编辑区 ----
    const editor = el("div", {});
    function renderEditor() {
      editor.innerHTML = "";
      if (!editing) {
        editor.append(el("p", { class: "dim" }, "点击卡片应用到屏幕；在标题输入框里可改名。编辑设置：先勾选一个壁纸再点「编辑设置」。"));
        return;
      }
      const w = wallpapers.find((x) => x.filePath === editing);
      if (!w) { editing = null; return renderEditor(); }

      const title = el("input", { type: "text", value: w.meta?.title || "", style: { width: "220px" } });
      const settingBox = el("textarea", { class: "json" }, window.DevSkin.pretty(w.setting || {}));
      editor.append(
        el("h2", {}, "壁纸设置 ", el("span", { class: "hint" }, w.meta?.title || "")),
        el("div", { class: "row" },
          el("span", { class: "dim" }, "标题"), title,
          el("button", {
            class: "mini",
            onclick: async () => {
              const updated = JSON.parse(JSON.stringify(w));
              updated.meta.title = title.value;
              await call(window.DevSkin.client.api.updateWallpaperNew(updated, w.fileUrl || ""), "标题已保存");
              reload(root);
            },
          }, "保存标题"),
          el("button", {
            class: "mini",
            onclick: async () => {
              const updated = JSON.parse(JSON.stringify(w));
              updated.meta.title = title.value;
              await call(window.DevSkin.client.api.updateWallpaperNew(updated, w.fileUrl || ""), "已保存");
              reload(root);
            },
          }, "保存全部字段(meta)"),
        ),
        el("div", { class: "row" }, el("span", { class: "dim" }, "setting（JSON，字段见 types.ts WallpaperSetting）")),
        settingBox,
        el("div", { class: "row" },
          el("button", {
            class: "mini primary",
            onclick: async () => {
              let setting;
              try { setting = JSON.parse(settingBox.value); } catch (e) { return window.DevSkin.toast(`JSON 解析失败: ${e.message}`, "err"); }
              const updated = JSON.parse(JSON.stringify(w));
              updated.setting = setting;
              if (updated.meta.title !== title.value) updated.meta.title = title.value;
              await call(window.DevSkin.client.api.setWallpaperSetting(setting, updated), "设置已保存并热应用");
              reload(root);
            },
          }, "保存设置"),
          el("button", { class: "mini", onclick: () => { editing = null; renderEditor(); } }, "关闭编辑"),
        )
      );
    }

    root.append(
      el("h2", {}, "壁纸库 ", el("span", { class: "hint" }, `${wallpapers.length} 项 · 绿框 = 播放中`)),
      el("div", { class: "row" },
        screenSelect,
        el("span", { class: "dim" }, "点击卡片 = 应用到以上屏幕"),
        el("button", { class: "mini", onclick: () => reload(root) }, "刷新"),
        el("button", { class: "mini danger", onclick: deleteSelected }, "删除勾选"),
        el("button", {
          class: "mini",
          onclick: () => {
            if (selected.size !== 1) return window.DevSkin.toast("勾选恰好一个壁纸后可编辑其设置", "err");
            editing = [...selected][0];
            renderEditor();
            editor.scrollIntoView({ behavior: "smooth" });
          },
        }, "编辑设置"),
      ),
      el("div", { class: "row" },
        importBtn, importFile, importTitle,
        playlistTitle,
        el("button", { class: "mini", onclick: createPlaylist }, `创建播放列表（勾选成员）`),
      ),
      grid,
      editor,
    );
    renderEditor();
  }

  window.DevSkin.register({
    id: "library",
    title: "壁纸库",
    render: (root) => reload(root),
  });
})();
