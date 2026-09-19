/**
 * 面板：事件流（dev 特有）
 * 订阅应用全部事件并实时打印，开发新功能时观察事件节奏与载荷。
 * 事件清单见 docs/3.皮肤系统.md「客户端契约」。
 */
(function () {
  "use strict";

  const { el } = window.DevSkin;

  const EVENT_NAMES = [
    "playing-status-changed",
    "download-status-changed",
    "appearance-changed",
    "refresh-page",
    "navigate",
    "system-theme-changed",
    "mpv-download-event",
    "hub-session-changed",
    "skins-changed",
  ];

  function render(root) {
    root.innerHTML = "";
    const client = window.DevSkin.client;

    const log = el("div", { id: "event-log" });
    let paused = false;
    let count = 0;

    function addLine(name, payload) {
      if (paused) return;
      count += 1;
      const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      const text = payload === undefined || payload === null
        ? ""
        : typeof payload === "string" ? payload : window.DevSkin.pretty(payload);
      log.prepend(
        el("div", { class: "ev" },
          el("span", { class: "t" }, time),
          el("span", { class: "n" }, name),
          el("span", { style: { whiteSpace: "pre-wrap", wordBreak: "break-all" } },
            name === "playing-status-changed" && text === "null"
              ? "(状态缓存已刷新，看「壁纸库」页播放控制条)"
              : text)
        )
      );
      while (log.childElementCount > 200) log.lastChild.remove();
    }

    const pauseBtn = el("button", {
      class: "mini",
      onclick: () => { paused = !paused; pauseBtn.textContent = paused ? "继续滚动" : "暂停滚动"; },
    }, "暂停滚动");
    const clearBtn = el("button", { class: "mini", onclick: () => { log.innerHTML = ""; count = 0; counter.textContent = "共 0 条"; } }, "清空");
    const counter = el("span", { class: "dim mono" }, "共 0 条");

    root.append(
      el("h2", {}, "事件流 ", el("span", { class: "hint" }, "EventHub 广播的全量事件（最新在上，保留 200 条）")),
      el("div", { class: "row" }, pauseBtn, clearBtn, counter),
      el("div", { class: "row" },
        el("span", { class: "dim mono" }, "订阅: " + EVENT_NAMES.join(", ")),
      ),
      log,
    );

    // refresh-page 会导致整页刷新（api.initEvents 里注册了 reload），
    // 这里提前记一条，能看到"刷新前最后一眼"。
    if (client) {
      for (const name of EVENT_NAMES) {
        client.on(name, (payload) => addLine(name, payload));
      }
      addLine("（信息）", "事件监听已就绪，等待应用广播…");
    }
  }

  window.DevSkin.register({
    id: "events",
    title: "事件流",
    render: render,
  });
})();
