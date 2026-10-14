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
    //商店版：null 未打开过 | opened 打开成功 | failed 打开失败
    const [storeResult, setStoreResult] = useState<"opened" | "failed" | null>(null);
    const [openingStore, setOpeningStore] = useState(false);
    const updateState = useUpdateState();

    useEffect(() => {
        setIsStore(apiClient.isStoreVersion());
        apiClient.getConfig<ConfigUpdate>("Update").then((res) => {
            if (!res.error && res.data) setConfig(res.data);
        });
    }, []);

    //结果提示停留一段时间后自动消失
    useEffect(() => {
        if (!storeResult) return;
        const timer = setTimeout(() => setStoreResult(null), 8000);
        return () => clearTimeout(timer);
    }, [storeResult]);

    const saveConfig = useCallback((config: ConfigUpdate) => {
        setConfig(config);
        apiClient.setConfig("Update", config);
    }, []);

    const checkStoreUpdate = useCallback(async () => {
        setOpeningStore(true);
        setStoreResult(null);
        const ok = await apiClient.checkStoreUpdate();
        setOpeningStore(false);
        setStoreResult(ok ? "opened" : "failed");
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

    const checking = updateState?.state === "checking";

    const checkButton = (onClick: () => void) => (
        <Button size="sm" disabled={checking || openingStore} onClick={onClick}>
            {(checking || openingStore) && (
                <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-2" />
            )}
            {dictionary['settings'].check_update}
        </Button>
    );

    return (
        <div className="space-y-2 pt-4">
            <h2 className="text-lg font-semibold">{dictionary['settings'].update}</h2>
            {isStore ? (
                <>
                    <div className="text-sm text-muted-foreground">{dictionary['settings'].update_store_hint}</div>
                    <div className="flex items-center space-x-2">
                        {checkButton(checkStoreUpdate)}
                        {storeResult === "opened" && (
                            <span className="text-sm text-muted-foreground">{dictionary['settings'].update_store_opened}</span>
                        )}
                        {storeResult === "failed" && (
                            <span className="text-sm text-destructive">{dictionary['settings'].update_store_open_failed}</span>
                        )}
                    </div>
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
                        {checkButton(() => apiClient.checkUpdate())}
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
