/**
 * 面板：系统
 * 默认皮肤「关于页」的对应 + 屏幕信息：版本、日志目录、
 * 商店/链接、屏幕详情、媒体库信息。退出应用也在这里。
 */
(function () {
  "use strict";

  const { el, call } = window.DevSkin;

  function render(root) {
    root.innerHTML = "";
    const client = window.DevSkin.client;

    // ---- 版本与链接 ----
    root.append(el("h2", {}, "应用"));
    const versionLine = el("div", { class: "row dim" }, "版本读取中…");
    call(client.api.getVersion()).then((v) => {
      versionLine.innerHTML = "";
      versionLine.append(`GiantappWallpaper v${v}`);
    });
    root.append(
      versionLine,
      el("div", { class: "row" },
        el("button", { class: "mini", onclick: () => client.api.openLogFolder() }, "打开日志目录"),
        el("button", {
          class: "mini",
          onclick: () => client.api.openStoreReview("https://github.com/GiantappMan/livewallpaper"),
        }, "点个 Star / 好评"),
        el("button", { class: "mini", onclick: () => client.api.openUrl("https://github.com/GiantappMan/livewallpaper") }, "项目主页"),
        el("button", {
          class: "mini danger",
          onclick: async () => {
            if (!confirm("退出应用？（按 KeepWallpaper 配置决定是否保留壁纸）")) return;
            await call(client.api.exitApp ? client.api.exitApp() : Promise.resolve({ error: null }));
          },
        }, "退出应用"),
      ),
    );

    // ---- 屏幕 ----
    root.append(el("h2", {}, "屏幕信息"));
    const screenBox = el("div", {});
    root.append(screenBox);
    call(client.api.getScreens()).then((screens) => {
      screenBox.innerHTML = "";
      if (!screens || !screens.length) return screenBox.append(el("p", { class: "dim" }, "无屏幕信息"));
      screenBox.append(
        el("table", {},
          el("tr", {}, el("th", {}, "索引"), el("th", {}, "设备"), el("th", {}, "边界"), el("th", {}, "工作区"), el("th", {}, "色深"), el("th", {}, "主屏")),
          screens.map((s) =>
            el("tr", {},
              el("td", { class: "mono" }, String(s.index)),
              el("td", { class: "mono" }, s.deviceName || "—"),
              el("td", { class: "mono" }, s.bounds),
              el("td", { class: "mono" }, s.workingArea || "—"),
              el("td", { class: "mono" }, String(s.bitsPerPixel)),
              el("td", {}, s.primary ? "★" : ""),
            )
          )
        )
      );
    });

    // ---- 运行环境（dev 特化） ----
    root.append(el("h2", {}, "运行环境 ", el("span", { class: "hint" }, "dev 皮肤自检")));
    const envBox = el("pre", { class: "json" }, "读取中…");
    root.append(envBox);
    envBox.textContent = window.DevSkin.pretty({
      sdkLoaded: !!window.WallpaperClient,
      inTauriClient: client.api.isRunningInClient(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      href: location.href,
      panelIds: window.DevSkin.allPanels().map((p) => p.id),
    });
  }

  window.DevSkin.register({
    id: "system",
    title: "系统",
    render: render,
  });
})();
