/**
 * 面板：设置
 * 默认皮肤「设置三页」的全功能对应：
 *   常规（自启 / 自启 headless / 启动隐藏 / 语言）
 *   壁纸（目录 / 遮挡行为 / 默认视频引擎 / mpv 状态与自动下载）
 *   外观（深浅模式 / 主题色 / 皮肤切换）
 * 另附原始 JSON 编辑器（三组配置直读直写，调参调试用）。
 */
(function () {
  "use strict";

  const { el, call } = window.DevSkin;

  const LANGS = { zh: "简体中文", en: "English", ru: "Русский", es: "Español" };
  const THEMES = ["zinc", "slate", "stone", "gray", "neutral", "red", "rose", "orange", "green", "blue", "yellow", "violet"];
  const COVERED = { 0: "无操作", 1: "暂停", 2: "停止" };
  const PLAYERS = { 0: "系统默认(mpv 优先)", 1: "mpv", 2: "内嵌 WebView" };

  function render(root) {
    root.innerHTML = "";
    const client = window.DevSkin.client;

    // 配置缓存（整组读写，避免 setConfig 整体替换丢字段）
    const configs = {}; // key -> object
    async function loadConfigs() {
      for (const key of ["General", "Wallpaper", "Appearance"]) {
        configs[key] = (await call(client.api.getConfig(key))) || {};
      }
    }

    async function saveConfig(key, patch, okMessage) {
      Object.assign(configs[key], patch);
      const res = await client.api.setConfig(key, configs[key]);
      if (res.error) return window.DevSkin.toast(`保存失败: ${window.DevSkin.pretty(res.error)}`, "err");
      if (okMessage) window.DevSkin.toast(okMessage, "ok");
    }

    // ---------- mpv（在壁纸节内展示，事件在 render 作用域订阅） ----------
    const mpvLine = el("div", { class: "row" });
    async function refreshMpv() {
      const mpv = await call(client.api.getMpvStatus());
      mpvLine.innerHTML = "";
      if (!mpv) return;
      const nodes = [
        el("span", { class: mpv.available ? "ok" : "warn" }, mpv.available ? "● mpv 可用" : "● mpv 缺失"),
        el("span", { class: "mono dim", style: { maxWidth: "420px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, mpv.path || "(未找到)"),
      ];
      if (!mpv.available) {
        nodes.push(el("button", {
          class: "mini primary",
          disabled: mpv.downloading,
          onclick: async () => {
            await call(client.api.downloadMpv());
            window.DevSkin.toast("mpv 下载已开始，进度见事件面板", "ok");
          },
        }, mpv.downloading ? "下载中…" : "自动下载 mpv"));
      }
      mpvLine.append(...nodes);
    }
    client.on("mpv-download-event", (ev) => {
      if (ev.state === "done") { window.DevSkin.toast(`mpv 下载完成: ${ev.path}`, "ok"); refreshMpv(); }
      if (ev.state === "progress") window.DevSkin.toast(`mpv 下载中 ${ev.percent.toFixed(0)}%`);
      if (ev.state === "error") window.DevSkin.toast(`mpv 下载失败: ${ev.message}`, "err");
    });

    // ---------- 常规 ----------
    function generalSection() {
      const g = configs.General;
      const check = (key, label, onChange) =>
        el("label", { class: "check" },
          el("input", {
            type: "checkbox", checked: !!g[key],
            onchange: (e) => onChange(e.target.checked),
          }), label);

      const langSelect = el("select", {},
        Object.entries(LANGS).map(([code, name]) => el("option", { value: code, selected: g.currentLan === code }, name)));

      return [
        el("h2", {}, "常规"),
        el("div", { class: "row" },
          check("autoStart", "开机启动", (v) => saveConfig("General", { autoStart: v }, v ? "已开启自启" : "已关闭自启")),
          check("autoStartHeadless", "自启时后台运行(无窗口)", (v) => saveConfig("General", { autoStartHeadless: v }, "已保存")),
          check("hideWindow", "启动时隐藏主窗口", (v) => saveConfig("General", { hideWindow: v }, "已保存")),
        ),
        el("div", { class: "row" },
          el("span", { class: "dim" }, "语言"), langSelect,
          el("button", {
            class: "mini",
            onclick: async () => {
              await saveConfig("General", { currentLan: langSelect.value }, "语言已保存");
              location.reload(); // 与默认皮肤一致：语言启动时加载
            },
          }, "应用语言"),
          el("span", { class: "dim" }, "（dev 皮肤固定中文，语言作用于默认皮肤）"),
        ),
      ];
    }

    // ---------- 壁纸 ----------
    function wallpaperSection() {
      const w = configs.Wallpaper;

      const dirsBox = el("textarea", { class: "json", style: { "min-height": "64px" } },
        (w.directories || []).join("\n"));
      const coveredSelect = el("select", {},
        Object.entries(COVERED).map(([v, name]) => el("option", { value: v, selected: Number(v) === w.coveredBehavior }, name)));
      const playerSelect = el("select", {},
        Object.entries(PLAYERS).map(([v, name]) => el("option", { value: v, selected: Number(v) === w.defaultVideoPlayer }, name)));

      async function saveDirectories() {
        const dirs = dirsBox.value.split("\n").map((s) => s.trim()).filter(Boolean);
        await saveConfig("Wallpaper", { directories: dirs }, "目录已保存");
      }

      return [
        el("h2", {}, "壁纸"),
        el("div", { class: "row" }, el("span", { class: "dim" }, "媒体库目录（每行一个）")),
        dirsBox,
        el("div", { class: "row" },
          el("button", {
            class: "mini",
            onclick: async () => {
              const folder = await window.DevSkin.call(client.shell.showFolderDialog());
              if (folder) {
                const dirs = dirsBox.value.split("\n").map((s) => s.trim()).filter(Boolean);
                if (!dirs.includes(folder)) dirs.push(folder);
                dirsBox.value = dirs.join("\n");
                saveDirectories();
              }
            },
          }, "添加目录…"),
          el("button", { class: "mini primary", onclick: saveDirectories }, "保存目录"),
        ),
        el("div", { class: "row" },
          el("span", { class: "dim" }, "被遮挡时"), coveredSelect,
          el("span", { class: "dim" }, "默认视频引擎"), playerSelect,
          el("button", {
            class: "mini primary",
            onclick: async () => {
              await saveConfig("Wallpaper", {
                coveredBehavior: Number(coveredSelect.value),
                defaultVideoPlayer: Number(playerSelect.value),
              }, "已保存并应用");
              location.reload(); // 默认皮肤同样以 refresh-page 收尾
            },
          }, "保存"),
        ),
        mpvLine,
      ];
    }

    // ---------- 外观 ----------
    function appearanceSection() {
      const a = configs.Appearance;
      const modeBox = el("div", { class: "row" });
      for (const [value, name] of [["system", "跟随系统"], ["light", "浅色"], ["dark", "深色"]]) {
        modeBox.append(el("button", {
          class: "mini",
          style: a.mode === value ? { borderColor: "var(--accent)" } : {},
          onclick: () => saveConfig("Appearance", { mode: value }, `外观模式: ${name}`),
        }, name));
      }

      const themeSelect = el("select", {},
        THEMES.map((t) => el("option", { value: t, selected: a.theme === t }, t)));

      const skinSelect = el("select", {}, el("option", { value: "" }, "加载中…"));
      const skinInfo = el("span", { class: "dim" });
      // 皮肤列表异步填充（当前项高亮；无效皮肤禁用）
      client.api.listSkins().then((res) => {
        skinSelect.innerHTML = "";
        for (const s of res.data || []) {
          skinSelect.append(el("option", {
            value: s.id,
            selected: a.skin === s.id,
            disabled: !s.valid,
          }, `${s.name}${s.builtin ? "（内置）" : ""}${s.valid ? "" : ` ${s.invalidReason || "不可用"}`}`));
        }
        const current = (res.data || []).find((s) => s.id === a.skin);
        skinInfo.textContent = current ? `当前: ${current.name}` : "";
      });

      return [
        el("h2", {}, "外观"),
        el("div", { class: "row" }, modeBox),
        el("div", { class: "row" },
          el("span", { class: "dim" }, "主题色(默认皮肤)"), themeSelect,
          el("button", { class: "mini", onclick: () => saveConfig("Appearance", { theme: themeSelect.value }, "主题色已保存") }, "保存"),
        ),
        el("div", { class: "row" },
          el("span", { class: "dim" }, "皮肤"), skinSelect,
          el("button", {
            class: "mini primary",
            onclick: async () => {
              if (!skinSelect.value) return;
              await call(client.api.setActiveSkin(skinSelect.value), "皮肤已应用（主窗口重建中）");
            },
          }, "应用皮肤"),
          skinInfo,
        ),
      ];
    }

    // ---------- 原始 JSON ----------
    function jsonSection() {
      const wrap = el("div", {});
      for (const key of ["General", "Wallpaper", "Appearance"]) {
        const box = el("textarea", { class: "json", style: { "min-height": "120px" } }, window.DevSkin.pretty(configs[key]));
        wrap.append(
          el("h2", {}, key, el("span", { class: "hint" }, "整组读写（缺省字段按后端默认值落盘，注意别删字段）")),
          box,
          el("div", { class: "row" },
            el("button", {
              class: "mini primary",
              onclick: async () => {
                let value;
                try { value = JSON.parse(box.value); } catch (e) { return window.DevSkin.toast(`JSON 解析失败: ${e.message}`, "err"); }
                const res = await client.api.setConfig(key, value);
                if (res.error) return window.DevSkin.toast(`保存失败: ${window.DevSkin.pretty(res.error)}`, "err");
                configs[key] = value;
                window.DevSkin.toast(`${key} 已保存`, "ok");
              },
            }, `保存 ${key}`),
            el("button", {
              class: "mini",
              onclick: async () => {
                configs[key] = (await call(client.api.getConfig(key))) || {};
                box.value = window.DevSkin.pretty(configs[key]);
              },
            }, "重新读取"),
          ),
        );
      }
      return wrap;
    }

    loadConfigs().then(() => {
      root.append(...generalSection(), ...wallpaperSection(), ...appearanceSection(), jsonSection());
      refreshMpv();
    });
  }

  window.DevSkin.register({
    id: "settings",
    title: "设置",
    render: render,
  });
})();
