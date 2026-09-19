/**
 * 面板：下载
 * 默认皮肤「下载页」的全功能对应：进行中任务（进度/取消）、
 * 历史（清除全部 / 删除单条 / 打开文件位置）。
 */
(function () {
  "use strict";

  const { el, call } = window.DevSkin;

  async function render(root) {
    root.innerHTML = "";
    const client = window.DevSkin.client;

    async function reload() { render(root); }

    // ---- 进行中 ----
    const status = await call(client.api.getDownloadStatus());
    const items = status ? status.items : [];

    root.append(el("h2", {}, "进行中 ", el("span", { class: "hint" }, `${items.filter((i) => i.isDownloading).length} 个任务`)));
    if (!items.length) {
      root.append(el("p", { class: "dim" }, "暂无下载任务（从社区 Hub 添加）"));
    } else {
      const rows = items.map((item) =>
        el("div", { style: { margin: "10px 0" } },
          el("div", { class: "row" },
            el("span", { style: { flex: "1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
              `${item.desc || item.id} `,
              item.IsCanceled ? el("span", { class: "err" }, "已取消")
                : item.isDownloadCompleted ? el("span", { class: "ok" }, "完成")
                : el("span", { class: "dim" }, `${item.percent.toFixed(1)}% · ${window.DevSkin.formatBytes(item.receivedBytes)}/${window.DevSkin.formatBytes(item.totalBytes)}`),
            ),
            el("button", {
              class: "mini",
              disabled: !item.isDownloading || item.IsCanceled,
              onclick: async () => { await call(client.api.cancelDownloadWallpaper(item.id), "已取消"); reload(); },
            }, "取消"),
          ),
          el("div", { class: "progress" }, el("div", { style: { width: `${Math.min(100, item.percent)}%` } })),
        )
      );
      root.append(...rows);
    }

    // ---- 历史 ----
    root.append(
      el("h2", {}, "历史"),
      el("div", { class: "row" },
        el("button", {
          class: "mini danger",
          onclick: async () => {
            if (!confirm("清空全部下载记录？（不删除已下载的壁纸文件）")) return;
            await call(client.api.clearDownloadHistory(), "已清空");
            reload();
          },
        }, "清空历史"),
      ),
    );

    const history = await call(client.api.getDownloadHistory());
    if (history && history.length) {
      root.append(
        el("table", {},
          el("tr", {}, el("th", {}, "标题"), el("th", {}, "大小"), el("th", {}, "完成时间"), el("th", {}, "操作")),
          history.map((h) =>
            el("tr", {},
              el("td", {}, h.title || h.id),
              el("td", { class: "mono" }, window.DevSkin.formatBytes(h.totalBytes)),
              el("td", { class: "mono dim" }, h.completedAt ? new Date(h.completedAt).toLocaleString() : "—"),
              el("td", {},
                el("div", { class: "row", style: { margin: "0" } },
                  el("button", { class: "mini", onclick: () => client.api.explore(h.filePath) }, "文件位置"),
                  el("button", {
                    class: "mini danger",
                    onclick: async () => { await call(client.api.removeDownloadHistoryItem(h.id), "已删除记录"); reload(); },
                  }, "删记录"),
                )
              ),
            )
          )
        )
      );
    } else {
      root.append(el("p", { class: "dim" }, "暂无下载记录"));
    }
  }

  window.DevSkin.register({
    id: "downloads",
    title: "下载",
    badge: true,
    render: render,
  });
})();
