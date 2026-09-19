
"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/client/api";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfigGeneral } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandSeparator } from "@/components/ui/command";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom"
import { useCallback } from 'react';
import { i18n, localeDescriptions } from "@/i18n";
import { langDictAtom } from "@/atoms/lang";
import { useAtomValue } from "jotai";

const Page = () => {
    const dictionary = useAtomValue(langDictAtom);
    const [mounted, setMounted] = React.useState(false)
    const [config, setConfig] = React.useState<ConfigGeneral>({} as any)
    const [open, setOpen] = React.useState(false)

    //读取配置
    const fetchConfig = useCallback(async () => {
        const config = await api.getConfig<ConfigGeneral>("General")
        if (config.error || !config.data) {
            toast.error(dictionary['settings'].failed_to_read_config)
            return
        }

        console.log(config);
        setConfig(config.data)
    }, [dictionary, setConfig])

    // 保存配置
    const saveConfig = useCallback(async (config: ConfigGeneral) => {
        setConfig(config);
        await api.setConfig("General", config);
    }, [setConfig]);

    React.useEffect(() => {
        if (!mounted) {
            setMounted(true);
            fetchConfig();
        }
    }, [fetchConfig, mounted]);

    return <div className="h-[calc(100vh_-_var(--app-titlebar-h))] space-y-6">
        {
            mounted ?
                <>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold">{dictionary['settings'].general_settings}</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="startup">{dictionary['settings'].startup}</Label>
                        <Switch id="startup" checked={config.autoStart}
                            onCheckedChange={async (e) => {
                                saveConfig({ ...config, autoStart: e });
                            }}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="minimize-after-start">{dictionary['settings'].minimize_on_startup}</Label>
                        <Switch id="minimize-after-start"
                            checked={config.hideWindow}
                            onCheckedChange={async (e) => {
                                saveConfig({ ...config, hideWindow: e });
                            }}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="autostart-headless">{dictionary['settings'].auto_start_headless}</Label>
                        <Switch id="autostart-headless"
                            checked={config.autoStartHeadless ?? false}
                            disabled={!config.autoStart}
                            onCheckedChange={async (e) => {
                                saveConfig({ ...config, autoStartHeadless: e });
                            }}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="minimize-after-start">{dictionary['settings'].language}</Label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        "w-[200px] justify-between",
                                    )}
                                >
                                    {config.currentLan ? localeDescriptions[config.currentLan as keyof typeof localeDescriptions] : "Select language"}
                                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder={dictionary['settings'].search} className="h-9" />
                                    <CommandEmpty>{dictionary['settings'].not_found}</CommandEmpty>
                                    <CommandGroup>
                                        {(i18n.locales as readonly string[]).map((language) => (
                                            <CommandItem
                                                value={language}
                                                key={language}
                                                onSelect={() => {
                                                    saveConfig({
                                                        ...config,
                                                        currentLan: language
                                                    }).then(() => {
                                                        setOpen(false)
                                                        //v4：语言在启动时加载，切换后刷新页面
                                                        window.location.reload();
                                                    });
                                                }}
                                            >
                                                {localeDescriptions[language as keyof typeof localeDescriptions]}
                                                <CheckIcon
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        language === config.currentLan
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                        ))}

                                    </CommandGroup>
                                    {/* 分割线 */}
                                    <CommandSeparator />
                                    {/* 贡献你的语言，一个超链接 */}
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={() => {
                                                api.openUrl("https://github.com/GiantappMan/livewallpaper/tree/v4.x/src/giantapp-wallpaper-ui/src/dictionaries")
                                            }}
                                        >
                                            {dictionary['settings'].contribute_your_language}
                                        </CommandItem>
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </>
                :
                <>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-32" />
                </>
        }
    </div>
};

export default Page;
