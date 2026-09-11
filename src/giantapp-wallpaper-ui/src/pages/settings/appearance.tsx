"use client"

import { Button } from "@/components/ui/button";
import { themes } from "./themes";
import React from "react";
// import { Label } from "@/components/ui/label";
import { useConfig } from "@/hooks/use-config";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CheckIcon,
    DesktopIcon,
    ExternalLinkIcon,
    MoonIcon,
    SunIcon
} from "@radix-ui/react-icons"
import api from "@/lib/client/api";
import { ConfigAppearance, SkinInfo } from "@/lib/client/types";
import { langDictAtom } from "@/atoms/lang";
import { useAtomValue } from "jotai";

const Page = () => {
    const dictionary = useAtomValue(langDictAtom);
    const [mounted, setMounted] = React.useState(false)
    const [config, setConfig] = useConfig()
    const { setTheme: setMode, resolvedTheme: mode } = useTheme()
    const [skins, setSkins] = React.useState<SkinInfo[]>([])

    const saveConfig = async (configAppearance: ConfigAppearance) => {
        setConfig(configAppearance)

        // 全量保存：后端 set_config 是整体替换，缺字段会被清掉
        await api.setConfig("Appearance", configAppearance)
    }

    const fetchSkins = React.useCallback(async () => {
        const res = await api.listSkins()
        if (res.data) setSkins(res.data)
    }, [])

    React.useEffect(() => {
        setMounted(true)
        fetchSkins()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const applySkin = async (skin: SkinInfo) => {
        if (!skin.valid || skin.id === config.skin) return
        const res = await api.setActiveSkin(skin.id)
        if (res.error) {
            alert(String(res.error))
            return
        }
        // 本地同步；后端会重建主窗口加载新皮肤
        setConfig({ ...config, skin: skin.id })
    }

    return <div className="h-[calc(100vh_-_var(--app-titlebar-h))] space-y-6">
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{dictionary['settings'].appearance_settings}</h1>
        </div>
        <div className="space-y-2">
            <h2 className="font-semibold mt-4">{dictionary['settings'].theme_mode}</h2>
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
                            {dictionary['settings'].system}
                        </Button>
                        <Button
                            variant={"outline"}
                            size="sm"
                            onClick={() => saveConfig({ ...config, mode: "light" })}
                            className={cn(config.mode === "light" && "border-2 border-primary")}
                        >
                            <SunIcon className="mr-1 -translate-x-1" />
                            {dictionary['settings'].light_mode}
                        </Button>
                        <Button
                            variant={"outline"}
                            size="sm"
                            onClick={() => saveConfig({ ...config, mode: "dark" })}
                            className={cn(config.mode === "dark" && "border-2 border-primary")}
                        >
                            <MoonIcon className="mr-1 -translate-x-1" />
                            {dictionary['settings'].dark_mode}
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
        <div className="space-y-2">
            <h2 className="font-semibold mt-4">{dictionary['settings'].color_picker}</h2>
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
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold mt-4">{dictionary['settings'].skin}</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => api.openSkinsFolder()}
                >
                    <ExternalLinkIcon className="mr-1" />
                    {dictionary['settings'].skin_open_folder}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                {dictionary['settings'].skin_hint}
            </p>
            <div className="grid grid-cols-3 gap-2">
                {mounted ? skins.map((skin) => {
                    const isActive = config.skin === skin.id
                    return (
                        <Button
                            variant={"outline"}
                            size="sm"
                            key={skin.id}
                            title={skin.invalidReason ?? skin.description}
                            disabled={!skin.valid}
                            onClick={() => applySkin(skin)}
                            className={cn(
                                "justify-start",
                                isActive && "border-2 border-primary"
                            )}
                        >
                            <span
                                className={cn(
                                    "mr-1 flex h-5 w-5 shrink-0 -translate-x-1 items-center justify-center rounded-full bg-primary"
                                )}
                            >
                                {isActive && <CheckIcon className="h-4 w-4 text-white" />}
                            </span>
                            <span className="truncate">
                                {skin.name}
                                <span className="ml-1 text-xs text-muted-foreground">
                                    {skin.builtin
                                        ? ""
                                        : skin.type === "style"
                                            ? dictionary['settings'].skin_type_style
                                            : dictionary['settings'].skin_type_app}
                                    {skin.valid ? "" : dictionary['settings'].skin_invalid}
                                </span>
                            </span>
                        </Button>
                    )
                }) : (
                    <>
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </>
                )}
            </div>
        </div>
    </div>;
};

export default Page;
