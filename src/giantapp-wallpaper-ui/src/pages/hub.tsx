"use client";

import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { langAtom } from "@/atoms/lang";
import api from "@/lib/client/api";

const HUB_ADDRESS =
  import.meta.env.VITE_HUB_ADDRESS || "https://wallpaper.giantapp.cn";

const HubPage = () => {
  const lang = useAtomValue(langAtom);
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target");
  const [loading, setLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState<string | undefined>();
  // 登录窗口完成 OAuth 回调后后端广播 hub-session-changed，
  // 递增此值让 iframe 重挂载，以携带新会话重新加载。
  const [sessionNonce, setSessionNonce] = useState(0);

  useEffect(() => {
    api.onHubSessionChanged(() => setSessionNonce((n) => n + 1));
  }, []);

  useEffect(() => {
    if (sessionNonce > 0) setLoading(true);
  }, [sessionNonce]);

  useEffect(() => {
    setLoading(true);
    // 深链 target 参数：#/hub?target=xxx
    if (target) {
      setIframeSrc(target);
      return;
    }
    const defaultMode = localStorage.getItem("theme") || "system";
    setIframeSrc(`${HUB_ADDRESS}/${lang}/explorer?mode=${defaultMode}`);
  }, [lang, target]);

  return (
    <div className="relative w-full min-h-[calc(100vh_-_var(--app-titlebar-h))]">
      {loading && (
        <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[calc(100vh_-_var(--app-titlebar-h))] pb-20 h-ful">
          {Array.from({ length: 12 }).map((_, i) => (
            <div className="flex flex-col space-y-3" key={i}>
              <Skeleton className="h-[180px]  rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {iframeSrc && (
        <iframe
          key={sessionNonce}
          allowFullScreen={true}
          className={`w-full min-h-[calc(100vh_-_var(--app-titlebar-h))] ${loading ? "hidden" : "block"}`}
          src={iframeSrc}
          onLoad={() => setLoading(false)}
        />
      )}

      {/* 账号登录入口：hub 在跨站 iframe 里无法完成 GitHub/微信授权
          （授权页拒绝嵌套、会话 Cookie 受第三方限制），改由顶层窗口完成 */}
      <button
        type="button"
        title="账号登录（在独立窗口打开社区页，支持 GitHub / 微信）"
        onClick={() => iframeSrc && api.openCommunityWindow(iframeSrc)}
        className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-md opacity-40 transition-opacity hover:text-primary hover:opacity-100"
      >
        <CircleUserRound className="h-5 w-5" />
      </button>
    </div>
  );
};

export default HubPage;
