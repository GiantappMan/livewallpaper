/**
 * boot：构建导航、hash 路由、全局事件订阅。
 * 在所有 panel 脚本之后加载。
 */
(function () {
  "use strict";

  const { el } = window.DevSkin;

  function init() {
    const root = document.getElementById("panel-root");
    const nav = document.getElementById("nav");

    // 面板路由：#/library 等，默认第一个面板
    function currentId() {
      const id = location.hash.replace(/^#\//, "");
      return DevSkin.allPanels().some((p) => p.id === id) ? id : DevSkin.allPanels()[0].id;
    }

    function show() {
      const id = currentId();
      const panel = DevSkin.allPanels().find((p) => p.id === id);
      nav.querySelectorAll(".item").forEach((n) => n.classList.toggle("active", n.dataset.id === id));
      root.innerHTML = "";
      try {
        panel.render(root);
      } catch (e) {
        root.append(el("pre", { class: "json err" }, `面板渲染失败: ${e.message}\n${e.stack}`));
        console.error(e);
      }
    }

    // 导航项
    for (const panel of DevSkin.allPanels()) {
      const item = el("div", { class: "item", "data-id": panel.id, onclick: () => { location.hash = `#/${panel.id}`; } },
        panel.title,
        panel.badge ? (() => { const b = el("span", { class: "badge", hidden: true }); panel.badgeEl = b; return b; })() : null
      );
      nav.append(item);
    }
    nav.append(el("div", { class: "foot" }, "dev skin · 面板注册表架构\n加功能见 core.js 头注释"));

    window.addEventListener("hashchange", show);

    // 窗口控件（自绘标题栏）
    const client = DevSkin.client;
    if (client) {
      document.getElementById("btn-min").onclick = () => client.win.minimize();
      document.getElementById("btn-max").onclick = () => client.win.toggleMaximize();
      document.getElementById("btn-close").onclick = () => client.win.close();
    }

    // 全局事件 -> 状态缓存 + 下载角标
    const badge = document.getElementById("dl-badge");
    function refreshBadge(status) {
      const active = (status || []).filter((d) => d.isDownloading && !d.IsCanceled).length;
      badge.hidden = active === 0;
      badge.textContent = String(active);
      const navBadge = DevSkin.allPanels().find((p) => p.id === "downloads")?.badgeEl;
      if (navBadge) {
        navBadge.hidden = active === 0;
        navBadge.textContent = String(active);
      }
    }

    if (client) {
      client.api.initEvents();

      client.on("playing-status-changed", () => DevSkin.refreshStatus());
      client.on("download-status-changed", async () => {
        const res = await client.api.getDownloadStatus();
        refreshBadge(res.data ? res.data.items : []);
      });

      DevSkin.refreshStatus();
      client.api.getDownloadStatus().then((res) => refreshBadge(res.data ? res.data.items : []));
    }

    show();

    // 主窗口就绪：关闭启动屏并显示窗口（app 型皮肤契约，见 docs/3.皮肤系统.md）
    if (client) client.shell.hideLoading();
  }

  if (!window.DevSkin || !window.DevSkin.client) {
    // SDK 未加载：浏览器直接打开本页（file:// / 静态服务器）时的友好提示
    const banner = document.createElement("div");
    banner.id = "nosdk";
    banner.innerHTML =
      "<b>SDK 未加载</b><br/>皮肤需要在应用窗口内运行（<code>/_sdk/client.js</code> 由应用提供）。<br/>" +
      "把本目录放入 <code>%LOCALAPPDATA%/LiveWallpaper4/skins/</code>，在 设置 → 外观 → 皮肤 中应用即可。";
    document.body.prepend(banner);
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
