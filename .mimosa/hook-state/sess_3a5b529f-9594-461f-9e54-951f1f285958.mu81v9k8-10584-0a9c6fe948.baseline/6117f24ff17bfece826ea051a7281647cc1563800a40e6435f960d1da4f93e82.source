/**
 * 面板：社区 Hub
 * 默认皮肤「Hub 页」的对应：iframe 社区站 + 账号登录（独立窗口）
 * + 会话变化自动重载。地址与默认皮肤一致（VITE_HUB_ADDRESS / 官方站）。
 */
(function () {
  "use strict";

  const { el } = window.DevSkin;

  const HUB_ADDRESS = "https://wallpaper.giantapp.cn";

  function render(root) {
    root.innerHTML = "";
    const client = window.DevSkin.client;

    const frame = el("iframe", {
      src: HUB_ADDRESS,
      style: {
        width: "100%", height: "calc(100vh - 170px)", border: "1px solid var(--border)",
        borderRadius: "8px", background: "#141414",
      },
      allow: "clipboard-write",
    });

    function reloadFrame() { frame.src = `${HUB_ADDRESS}?t=${Date.now()}`; }

    root.append(
      el("h2", {}, "社区 Hub ",
        el("span", { class: "hint" }, "登录/下载经应用桥接（hub_compat），详情页在新窗口打开")
      ),
      el("div", { class: "row" },
        el("button", {
          class: "mini primary",
          onclick: async () => {
            // 授权页拒绝 iframe 嵌套：应用会在独立顶层窗口打开登录页，
            // 完成后广播 hub-session-changed，这里自动重载 iframe。
            await window.DevSkin.call(client.api.openCommunityWindow(HUB_ADDRESS));
          },
        }, "账号登录（GitHub / 微信）"),
        el("button", { class: "mini", onclick: reloadFrame }, "重载社区页"),
        el("button", { class: "mini", onclick: () => client.api.openUrl(HUB_ADDRESS) }, "浏览器打开"),
      ),
      frame,
    );

    client.on("hub-session-changed", () => {
      window.DevSkin.toast("登录会话已变化，重载社区页", "ok");
      reloadFrame();
    });
  }

  window.DevSkin.register({
    id: "hub",
    title: "社区 Hub",
    render: render,
  });
})();
