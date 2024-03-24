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
import { useSearchParams } from 'next/navigation'
import { useMounted } from "@/hooks/use-mounted";
import shellApi from "@/lib/client/shell";

export function ThemeProvider({ children, dictionary, ...props }: { children: React.ReactNode, dictionary: any } & ThemeProviderProps) {
    const [config] = useConfig();
    const searchParams = useSearchParams()
    const mounted = useMounted()
    if (!mounted)
        return <></>

    api.onRefreshPage(() => {
        console.log("refresh page");
        window.location.reload();
    });

    setGlobal(dictionary);
    const mode = searchParams.get('mode')
    const defaultMode = !!mode ? mode : config.mode;
    console.log("defaultMode", defaultMode)
    if (!!mode) {
        localStorage.setItem("theme", mode);
    }

    shellApi.hideLoading();
    return (
        <>
            <NextThemesProvider defaultTheme={defaultMode} {...props}>
                <TooltipProvider>{children}</TooltipProvider>
            </NextThemesProvider>
            <Toaster closeButton={true} position="top-center" />
        </>
    )
}
