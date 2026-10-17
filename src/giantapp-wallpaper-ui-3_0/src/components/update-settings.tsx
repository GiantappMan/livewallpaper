"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/client/api";
import { useUpdateState } from "@/components/update-prompt";
import type { ConfigUpdate } from "@/lib/client/types/config";
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    Loader2,
    RefreshCw
} from "lucide-react";

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
    //更新地址折叠状态
    const [addrOpen, setAddrOpen] = useState(false);

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

    const state = updateState?.state;
    const checking = state === "checking";
    const downloading = state === "downloading";
    const downloaded = state === "downloaded";

    const spinner = (
        <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-2" />
    );

    //状态横幅：图标着色 + 一句话结论，替代纯文字状态
    const banner = (Icon: typeof CheckCircle2, iconCls: string, text: string, spin = false) => (
        <div className="flex items-center gap-2.5">
            <Icon className={cn("h-5 w-5 shrink-0", iconCls, spin && "animate-spin")} />
            <span className="text-sm font-medium">{text}</span>
        </div>
    );

    const statusBanner = () => {
        if (state === "checking")
            return banner(Loader2, "text-muted-foreground", dictionary['settings'].update_checking, true);
        if (state === "downloaded")
            return banner(CheckCircle2, "text-emerald-500", dictionary['settings'].update_downloaded.replace("{0}", updateState?.version ?? ""));
        if (state === "error")
            return banner(AlertCircle, "text-destructive", updateState?.error ?? "");
        if (state === "upToDate" || state === "idle") {
            if (channelSwitched)
                return banner(RefreshCw, "text-sky-400", dictionary['settings'].update_channel_switch_hint);
            if (state === "upToDate")
                return banner(CheckCircle2, "text-emerald-500", dictionary['settings'].update_up_to_date);
        }
        return null;
    };

    return (
        <div className="space-y-4">
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
                <div className="rounded-xl border p-5 space-y-5">
                    {/* 状态横幅 */}
                    {statusBanner()}

                    {/* 版本对比（版本号固定 LTR，避免 RTL 语言下被重排） */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                        <div className="rounded-lg bg-muted/50 px-3.5 py-2.5">
                            <div className="text-xs text-muted-foreground">{dictionary['settings'].current_version}</div>
                            <div dir="ltr" className="mt-1 truncate font-mono text-sm font-semibold">{currentVersion || "-"}</div>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3.5 py-2.5">
                            <div className="text-xs text-muted-foreground">
                                {`${dictionary['settings'].update_latest_version} · ${channelName(config.channel)}`}
                            </div>
                            <div dir="ltr" className="mt-1 truncate font-mono text-sm font-semibold">{channelLatest || "-"}</div>
                        </div>
                    </div>

                    {/* 通道选择 */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{dictionary['settings'].update_channel}</span>
                        <div className="inline-flex rounded-lg border p-0.5">
                            {(["stable", "preview"] as const).map((channel) => (
                                <button key={channel} type="button"
                                    className={cn("rounded-[7px] px-3 py-1 text-sm transition-colors",
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

                    {/* 下载中显示进度条和取消，其余状态显示操作按钮 */}
                    {downloading ? (
                        <div className="flex items-center gap-3">
                            <span dir="ltr" className="text-xs text-muted-foreground shrink-0">{updateState?.version}</span>
                            <Progress value={updateState?.percent ?? 0} className="flex-1 h-1.5" />
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-9 text-right">
                                {`${updateState?.percent ?? 0}%`}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => apiClient.cancelUpdateDownload()}>
                                {dictionary['settings'].cancel}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
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
                        </div>
                    )}

                    {/* 更新地址：高级设置，默认收起 */}
                    <div className="space-y-3">
                        <Separator />
                        <button type="button" onClick={() => setAddrOpen(o => !o)}
                            className="flex w-full items-center justify-between text-sm text-muted-foreground transition-colors hover:text-foreground">
                            {dictionary['settings'].update_address}
                            <ChevronDown className={cn("h-4 w-4 transition-transform", addrOpen && "rotate-180")} />
                        </button>
                        {addrOpen && (
                            <Input value={config.url}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                onBlur={() => saveConfig(config)} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
