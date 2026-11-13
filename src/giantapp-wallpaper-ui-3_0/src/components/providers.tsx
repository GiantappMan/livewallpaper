"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme, type ThemeProviderProps } from "next-themes"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { useConfig } from '@/hooks/use-config';
import { useCallback, useEffect, useState } from "react"
import api from "@/lib/client/api";
import { ConfigAppearance } from "@/lib/client/types/config"
import { Toaster } from "sonner"
import { setGlobal } from "@/i18n-config";
import { useMounted } from "@/hooks/use-mounted";
import shellApi from "@/lib/client/shell";
import { Provider as JotaiProvider, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { langAtom, langDictAtom } from "@/atoms/lang"
import { rootStore } from "@/atoms/store"

const LangInitializer = ({ lang, dictionary }: { lang: string, dictionary: any }) => {
    // 首帧同步写入 store：JotaiProvider 下此时还没有订阅者，不会触发
    // “渲染期间更新其他组件”告警，且子组件（SideMenu 等）首帧就能拿到完整字典
    useHydrateAtoms([[langAtom, lang], [langDictAtom, dictionary]]);
    // 后续 props 变化（同布局内切换语言 / HMR 重取）只能在提交后同步，
    // 渲染期间写已订阅的 atom 会同步通知订阅组件导致 React 告警
    const setLang = useSetAtom(langAtom);
    const setLangDictionary = useSetAtom(langDictAtom);
    useEffect(() => {
        setLang(lang);
        setLangDictionary(dictionary);
    }, [lang, dictionary, setLang, setLangDictionary]);
    return <></>;
}
export function Providers({ lang, children, dictionary, ...props }: { children: React.ReactNode, dictionary: any, lang: string; } & ThemeProviderProps) {
    const [config] = useConfig();
    const mounted = useMounted()
    if (!mounted)
        return <></>

    api.onRefreshPage(() => {
        console.log("refresh page");
        window.location.reload();
    });

    // setGlobal(dictionary);
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode')
    const defaultMode = !!mode ? mode : config.mode;
    console.log("defaultMode", defaultMode)
    if (!!mode) {
        localStorage.setItem("theme", mode);
    }

    shellApi.hideLoading();
    return (
        <>
            <JotaiProvider store={rootStore}>
                {/* 必须在provider里面，调用jotai才有效 */}
                <LangInitializer lang={lang} dictionary={dictionary} />
                <NextThemesProvider defaultTheme={defaultMode} {...props}>
                    <TooltipProvider>{children}</TooltipProvider>
                </NextThemesProvider>
                <Toaster closeButton={true} position="top-center" />
            </JotaiProvider>
        </>
    )
}
