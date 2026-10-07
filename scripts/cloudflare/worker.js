// 巨应壁纸更新分发 Worker：把 R2 桶里的更新清单 / 安装包 / 界面热更新包
// 以静态文件形式对外提供。
//
// 路径即 R2 对象 key，例如：
//   GET /stable.json                    -> s3://<bucket>/stable.json
//   GET /preview.json                   -> s3://<bucket>/preview.json
//   GET /ui.json                        -> s3://<bucket>/ui.json
//   GET /dl/GiantappWallpaper_...exe    -> s3://<bucket>/dl/...
//   GET /ui/ui-<version>.zip            -> s3://<bucket>/ui/...
//
// 仅开放只读 GET/HEAD；无任何凭据写在仓库，绑定经 wrangler.toml 完成。

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405 });
    }
    const url = new URL(request.url);
    let key;
    try {
      key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    } catch {
      return new Response("bad request", { status: 400 });
    }

    // 根路径：简要用法说明
    if (key === "" || key === "index.html") {
      return new Response(
        "GiantappWallpaper update channel.\n\n" +
          "GET /stable.json  /preview.json  /ui.json\n" +
          "GET /dl/<installer.exe>  GET /ui/ui-<version>.zip\n",
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    // 防路径穿越
    if (key.includes("..") || key.includes("\\")) {
      return new Response("not found", { status: 404 });
    }

    // 固定最新下载入口：官网 / 壁纸服务端的下载地址只需指向这里，
    // 每次发布后自动 302 到对应通道清单里的当前安装包，无需改服务端
    if (key === "dl/latest" || key === "dl/latest-preview") {
      const manifestKey = key === "dl/latest" ? "stable.json" : "preview.json";
      const manifestObj = await env.BUCKET.get(manifestKey);
      if (!manifestObj) return new Response("not found", { status: 404 });
      let target;
      try {
        target = (await manifestObj.json()).url;
      } catch {
        return new Response("upstream manifest broken", { status: 502 });
      }
      if (!target || !/^https:\/\//.test(target)) {
        return new Response("upstream manifest broken", { status: 502 });
      }
      return Response.redirect(target, 302);
    }

    const obj = await env.BUCKET.get(key);
    if (!obj) {
      return new Response("not found", { status: 404 });
    }
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    // 清单随时可能更新不缓存；安装包/zip 大文件允许边缘缓存
    headers.set("cache-control", key.endsWith(".json") ? "no-cache" : "public, max-age=3600");
    headers.set("access-control-allow-origin", "*");
    return new Response(request.method === "HEAD" ? null : obj.body, { headers });
  },
};
