
"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/client/api";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfigGeneral } from "@/lib/client/types/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { useRouter } from 'next/navigation'
import { getGlobal } from "@/i18n-config";
import { useCallback } from 'react';

const Page = () => {
    const dictionary = getGlobal();
    const router = useRouter()
    const languages = [
        { label: "简体中文", value: "zh" },
        { label: "English", value: "en" },
    ] as const
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

    return <div className="h-screen space-y-6">
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
                                    {config.currentLan
                                        ? languages.find(
                                            (language) => language.value === config.currentLan
                                        )?.label
                                        : "Select language"}
                                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder={dictionary['settings'].search} className="h-9" />
                                    <CommandEmpty>{dictionary['settings'].not_found}</CommandEmpty>
                                    <CommandGroup>
                                        {languages.map((language) => (
                                            <CommandItem
                                                value={language.label}
                                                key={language.value}
                                                onSelect={() => {
                                                    saveConfig({
                                                        ...config,
                                                        currentLan: language.value
                                                    }).then(() => {
                                                        setOpen(false)
                                                        //重定向
                                                        router.push(`/${language.value}/settings/`)
                                                    });
                                                }}
                                            >
                                                {language.label}
                                                <CheckIcon
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        language.value === config.currentLan
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                        ))}
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
