"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { langAtom } from "@/atoms/lang";

const HUB_ADDRESS =
  import.meta.env.VITE_HUB_ADDRESS || "https://wallpaper.giantapp.cn";

const HubPage = () => {
  const lang = useAtomValue(langAtom);
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target");
  const [loading, setLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState<string | undefined>();

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
    <div className="w-full min-h-[calc(100vh_-_var(--app-titlebar-h))]">
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
          allowFullScreen={true}
          className={`w-full min-h-[calc(100vh_-_var(--app-titlebar-h))] ${loading ? "hidden" : "block"}`}
          src={iframeSrc}
          onLoad={() => setLoading(false)}
        />
      )}
    </div>
  );
};

export default HubPage;
