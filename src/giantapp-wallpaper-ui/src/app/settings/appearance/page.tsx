"use client"

import { Button } from "@/components/ui/button";
import { themes } from "./themes";
import React from "react";
import { Label } from "@/components/ui/label";
import { useConfig } from "@/hooks/use-config";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CheckIcon,
    MoonIcon,
    SunIcon,
    DesktopIcon
} from "@radix-ui/react-icons"
import api from "@/lib/client/api";
import { ConfigAppearance } from "@/lib/client/types/config";
const Page = () => {
    const [mounted, setMounted] = React.useState(false)
    const [config, setConfig] = useConfig()
    const { setTheme: setMode, resolvedTheme: mode } = useTheme()

    const saveConfig = async (configAppearance: ConfigAppearance) => {
        setConfig(configAppearance)
        setMode(configAppearance.mode)

        await api.setConfig("Appearance", {
            theme: configAppearance.theme,
            mode: configAppearance.mode
        })
    }

    React.useEffect(() => {
        setMounted(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <>
        <div className="space-y-1.5">
            <h3 className="mb-4 text-lg font-medium">选择模式</h3>
            <div className="grid grid-cols-3 gap-2">
                {mounted ? (
                    <>
                        <Button
                            variant={"outline"}
                            size="sm"
                            onClick={() => saveConfig({ ...config, mode: "system" })}
                            className={cn(config.mode === "system" && "border-2 border-primary")}
                        >
                            <DesktopIcon className="mr-1 -translate-x-1" />
                            系统
                        </Button>
                        <Button
                            variant={"outline"}
                            size="sm"
                            onClick={() => saveConfig({ ...config, mode: "light" })}
                            className={cn(config.mode === "light" && "border-2 border-primary")}
                        >
                            <SunIcon className="mr-1 -translate-x-1" />
                            浅色
                        </Button>
                        <Button
                            variant={"outline"}
                            size="sm"
                            onClick={() => saveConfig({ ...config, mode: "dark" })}
                            className={cn(config.mode === "dark" && "border-2 border-primary")}
                        >
                            <MoonIcon className="mr-1 -translate-x-1" />
                            深色
                        </Button>
                    </>
                ) : (
                    <>
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </>
                )}
            </div>
        </div>
        <div className="space-y-1.5">
            <h3 className="mb-4 text-lg font-medium">选择颜色</h3>
            <div className="grid grid-cols-3 gap-2">
                {themes.map((theme) => {
                    const isActive = config.theme === theme.name

                    return mounted ? (
                        <Button
                            variant={"outline"}
                            size="sm"
                            key={theme.name}
                            onClick={() => {
                                saveConfig({
                                    ...config,
                                    theme: theme.name,
                                })
                            }}
                            className={cn(
                                "justify-start",
                                isActive && "border-2 border-primary"
                            )}
                            style={
                                {
                                    "--theme-primary": `hsl(${theme?.activeColor[mode === "dark" ? "dark" : "light"]
                                        })`,
                                } as React.CSSProperties
                            }
                        >
                            <span
                                className={cn(
                                    "mr-1 flex h-5 w-5 shrink-0 -translate-x-1 items-center justify-center rounded-full bg-[--theme-primary]"
                                )}
                            >
                                {isActive && <CheckIcon className="h-4 w-4 text-white" />}
                            </span>
                            {theme.label}
                        </Button>
                    ) : (
                        <Skeleton className="h-8 w-full" key={theme.name} />
                    )
                })}
            </div>
        </div>
    </>;
};

export default Page;
