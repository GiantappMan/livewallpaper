/**
 * 面板：遮挡检测（dev 特化可视化测试）
 * 实时展示"全屏遮挡检测"结果与播放器的实际响应：
 *   - 每秒轮询 get_screen_coverage（跳过引擎 tick 缓存的即时检测）
 *   - 每屏卡片：遮挡百分比进度条（矩形并集面积）+ 遮挡判定 + 壁纸实际播放状态
 *   - 行为快速切换（继续播放 / 自动暂停 / 停止），与 设置→壁纸→被遮挡时 同一配置
 * 测试方式：把任意窗口最大化或拖大盖住壁纸，1 秒内百分比与卡片颜色实时变化。
 */
(function () {
  "use strict";

  const { el, call } = window.DevSkin;

  // 与 models.rs CoveredBehavior 对齐：0 继续 / 1 暂停 / 2 停止
  const COVERED = { 0: "继续播放", 1: "自动暂停", 2: "停止" };

  // 面板重渲染 / 切走时清理轮询与订阅（boot 无 destroy 钩子，借 hashchange 自清）
  let pollTimer = null;
  let offStatus = null;

  function cleanup() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (offStatus) { offStatus(); offStatus = null; }
  }
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#/occlusion") cleanup();
  });

  /** 百分比 -> 颜色：≥90 红（已判定遮挡），>0 黄，0 绿 */
  function percentColor(pct) {
    if (pct >= 90) return "var(--err)";
    if (pct > 0) return "var(--warn)";
    return "var(--ok)";
  }

  function render(root) {
    cleanup();
    root.innerHTML = "";
    const client = window.DevSkin.client;

    root.append(el("h2", {}, "遮挡检测 ",
      el("span", { class: "hint" },
        "百分比 = 顶层窗口在屏上的矩形并集面积；有最大化窗口或 ≥90% 判定遮挡；忽略最小化 / 隐藏 / UWP 挂起 / 桌面层窗口")));

    // ---- 遮挡行为（与设置页同一 Wallpaper 配置） ----
    let behavior = null; // 0 | 1 | 2
    const behaviorSelect = el("select", { disabled: true }, el("option", {}, "加载中…"));
    behaviorSelect.onchange = async () => {
      const w = await call(client.api.getConfig("Wallpaper"));
      if (!w) return;
      w.coveredBehavior = Number(behaviorSelect.value);
      const res = await client.api.setConfig("Wallpaper", w);
      if (res.error) return window.DevSkin.toast(`保存失败: ${window.DevSkin.pretty(res.error)}`, "err");
      behavior = w.coveredBehavior;
      window.DevSkin.toast(`被遮挡时: ${COVERED[behavior]}`, "ok");
      paint();
    };
    call(client.api.getConfig("Wallpaper")).then((w) => {
      if (!w) return;
      behavior = w.coveredBehavior;
      behaviorSelect.innerHTML = "";
      Object.entries(COVERED).forEach(([v, name]) =>
        behaviorSelect.append(el("option", { value: v, selected: Number(v) === behavior }, name)));
      behaviorSelect.disabled = false;
      paint();
    });

    // ---- 即时检测 + 每秒轮询 ----
    let coverage = []; // ScreenCoverage[]
    const lastCheck = el("span", { class: "dim mono" }, "尚未检测");
    const liveBox = el("div", {});

    async function detectOnce() {
      const res = await client.api.getScreenCoverage();
      if (res.error) {
        lastCheck.textContent = `检测失败: ${window.DevSkin.pretty(res.error)}`;
        return;
      }
      coverage = res.data || [];
      lastCheck.textContent = `上次检测 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`;
      paint();
    }

    root.append(
      el("div", { class: "row" },
        el("span", { class: "dim" }, "被遮挡时"), behaviorSelect,
        el("button", { class: "mini primary", onclick: detectOnce }, "立即检测一次"),
        lastCheck,
      ),
      el("div", { class: "row dim" },
        "测试：拖动 / 最大化任意窗口盖住壁纸，1 秒内百分比与颜色实时变化；≥90% 触发上方行为。"),
      liveBox,
    );

    // ---- 原始数据 ----
    const raw = el("pre", { class: "json" }, "");
    root.append(el("h2", {}, "原始数据"), raw);

    function paint() {
      const status = window.DevSkin.status;
      const screens = (status && status.screens) || [];
      const wallpapers = (status && status.wallpapers) || [];
      raw.textContent = window.DevSkin.pretty({
        coverage,
        coveredBehavior: behavior,
        running: wallpapers.map((w) => ({
          screens: w.runningInfo && w.runningInfo.screenIndexes,
          isPaused: w.runningInfo && w.runningInfo.isPaused,
        })),
      });

      liveBox.innerHTML = "";
      if (!screens.length) {
        liveBox.append(el("p", { class: "dim" }, "暂无屏幕信息"));
        return;
      }
      const grid = el("div", { class: "row", style: { gap: "10px", alignItems: "stretch" } });
      for (const s of screens) {
        const cov = coverage.find((c) => c.screenIndex === s.index);
        const pct = cov ? cov.percent : 0;
        const isCovered = !!(cov && cov.covered);
        const color = percentColor(pct);
        grid.append(
          el("div", {
            class: "mono",
            style: {
              border: `1px solid ${isCovered ? "var(--err)" : "var(--border)"}`,
              background: "var(--bg2)",
              borderRadius: "10px",
              padding: "10px 14px",
              minWidth: "190px",
            },
          },
            el("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px" } },
              el("span", {}, `屏幕 ${s.index}`, s.primary ? " ★" : ""),
              el("span", { class: pct >= 90 ? "err" : "dim" }, `${pct}%`),
            ),
            // 覆盖率进度条
            el("div", {
              style: {
                height: "6px", background: "var(--bg3)", borderRadius: "3px",
                overflow: "hidden", margin: "7px 0",
              },
            },
              el("div", {
                style: {
                  height: "100%", width: `${pct}%`, background: color,
                  borderRadius: "3px", transition: "width 0.25s, background 0.25s",
                },
              })),
            el("div", { class: isCovered ? "err" : "ok" }, isCovered ? "● 已判定遮挡" : "● 未遮挡"),
            el("div", { class: "dim" }, playbackText(s.index, isCovered)),
            s.deviceName ? el("div", { class: "dim" }, s.deviceName) : null,
          )
        );
      }
      liveBox.append(grid);
    }

    function playbackText(screenIndex, isCovered) {
      const wp = (window.DevSkin.status?.wallpapers || []).find((w) =>
        ((w.runningInfo && w.runningInfo.screenIndexes) || []).includes(screenIndex));
      if (!wp) return isCovered && behavior === 2 ? "已停止（遮挡）" : "无壁纸";
      if (isCovered && behavior === 2) return "已停止（遮挡）";
      if (wp.runningInfo && wp.runningInfo.isPaused) return "已暂停（手动）";
      if (isCovered && behavior === 1) return "已暂停（遮挡）";
      return "播放中";
    }

    offStatus = window.DevSkin.onStatus(() => paint());
    paint();
    detectOnce();
    pollTimer = setInterval(detectOnce, 1000);
  }

  window.DevSkin.register({
    id: "occlusion",
    title: "遮挡检测",
    render: render,
  });
})();
