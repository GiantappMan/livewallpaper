"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
    //所选通道清单上的最新版本号（只读查询，不下载），切通道时展示给用户决定是否重装
    const [channelLatest, setChannelLatest] = useState("");
    //当前应用版本号
    const [currentVersion, setCurrentVersion] = useState("");
    //本次启动时应用实际所在的通道（后端安装记录优先，未知则取当前所选通道）
    const [runtimeChannel, setRuntimeChannel] = useState<string | null>(null);

    //查询指定通道的最新版本号（只读，不触发下载）
    const refreshChannelLatest = useCallback((channel: string) => {
        setChannelLatest("");
        apiClient.getChannelLatestVersion(channel).then(setChannelLatest);
    }, []);

    useEffect(() => {
        apiClient.isStoreVersion().then(setIsStore);
        apiClient.getVersion().then((res) => {
            if (!res.error && res.data) setCurrentVersion(res.data);
        });
        apiClient.getConfig<ConfigUpdate>("Update").then((res) => {
            if (!res.error && res.data) {
                setConfig(res.data);
                setRuntimeChannel(res.data.installedChannel || res.data.channel);
                setChannelLatest("");
                apiClient.getChannelLatestVersion(res.data.channel).then(setChannelLatest);
            }
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

    //所选通道与本次启动所在通道不一致：切通道需要重装，点检查更新时告知后端跳过版本比较
    const channelSwitched = runtimeChannel !== null && runtimeChannel !== config.channel;

    const channelName = (channel: "stable" | "preview") =>
        channel === "stable" ? dictionary['settings'].channel_stable : dictionary['settings'].channel_preview;

    const statusText = () => {
        if (!updateState) return "";
        switch (updateState.state) {
            case "checking":
                return dictionary['settings'].update_checking;
            case "downloaded":
                return dictionary['settings'].update_downloaded.replace("{0}", updateState.version ?? "");
            case "upToDate":
            case "idle":
                //切通道后提示需重装（版本号在上方版本信息里展示），覆盖过期的状态文案
                if (channelSwitched) return dictionary['settings'].update_channel_switch_hint;
                return updateState.state === "upToDate" ? dictionary['settings'].update_up_to_date : "";
            case "error":
                return updateState.error ?? "";
            default:
                return "";
        }
    };

    const checking = updateState?.state === "checking";
    const downloading = updateState?.state === "downloading";
    const downloaded = updateState?.state === "downloaded";

    const spinner = (
        <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-2" />
    );

    return (
        <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold">{dictionary['settings'].update}</h2>
            {isStore ? (
                <>
                    <div className="text-sm text-muted-foreground">{dictionary['settings'].update_store_hint}</div>
                    <div className="flex items-center space-x-2">
                        <Button size="sm" disabled={checking || openingStore} onClick={checkStoreUpdate}>
                            {(checking || openingStore) && spinner}
                            {dictionary['settings'].check_update}
                        </Button>
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
                    {/* 版本概览 + 通道选择 + 操作区 */}
                    <div className="rounded-lg border p-4 space-y-4 max-w-2xl">
                        <div className="flex items-center gap-4">
                            <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground">{dictionary['settings'].current_version}</div>
                                <div className="text-sm font-medium">{currentVersion || "-"}</div>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground">
                                    {`${dictionary['settings'].update_latest_version} · ${channelName(config.channel)}`}
                                </div>
                                <div className="text-sm font-medium">{channelLatest || "-"}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground shrink-0">{dictionary['settings'].update_channel}</span>
                            <div className="inline-flex rounded-md border p-0.5">
                                {(["stable", "preview"] as const).map((channel) => (
                                    <button key={channel} type="button"
                                        className={cn("rounded-[5px] px-3 py-1 text-sm transition-colors",
                                            config.channel === channel
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground")}
                                        onClick={() => {
                                            saveConfig({ ...config, channel });
                                            refreshChannelLatest(channel);
                                        }}>
                                        {channelName(channel)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 下载中显示进度条和取消，其余状态显示操作按钮和文案 */}
                        {downloading ? (
                            <div className="flex items-center gap-3">
                                <Progress value={updateState?.percent ?? 0} className="flex-1 h-1.5" />
                                <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-9 text-right">
                                    {`${updateState?.percent ?? 0}%`}
                                </span>
                                <Button size="sm" variant="outline" onClick={() => apiClient.cancelUpdateDownload()}>
                                    {dictionary['cancel']}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                                {downloaded ? (
                                    <Button size="sm" onClick={() => apiClient.installUpdate()}>
                                        {dictionary['settings'].install_now}
                                    </Button>
                                ) : (
                                    <Button size="sm" disabled={checking} onClick={() => apiClient.checkUpdate(channelSwitched)}>
                                        {checking && spinner}
                                        {/*切通道后主操作就是重装目标通道版本，不再叫「检查更新」*/}
                                        {channelSwitched
                                            ? dictionary['settings'].reinstall
                                            : dictionary['settings'].check_update}
                                    </Button>
                                )}
                                <span className="text-sm text-muted-foreground">{statusText()}</span>
                            </div>
                        )}
                    </div>

                    {/* 更新地址：次要设置放最后 */}
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="update-url" className="w-24 shrink-0">{dictionary['settings'].update_address}</Label>
                        <Input id="update-url" className="w-96" value={config.url}
                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                            onBlur={() => saveConfig(config)} />
                    </div>
                </>
            )}
        </div>
    );
}
