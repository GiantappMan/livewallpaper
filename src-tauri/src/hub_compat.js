/**
 * Hub 兼容层：把 v3 的 WebView2 COM 桥（window.chrome.webview.hostObjects）
 * 翻译为 Tauri invoke。社区页（wallpaper.giantapp.cn，iframe）无需改造即可工作。
 *
 * 传输方式：
 *  - 本帧有 __TAURI_INTERNALS__（我们自己的页面）→ 直接 invoke
 *  - 远程 iframe → postMessage 中继到顶层窗口，由顶层接收器执行
 *
 * 本脚本通过 initialization_script 注入所有 frame。
 */
(function () {
  'use strict';
  if (window.__WP_COMPAT__) return;
  window.__WP_COMPAT__ = true;

  var ALLOWED_ORIGINS = [
    'https://wallpaper.giantapp.cn',
    'https://www.giantapp.cc',
    'https://livewallpaper.giantapp.cn',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  function originOf(loc) {
    return loc.origin || loc.protocol + '//' + loc.host;
  }

  function isAllowedOrigin(origin) {
    return ALLOWED_ORIGINS.indexOf(origin) >= 0;
  }

  // ---------- 顶层窗口：接收器（把中继请求翻译成 invoke） ----------

  // 方法表：v3 COM 桥方法 -> tauri 命令 + 参数/返回值转换
  var __WP_METHOD_TABLE__ = (function () {
    var s = function (v) { return v === undefined || v === null ? null : v; };
    var j = function (v) { return JSON.stringify(v === undefined ? null : v); };
    var p = function (v) { return typeof v === 'string' ? JSON.parse(v) : v; };
    var table = {
      GetConfig: { cmd: 'get_config', args: function (a) { return { key: a[0] }; }, json: true },
      SetConfig: { cmd: 'set_config', args: function (a) { return { key: a[0], value: p(a[1]) }; } },
      GetWallpapers: { cmd: 'get_wallpapers', json: true },
      GetScreens: { cmd: 'get_screens', json: true },
      GetPlayingStatus: { cmd: 'get_playing_status', json: true },
      ShowWallpaper: { cmd: 'show_wallpaper', args: function (a) { return { wallpaper: p(a[0]) }; }, json: true },
      PauseWallpaper: { cmd: 'pause_wallpaper', args: function (a) { return { screenIndex: s(a[0]) }; } },
      ResumeWallpaper: { cmd: 'resume_wallpaper', args: function (a) { return { screenIndex: s(a[0]) }; } },
      StopWallpaper: { cmd: 'stop_wallpaper', args: function (a) { return { screenIndex: s(a[0]) }; } },
      PlayNextInPlaylist: { cmd: 'play_next_in_playlist', args: function (a) { return { wallpaper: p(a[0]) }; } },
      PlayPrevInPlaylist: { cmd: 'play_prev_in_playlist', args: function (a) { return { wallpaper: p(a[0]) }; } },
      SetVolume: {
        cmd: 'set_volume',
        args: function (a) {
          return { volume: parseInt(a[0], 10) || 0, screenIndex: isNaN(parseInt(a[1], 10)) ? null : parseInt(a[1], 10) };
        },
      },
      GetWallpaperTime: { cmd: 'get_wallpaper_time', args: function (a) { return { screenIndex: s(a[0]) }; }, json: true },
      SetProgress: {
        cmd: 'set_progress',
        args: function (a) { return { progress: parseFloat(a[0]) || 0, screenIndex: s(a[1]) }; },
      },
      GetVersion: { cmd: 'get_version' },
      GetRealThemeMode: { cmd: 'get_real_theme_mode' },
      OpenUrl: { cmd: 'open_url', args: function (a) { return { url: a[0] }; } },
      Explore: { cmd: 'explore', args: function (a) { return { path: a[0] }; } },
      OpenLogFolder: { cmd: 'open_log_folder' },
      OpenStoreReview: { cmd: 'open_store_review', args: function (a) { return { defaultUrl: a[0] }; }, json: true },
      UploadToTmp: { cmd: 'upload_to_tmp', args: function (a) { return { fileName: a[0], content: a[1] }; } },
      CreateWallpaperNew: { cmd: 'create_wallpaper_new', args: function (a) { return { wallpaper: p(a[0]) }; }, json: true },
      UpdateWallpaperNew: {
        cmd: 'update_wallpaper_new',
        args: function (a) { return { wallpaper: p(a[0]), oldFileUrl: a[1] }; },
        json: true,
      },
      // v3 已废弃的四参更新接口，兼容性返回成功
      UpdateWallpaper: { result: true },
      DeleteWallpaper: { cmd: 'delete_wallpaper', args: function (a) { return { wallpaper: p(a[0]) }; }, json: true },
      SetWallpaperSetting: {
        cmd: 'set_wallpaper_setting',
        args: function (a) { return { setting: p(a[0]), wallpaper: p(a[1]) }; },
        json: true,
      },
      DownloadWallpaper: {
        cmd: 'download_wallpaper',
        args: function (a) { return { coverUrl: a[0] || null, wallpaperUrl: a[1], meta: p(a[2]) }; },
        json: true,
      },
      CancelDownloadWallpaper: { cmd: 'cancel_download_wallpaper', args: function (a) { return { id: a[0] }; }, json: true },
      GetDownloadItemStatus: { cmd: 'get_download_item_status', args: function (a) { return { id: a[0] }; }, json: true },
      GetDonwloadStatus: { cmd: 'get_download_status', json: true },
      GetDownloadStatus: { cmd: 'get_download_status', json: true },
      ShowShell: { cmd: 'show_shell', args: function (a) { return { path: s(a[0]) }; } },
      ShowFolderDialog: { cmd: 'show_folder_dialog' },
      HideLoading: { cmd: 'hide_loading' },
      CloseWindow: { cmd: 'hide_loading' },
    };
    return table;
  })();

  function invoke(method, args) {
    var spec = __WP_METHOD_TABLE__[method];
    if (!spec) return Promise.reject(new Error('WP compat: unknown method ' + method));
    if (spec.result !== undefined) return Promise.resolve(spec.result);
    return window.__TAURI_INTERNALS__.invoke(spec.cmd, spec.args ? spec.args(args) : {}).then(function (r) {
      return spec.json ? JSON.stringify(r === undefined ? null : r) : r;
    });
  }

  function installReceiver() {
    if (window.__WP_RECEIVER__) return;
    if (!window.__TAURI_INTERNALS__) {
      // 初始化脚本可能早于 Tauri 内核注入执行，稍后重试
      setTimeout(installReceiver, 100);
      return;
    }
    window.__WP_RECEIVER__ = true;

    // 执行中继请求
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.__wpRelay !== 1) return;
      if (!isAllowedOrigin(e.origin)) return;
      var d = e.data;
      invoke(d.method, d.args)
        .then(function (res) {
          e.source.postMessage({ __wpRelay: 2, id: d.id, ok: true, data: res }, '*');
        })
        .catch(function (err) {
          e.source.postMessage({ __wpRelay: 2, id: d.id, ok: false, error: String(err) }, '*');
        });
    });

    // 把引擎事件转发到所有 frame（v3 事件名）
    var forward = function (tauriName, v3Name, payload) {
      var msg = { __wpRelay: 3, name: v3Name, detail: JSON.stringify(payload === undefined ? null : payload) };
      try { window.dispatchEvent(new MessageEvent('message', { data: msg, origin: location.origin })); } catch (err) {}
      for (var i = 0; i < window.frames.length; i++) {
        try { window.frames[i].postMessage(msg, '*'); } catch (err) {}
      }
    };
    var listen = function (name, cb) {
      if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
        window.__TAURI__.event.listen(name, function (e) { cb(e.payload); });
      } else if (window.__TAURI_INTERNALS__) {
        // 兜底：直接用内部 API
        try {
          window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
            event: name,
            target: { kind: 'Any' },
            handler: cb,
          });
        } catch (err) {}
      }
    };
    listen('refresh-page', function () { forward('refresh-page', 'RefreshPageEvent'); });
    listen('download-status-changed', function (status) { forward('download-status-changed', 'DownloadStatusChangedEvent', status); });
  }

  // ---------- 任意 frame：chrome.webview 垫片 ----------

  function installShim() {
    if (window.__WP_SHIM__) return;
    window.__WP_SHIM__ = true;
    var listeners = {}; // name -> [cb]
    var seq = 0;
    var pending = {};

    function relayCall(method, args) {
      // 注：远程 iframe 里即使被注入了 __TAURI_INTERNALS__，直连 invoke 也会失败
      // （WebView2 0x80070490），因此远程帧一律走 postMessage 中继。
      return new Promise(function (resolve, reject) {
        var id = ++seq;
        pending[id] = { resolve: resolve, reject: reject };
        window.parent.postMessage({ __wpRelay: 1, id: id, method: method, args: args }, '*');
        setTimeout(function () {
          if (pending[id]) {
            delete pending[id];
            reject(new Error('WP compat: relay timeout for ' + method));
          }
        }, 60000);
      });
    }



    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d) return;
      if (d.__wpRelay === 2 && pending[d.id]) {
        var p = pending[d.id];
        delete pending[d.id];
        if (d.ok) p.resolve(d.data);
        else p.reject(new Error(d.error || 'relay error'));
      } else if (d.__wpRelay === 3) {
        var cbs = (listeners[d.name] || []).slice();
        for (var i = 0; i < cbs.length; i++) {
          try { cbs[i]({ detail: d.detail, data: d.detail }); } catch (err) {}
        }
      }
    });

    function makeBridge() {
      var handler = {
        get: function (target, prop) {
          if (prop === 'addEventListener') {
            return function (name, cb) {
              (listeners[name] = listeners[name] || []).push(cb);
            };
          }
          if (prop === 'removeEventListener') {
            return function (name, cb) {
              var arr = listeners[name] || [];
              var i = arr.indexOf(cb);
              if (i >= 0) arr.splice(i, 1);
            };
          }
          if (typeof prop === 'string' && /^[A-Z]/.test(prop)) {
            return function () {
              return relayCall(prop, Array.prototype.slice.call(arguments));
            };
          }
          return target[prop];
        },
      };
      return new Proxy({}, handler);
    }

    // WebView2 在 iframe 里也会原生提供 chrome.webview.hostObjects 空壳
    // （调用即报 0x80070490 Element not found），必须强制覆盖为垫片。
    var bridge = makeBridge();
    var shimObjects = { api: bridge, shell: bridge };
    var installed = false;
    try {
      window.chrome = window.chrome || {};
      window.chrome.webview = window.chrome.webview || {};
      window.chrome.webview.hostObjects = shimObjects;
      installed = window.chrome.webview.hostObjects.api === bridge;
    } catch (e) {
      installed = false;
    }
    if (!installed) {
      // 原生对象不可扩展：整体替换 window.chrome
      try {
        Object.defineProperty(window, 'chrome', {
          value: { webview: { hostObjects: shimObjects } },
          writable: true,
          configurable: true,
        });
        installed = window.chrome.webview.hostObjects.api === bridge;
      } catch (e2) {
        log_noop();
      }
    }
    if (!installed) {
      log?.('WP compat: failed to install hostObjects shim');
    }

    // 把页面标题转发给父窗口（详情弹窗外壳用它同步窗口标题）
    if (window.parent !== window) {
      var postTitle = function () {
        try {
          window.parent.postMessage({ __wpRelay: 4, title: document.title }, '*');
        } catch (err) {}
      };
      window.addEventListener('load', postTitle);
      // SPA 会替换/修改 <title>，监听 head 变化持续同步
      if (window.MutationObserver && document.head) {
        new MutationObserver(postTitle).observe(document.head, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      }
    }
  }

  function log_noop() {}

  // ---------- 装配 ----------

  // 注意：remote capability 会让远程 iframe 也注入 __TAURI_INTERNALS__，
  // 但远程帧直连应用命令会被 ACL 拒绝，因此两者独立判断：
  if (window.__TAURI_INTERNALS__) {
    // 有内核注入的 frame：安装接收器（中继的执行端）
    installReceiver();
  }
  if (isAllowedOrigin(originOf(window.location))) {
    // 允许的远程页面（社区 Hub 等）：安装 v3 桥垫片
    installShim();
  }
  // 兜底：万一初始化顺序导致顶层未装接收器，DOM 就绪后再试一次
  if (window === window.top && !window.__WP_RECEIVER__) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { installReceiver(); });
    } else {
      installReceiver();
    }
  }
})();
