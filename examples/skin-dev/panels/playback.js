/**
 * 面板：播放控制
 * 默认皮肤「工具条」的全功能对应：暂停/恢复/停止、上下项、
 * 音量 + 音源屏幕、进度显示与拖动跳转、逐屏播放状态。
 */
(function () {
  "use strict";

  const { el } = window.DevSkin;

  function render(root) {
    root.innerHTML = "";
    const client = window.DevSkin.client;

    // ---- 播放控制按钮 ----
    const pausedHint = el("span", { class: "dim" });
    root.append(
      el("h2", {}, "播放控制"),
      el("div", { class: "row" },
        el("button", { onclick: () => client.api.pauseWallpaper() }, "暂停"),
        el("button", { onclick: () => client.api.resumeWallpaper() }, "恢复"),
        el("button", { onclick: () => client.api.stopWallpaper() }, "停止"),
        el("button", { onclick: () => client.api.playPrevInPlaylist() }, "◀ 上一项"),
        el("button", { onclick: () => client.api.playNextInPlaylist() }, "下一项 ▶"),
        pausedHint,
      )
    );

    // ---- 音量 ----
    let screens = [];
    const volumeSlider = el("input", { type: "range", min: 0, max: 100, value: 0, style: { width: "200px" } });
    const volumeLabel = el("span", { class: "mono" }, "0");
    const audioSelect = el("select", {}, el("option", { value: "-1" }, "音源：默认(-1)"));
    volumeSlider.oninput = () => { volumeLabel.textContent = volumeSlider.value; };
    volumeSlider.onchange = () => client.api.setVolume(Number(volumeSlider.value), Number(audioSelect.value));
    audioSelect.onchange = () => client.api.setVolume(Number(volumeSlider.value), Number(audioSelect.value));

    // ---- 进度 ----
    let dragging = false;
    const timeLabel = el("span", { class: "mono dim" }, "--:-- / --:--");
    const seek = el("input", { type: "range", min: 0, max: 1000, value: 0, style: { width: "100%" } });
    seek.oninput = () => { dragging = true; updateTimeLabel(seek.value / 10, seek.dataset.duration || 0); };
    seek.onchange = () => {
      dragging = false;
      const duration = Number(seek.dataset.duration || 0);
      if (duration > 0) client.api.setProgress((seek.value / 1000) * duration);
    };

    function fmt(sec) {
      sec = Math.max(0, Math.floor(sec || 0));
      return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    }

    function updateTimeLabel(position, duration) {
      timeLabel.textContent = `${fmt(position)} / ${fmt(duration)}`;
    }

    async function pollTime() {
      if (!dragging && document.getElementById("panel-root").contains(seek)) {
        const res = await client.api.getWallpaperTime();
        const t = res && res.data ? res.data : null;
        const d = t && t.duration > 0 ? t.duration : 0;
        seek.dataset.duration = String(d);
        if (!dragging) {
          seek.disabled = d <= 0;
          seek.value = d > 0 ? String((t.position / d) * 1000) : "0";
          updateTimeLabel(t ? t.position : 0, d);
        }
      }
    }
    setInterval(pollTime, 1000);

    // ---- 逐屏状态 ----
    const statusBox = el("div", {});

    function renderStatus(status) {
      if (!status) return;
      pausedHint.textContent = status.wallpapers.some((w) => w.runningInfo?.isPaused) ? "（已暂停）" : "";

      // 音量/音源回显（仅在用户未拖动时）
      if (document.activeElement !== volumeSlider) {
        volumeSlider.value = String(status.volume ?? 0);
        volumeLabel.textContent = String(status.volume ?? 0);
      }

      statusBox.innerHTML = "";
      statusBox.append(
        el("h2", {}, "逐屏状态 ", el("span", { class: "hint" }, `${status.screens.length} 屏`)),
        el("table", {},
          el("tr", {}, el("th", {}, "屏幕"), el("th", {}, "分辨率"), el("th", {}, "正在播放"), el("th", {}, "状态")),
          status.screens.map((s) => {
            const w = status.wallpapers.find((x) => (x.runningInfo?.screenIndexes || []).includes(s.index));
            return el("tr", {},
              el("td", { class: "mono" }, `${s.index}${s.primary ? " ★" : ""}`),
              el("td", { class: "mono" }, s.bounds),
              w ? el("td", {}, `${w.meta?.title || "?"} (${window.DevSkin.typeName(w.meta?.type)})`) : el("td", { class: "dim" }, "—"),
              w ? (w.runningInfo?.isPaused
                ? el("td", { class: "warn" }, "已暂停")
                : el("td", { class: "ok" }, "播放中"))
                : el("td", { class: "dim" }, "空闲"),
            );
          })
        )
      );
    }

    // 状态到达：填音源选项 + 渲染逐屏状态（面板初始也立即应用一次缓存状态）
    function onNewStatus(status) {
      if (!status) return;
      if (audioSelect.options.length - 1 !== status.screens.length) {
        for (const s of status.screens) {
          audioSelect.append(el("option", { value: String(s.index) }, `音源：屏幕 ${s.index}`));
        }
      }
      if (document.activeElement !== audioSelect) {
        audioSelect.value = String(status.audioScreenIndex ?? -1);
      }
      renderStatus(status);
    }

    window.DevSkin.onStatus(onNewStatus);

    root.append(
      el("h2", {}, "音量"),
      el("div", { class: "row" }, volumeSlider, volumeLabel, audioSelect),
      el("h2", {}, "进度 ", el("span", { class: "hint" }, "拖动跳转（图片/列表按已播时长模拟）")),
      seek,
      el("div", { class: "row" }, timeLabel),
      statusBox,
    );

    pollTime();
    onNewStatus(window.DevSkin.status);
  }

  window.DevSkin.register({
    id: "playback",
    title: "播放控制",
    render: render,
  });
})();
