"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";
import { Provider as JotaiProvider, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import { langAtom, langDictAtom } from "@/atoms/lang";
import { rootStore } from "@/atoms/store";
import { useConfig } from "@/hooks/use-config";
import { useMounted } from "@/hooks/use-mounted";
import api from "@/lib/client/api";
import shellApi from "@/lib/client/shell";
import { getDictionary } from "@/i18n";
import type { ConfigAppearance, ConfigGeneral } from "@/lib/client/types";

/** 启动引导：从后端读取语言/外观配置，注册全局事件。 */
function Bootstrap({ children }: { children: React.ReactNode }) {
  const setLang = useSetAtom(langAtom);
  const setLangDictionary = useSetAtom(langDictAtom);
  const navigate = useNavigate();
  const [config, setConfig] = useConfig();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const general = await api.getConfig<ConfigGeneral>("General");
      const appearance = await api.getConfig<ConfigAppearance>("Appearance");
      if (cancelled) return;

      let lang = general.data?.currentLan || "en";
      setLang(lang);
      setLangDictionary(getDictionary(lang));
      document.documentElement.lang = lang;

      if (appearance.data) {
        setConfig(appearance.data);
      }

      // 全局事件
      api.initEvents();
      listen<{ mode: string }>("system-theme-changed", (e) => {
        if (localStorage.getItem("config")) {
          const stored = JSON.parse(localStorage.getItem("config")!);
          if (stored.mode === "system" || !stored.mode) {
            localStorage.setItem("theme", e.payload.mode);
            // next-themes 监听 storage 事件（跨窗口），本窗口手动刷新类名
            const root = document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(e.payload.mode);
          }
        }
      });

      shellApi.hideLoading();
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 深链/托盘导航
  React.useEffect(() => {
    const un = listen<any>("navigate", (e) => {
      const payload = e.payload || {};
      if (payload.target) {
        navigate(`/hub?target=${encodeURIComponent(payload.target)}`);
      } else if (payload.path) {
        navigate(`/${payload.path.replace(/^\/+/, "")}`);
      }
    });
    return () => {
      un.then((f) => f());
    };
  }, [navigate]);

  if (!ready) return null;
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  if (!mounted) return <></>;

  return (
    <JotaiProvider store={rootStore}>
      <Bootstrap>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Toaster closeButton={true} position="top-center" />
      </Bootstrap>
    </JotaiProvider>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config] = useConfig();
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={config.mode || "system"}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
