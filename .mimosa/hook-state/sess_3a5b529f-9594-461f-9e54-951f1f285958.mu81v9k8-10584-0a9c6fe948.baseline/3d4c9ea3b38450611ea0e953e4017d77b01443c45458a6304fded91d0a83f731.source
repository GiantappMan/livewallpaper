"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { langAtom } from "@/atoms/lang";
import api from "@/lib/client/api";

const HUB_ADDRESS =
  import.meta.env.VITE_HUB_ADDRESS || "https://wallpaper.giantapp.cn";

/**
 * 社区页：社区站不再以跨站 iframe 嵌入（第三方上下文会导致登录/退出/换号
 * 无法同步），改为在本容器区域挂载一个独立 WebView——它的顶层文档就是社区
 * 站本身（第一方上下文），行为与普通浏览器完全一致，且不影响主窗口布局。
 *
 * 前端只负责上报容器的矩形（跟随窗口缩放/布局变化），WebView 的创建、
 * 定位与显隐都在 Rust 侧完成；切走 tab 时仅隐藏，页面状态得以保留。
 */
const HubPage = () => {
  const lang = useAtomValue(langAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target");
  const defaultMode = localStorage.getItem("theme") || "system";
  const url = target || `${HUB_ADDRESS}/${lang}/explorer?mode=${defaultMode}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const report = (withUrl: boolean) => {
      const r = el.getBoundingClientRect();
      void api.setCommunityWebview({
        visible: true,
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
        ...(withUrl ? { url } : {}),
      });
    };
    const throttled = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => report(false));
    };

    // 首帧布局完成后再上报（rect 需要真实布局值）
    raf = requestAnimationFrame(() => report(true));
    const ro = new ResizeObserver(throttled);
    ro.observe(el);
    window.addEventListener("resize", throttled);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", throttled);
      // 切走 tab：仅隐藏，保留页面状态
      void api.setCommunityWebview({
        visible: false,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });
    };
  }, [url]);

  return (
    <div className="relative w-full min-h-[calc(100vh_-_var(--app-titlebar-h))]">
      {/* 社区 WebView 的占位区域（Rust 侧按此矩形挂载） */}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
};

export default HubPage;
