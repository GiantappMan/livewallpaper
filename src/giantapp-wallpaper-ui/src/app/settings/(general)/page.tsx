
"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/client/api";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { General } from "@/lib/client/types/configs/general";

const Page = () => {
    const [mounted, setMounted] = React.useState(false)
    const [config, setConfig] = React.useState<General>({} as any)

    //读取配置
    const fetchConfig = async () => {
        const config = await api.getConfig<General>("General")
        if (config.error || !config.data) {
            alert(config.error)
            return
        }

        setConfig(config.data)
    }

    // 保存配置
    const saveConfig = async (config: General) => {
        setConfig(config);
        await api.setConfig("General", {
            autoStart: config.autoStart,
            hideWindow: config.hideWindow
        });
    };

    React.useEffect(() => {
        if (!mounted) {
            setMounted(true);
            fetchConfig();
        }
    }, [mounted]);

    return <>
        {
            mounted ?
                <>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="startup">开机启动</Label>
                        <Switch id="startup" checked={config.autoStart}
                            onCheckedChange={async (e) => {
                                saveConfig({ ...config, autoStart: e });
                            }}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="minimize-after-start">启动后最小化</Label>
                        <Switch id="minimize-after-start"
                            checked={config.hideWindow}
                            onCheckedChange={async (e) => {
                                saveConfig({ ...config, hideWindow: e });
                            }}
                        />
                    </div>
                </>
                :
                <>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-32" />
                </>
        }
    </>
};

export default Page;
