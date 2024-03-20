"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { defaultConfig, useConfig } from '@/hooks/use-config';
import { useCallback, useEffect, useState } from "react"
import api from "@/lib/client/api";
import { ConfigAppearance } from "@/lib/client/types/config"
import { Toaster } from "sonner"
import { setGlobal } from "@/i18n-config";
import { useSearchParams } from 'next/navigation'
import shellApi from "@/lib/client/shell";

export function ThemeProvider({ children, dictionary, ...props }: { children: React.ReactNode, dictionary: any } & ThemeProviderProps) {
    const searchParams = useSearchParams()
    const dark = searchParams.get('dark')
    console.log("test", dark);

    const { setTheme: setMode, resolvedTheme: mode } = useTheme()
    const [defaultTheme, setDefaultTheme] = useState(!!dark ? "dark" : "system");
    const [mounted, setMounted] = useState(false);
    setGlobal(dictionary);
    const [_, setConfig] = useConfig()
    //读取主题设置
    const fetchConfig = useCallback(async () => {
        const { data } = await api.getConfig<ConfigAppearance>("Appearance");
        setConfig(data || defaultConfig);

        //尝试修复偶尔主题色不一致
        if (data) {
            localStorage.setItem("theme", data.mode);
            setDefaultTheme(data.mode);
            setMode(data.mode);
        }
        setMounted(true);
        shellApi.hideLoading();
        return data;
    }, [setConfig, setMode]);

    useEffect(() => {
        fetchConfig();

        api.onRefreshPage(() => {
            console.log("refresh page");
            window.location.reload();
        });
    }, [fetchConfig]);

    return (
        <>
            {mounted && <NextThemesProvider defaultTheme={defaultTheme} {...props}>
                <TooltipProvider>{children}</TooltipProvider>
            </NextThemesProvider>
            }
            <Toaster closeButton={true} position="top-center" />
        </>
    )
}
