"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/client/api";
import { useUpdateState } from "@/components/update-prompt";
import type { ConfigUpdate } from "@/lib/client/types/config";
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";

export function UpdateSettings() {
    const dictionary = useAtomValue(langDictAtom);
    const [isStore, setIsStore] = useState(false);
    const [config, setConfig] = useState<ConfigUpdate>({ url: "", channel: "stable" });
    const updateState = useUpdateState();

    useEffect(() => {
        setIsStore(apiClient.isStoreVersion());
        apiClient.getConfig<ConfigUpdate>("Update").then((res) => {
            if (!res.error && res.data) setConfig(res.data);
        });
    }, []);

    const saveConfig = useCallback((config: ConfigUpdate) => {
        setConfig(config);
        apiClient.setConfig("Update", config);
    }, []);

    const statusText = () => {
        if (!updateState) return "";
        switch (updateState.state) {
            case "checking":
                return dictionary['settings'].update_checking;
            case "downloading":
                return dictionary['settings'].update_downloading
                    .replace("{0}", updateState.version ?? "")
                    .replace("{1}", String(updateState.percent ?? 0));
            case "downloaded":
                return dictionary['settings'].update_downloaded.replace("{0}", updateState.version ?? "");
            case "upToDate":
                return dictionary['settings'].update_up_to_date;
            case "error":
                return updateState.error ?? "";
            default:
                return "";
        }
    };

    return (
        <div className="space-y-2 pt-4">
            <h2 className="text-lg font-semibold">{dictionary['settings'].update}</h2>
            {isStore ? (
                <>
                    <div className="text-sm text-muted-foreground">{dictionary['settings'].update_store_hint}</div>
                    <Button size="sm" onClick={() => apiClient.checkUpdate()}>
                        {dictionary['settings'].check_update}
                    </Button>
                </>
            ) : (
                <>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="update-url" className="w-24 shrink-0">{dictionary['settings'].update_address}</Label>
                        <Input id="update-url" className="w-96" value={config.url}
                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                            onBlur={() => saveConfig(config)} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label className="w-24 shrink-0">{dictionary['settings'].update_channel}</Label>
                        {(["stable", "preview"] as const).map((channel) => (
                            <Button key={channel} size="sm" variant="outline"
                                className={cn(config.channel === channel && "border-primary")}
                                onClick={() => saveConfig({ ...config, channel })}>
                                {channel === "stable"
                                    ? dictionary['settings'].channel_stable
                                    : dictionary['settings'].channel_preview}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button size="sm" onClick={() => apiClient.checkUpdate()}>
                            {dictionary['settings'].check_update}
                        </Button>
                        {updateState?.state === "downloaded" && (
                            <Button size="sm" onClick={() => apiClient.installUpdate()}>
                                {dictionary['settings'].install_now}
                            </Button>
                        )}
                        <span className="text-sm text-muted-foreground">{statusText()}</span>
                    </div>
                </>
            )}
        </div>
    );
}
