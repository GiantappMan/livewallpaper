"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
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
import { langAtom, langDictAtom } from "@/atoms/lang"
import { rootStore } from "@/atoms/store"

const LangInitializer = ({ lang, dictionary }: { lang: string, dictionary: any }) => {
    const setLang = useSetAtom(langAtom);
    const setLangDictionary = useSetAtom(langDictAtom);
    setLang(lang);
    setLangDictionary(dictionary);
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
