/**
 * Dev 皮肤核心：面板注册表 + 共享状态 + 工具。
 *
 * 加新功能的方式（也是本皮肤"方便后期加功能"的设计点）：
 *   1. panels/ 下新建 my-feature.js
 *   2. 文件末尾 DevSkin.register({ id, title, render(root) })
 *   3. index.html 加一行 <script src="/panels/my-feature.js"></script>
 *
 * 面板可用的一切都挂在 window.DevSkin 上：
 *   - DevSkin.client      官方 SDK（api / shell / win / types / on）
 *   - DevSkin.status      最近一次 getPlayingStatus 的缓存（事件到达自动刷新）
 *   - DevSkin.onStatus(fn)  订阅状态刷新（返回退订函数）
 *   - DevSkin.refreshStatus()  强制刷新状态
 *   - DevSkin.el(tag, attrs, ...children)  DOM 构建
 *   - DevSkin.toast(msg, kind)  右下角提示（kind: ok | err | undefined）
 *   - DevSkin.call(promise)  统一执行 ApiResult 并弹错误
 *   - DevSkin.uploadToTmp(file, onProgress)  分块 base64 上传
 */
(function () {
  "use strict";

  const panels = [];
  const statusListeners = new Set();

  const DevSkin = {
    /** @type {import('wallpaper-client')} 官方 SDK */
    client: window.WallpaperClient || null,

    /** 播放状态缓存（PlayingStatus | null） */
    status: null,

    /** 面板注册（由各 panels/*.js 调用） */
    register(panel) {
      panels.push(panel);
    },

    /** 已注册面板列表（boot.js 用于渲染导航） */
    allPanels() {
      return panels.slice();
    },

    /** 订阅播放状态变化（任何事件/轮询触发刷新后回调） */
    onStatus(fn) {
      statusListeners.add(fn);
      return () => statusListeners.delete(fn);
    },

    async refreshStatus() {
      if (!this.client) return;
      const res = await this.client.api.getPlayingStatus();
      this.status = res.data || null;
      statusListeners.forEach((fn) => {
        try { fn(this.status); } catch (e) { console.error(e); }
      });
    },

    // ---- DOM 工具 ----

    /**
     * 构建元素：el("div", { class: "row", onclick }, child, "text", ...)
     * 以 on 开头的属性挂事件，其余 setAttribute。
     */
    el(tag, attrs, ...children) {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs || {})) {
        if (key.startsWith("on") && typeof value === "function") {
          node.addEventListener(key.slice(2), value);
        } else if (key === "style" && typeof value === "object") {
          Object.assign(node.style, value);
        } else if (value !== undefined && value !== null && value !== false) {
          node.setAttribute(key, value === true ? "" : String(value));
        }
      }
      for (const child of children.flat(Infinity)) {
        if (child === undefined || child === null || child === false) continue;
        node.append(child.nodeType ? child : document.createTextNode(String(child)));
      }
      return node;
    },

    /** JSON 美化（容错） */
    pretty(value) {
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    },

    /** 右下角 toast */
    toast(message, kind) {
      const box = document.getElementById("toasts");
      if (!box) { console.log(`[toast:${kind || "info"}]`, message); return; }
      const item = this.el("div", { class: `toast ${kind || ""}` }, message);
      box.append(item);
      setTimeout(() => item.remove(), kind === "err" ? 8000 : 3500);
    },

    /**
     * 执行返回 ApiResult 的调用：成功返回 data，失败弹 err toast 并返回 null。
     */
    async call(promise, okMessage) {
      const res = await promise;
      if (res && res.error) {
        this.toast(`失败: ${typeof res.error === "string" ? res.error : this.pretty(res.error)}`, "err");
        return null;
      }
      if (okMessage) this.toast(okMessage, "ok");
      return res ? res.data : null;
    },

    // ---- 业务工具 ----

    /** 壁纸类型数字 -> 名称（与 models.rs WallpaperType 对齐） */
    typeName(type) {
      return ({ 0: "不支持", 1: "图片", 2: "动图", 3: "视频", 4: "Web", 5: "Exe", 6: "列表" })[type] || String(type ?? "?");
    },

    formatBytes(n) {
      if (!n && n !== 0) return "?";
      const units = ["B", "KB", "MB", "GB"];
      let i = 0;
      let v = n;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
    },

    /**
     * 分块 base64 上传文件到 tmp（与默认皮肤 process-file 相同的 50KB 块策略）。
     * 返回 media URL（ApiResult.data）。
     */
    uploadToTmp(file, onProgress) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const buffer = new Uint8Array(reader.result);
            const CHUNK = 50000;
            const api = this.client.api;
            let lastUrl = null;
            for (let offset = 0; offset < buffer.length; offset += CHUNK) {
              if (onProgress) onProgress(Math.floor((offset / buffer.length) * 100));
              // 块之间会整文件覆盖写入，最后一块落盘即完整
              const slice = buffer.subarray(offset, Math.min(offset + CHUNK, buffer.length));
              let binary = "";
              for (let i = 0; i < slice.length; i += 0x8000) {
                binary += String.fromCharCode.apply(null, slice.subarray(i, i + 0x8000));
              }
              const res = await api.uploadToTmp(file.name, btoa(binary));
              if (res.error || !res.data) {
                reject(new Error(`上传失败: ${this.pretty(res.error)}`));
                return;
              }
              lastUrl = res.data;
            }
            if (onProgress) onProgress(100);
            resolve(lastUrl);
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error("读取文件失败"));
        reader.readAsArrayBuffer(file);
      });
    },

    /** 播放列表占位文件上传（与默认皮肤/v3 一致：库里的 .playlist 即占位文本） */
    async uploadPlaylistPlaceholder() {
      const name = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.playlist`;
      const placeholder = "占位符，表示当前是一个播放列表";
      const res = await this.client.api.uploadToTmp(name, btoa(unescape(encodeURIComponent(placeholder))));
      if (res.error || !res.data) {
        this.toast(`创建占位文件失败: ${this.pretty(res.error)}`, "err");
        return null;
      }
      return res.data;
    },

    /** 3x3 成员封面（canvas 拼接，最多 9 张；失败返回 null 走默认封面） */
    async generatePlaylistCover(memberCoverUrls) {
      try {
        const urls = memberCoverUrls.filter(Boolean).slice(0, 9);
        if (!urls.length) return null;
        const cell = 320;
        const canvas = document.createElement("canvas");
        canvas.width = cell * 3;
        canvas.height = cell * 3;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#101014";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await Promise.all(urls.map((url, i) => new Promise((done) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, (i % 3) * cell, Math.floor(i / 3) * cell, cell, cell);
            done();
          };
          img.onerror = () => done();
          img.src = url;
        })));
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const res = await this.client.api.uploadToTmp("cover.jpg", dataUrl.split(",")[1]);
        return res.error ? null : res.data;
      } catch (e) {
        console.warn("generatePlaylistCover failed:", e);
        return null;
      }
    },
  };

  window.DevSkin = DevSkin;
})();
