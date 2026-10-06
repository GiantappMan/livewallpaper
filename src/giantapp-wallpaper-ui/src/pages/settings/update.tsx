"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/client/api";
import React from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import { ConfigUpdate, UiRemoteManifest, UiUpdateStatus, UiVersionEntry, AppUpdateInfo } from "@/lib/client/types";
import { langDictAtom } from "@/atoms/lang";
import { useAtomValue } from "jotai";
import { DownloadIcon, RotateCcwIcon, SearchIcon } from "lucide-react";

const Page = () => {
    const dictionary = useAtomValue(langDictAtom);
    const [mounted, setMounted] = React.useState(false);
    const [config, setConfig] = React.useState<ConfigUpdate>({} as any);
    const [uiStatus, setUiStatus] = React.useState<UiUpdateStatus | null>(null);
    const [uiBusy, setUiBusy] = React.useState(false);
    const [uiProgress, setUiProgress] = React.useState<number | null>(null);
    const [uiFound, setUiFound] = React.useState<UiRemoteManifest | null>(null);
    const [restoreOpen, setRestoreOpen] = React.useState(false);
    const [appBusy, setAppBusy] = React.useState(false);
    const [appProgress, setAppProgress] = React.useState<number | null>(null);
    const [appInfo, setAppInfo] = React.useState<AppUpdateInfo | null>(null);
    const [appDownloaded, setAppDownloaded] = React.useState<string | null>(null);
    const [appError, setAppError] = React.useState<string | null>(null);
    const [uiVersions, setUiVersions] = React.useState<UiVersionEntry[]>([]);

    const fetchVersions = useCallback(async () => {
        const res = await api.uiUpdateVersions();
        if (res.data) setUiVersions(res.data);
    }, []);

    const fetchAll = useCallback(async () => {
        const res = await api.getConfig<ConfigUpdate>("Update");
        if (res.data) setConfig(res.data);
        const status = await api.uiUpdateStatus();
        if (status.data) setUiStatus(status.data);
        await fetchVersions();
        const st = await api.appUpdateState();
        if (st.data) {
            setAppInfo(st.data.info);
            setAppDownloaded(st.data.downloadedVersion);
            setAppError(st.data.error);
        }
        setMounted(true);
    }, [fetchVersions]);

    React.useEffect(() => {
        fetchAll();
        api.onUiUpdateEvent((e) => {
            if (e.state === "progress") {
                setUiProgress(e.percent);
            } else if (e.state === "applied") {
                setUiProgress(null);
                setUiFound(null);
                fetchVersions();
                toast.success(dictionary['update'].applied.replace("{0}", e.version));
            } else if (e.state === "restored") {
                setUiProgress(null);
            } else if (e.state === "error") {
                setUiProgress(null);
                toast.error(`${dictionary['update'].update_failed}: ${e.message}`);
            }
        });
        api.onAppUpdateEvent((e) => {
            if (e.state === "progress") {
                setAppProgress(e.percent);
            } else if (e.state === "downloaded") {
                setAppProgress(null);
                setAppDownloaded(e.version);
            } else if (e.state === "error") {
                setAppProgress(null);
                setAppError(e.message);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveConfig = useCallback(async (next: ConfigUpdate) => {
        setConfig(next);
        await api.setConfig("Update", next);
    }, []);

    // ---------- 界面热更新 ----------

    const checkUiUpdate = async () => {
        setUiBusy(true);
        try {
            const res = await api.uiUpdateCheck(config.uiUrl || undefined);
            if (res.error) {
                toast.error(`${dictionary['update'].check_failed}: ${res.error}`);
                return;
            }
            if (res.data) {
                setUiFound(res.data);
                toast.success(dictionary['update'].new_version_found.replace("{0}", res.data.version));
            } else {
                setUiFound(null);
                toast.success(dictionary['update'].up_to_date);
            }
        } finally {
            setUiBusy(false);
        }
    };

    const applyUiUpdate = async () => {
        setUiBusy(true);
        setUiProgress(0);
        try {
            const res = await api.uiUpdateApply(config.uiUrl || undefined);
            if (res.error) {
                toast.error(`${dictionary['update'].update_failed}: ${res.error}`);
            }
        } finally {
            setUiBusy(false);
            setUiProgress(null);
        }
    };

    const restoreBuiltin = async () => {
        setRestoreOpen(false);
        const res = await api.uiUpdateRestore();
        if (!res.error) {
            toast.success(dictionary['update'].restored);
        }
        fetchAll();
    };

    // 手动切换界面版本：内置(null)或任一本地缓存版本；切换热更新界面后窗口会重载
    const selectUiVersion = async (v: string) => {
        const res = await api.uiUpdateSelect(v === "builtin" ? null : v);
        if (res.error) {
            toast.error(`${dictionary['update'].update_failed}: ${res.error}`);
            fetchVersions();
        }
    };

    // ---------- 程序更新 ----------

    const checkAppUpdate = async () => {
        setAppBusy(true);
        setAppError(null);
        try {
            const res = await api.appUpdateCheck();
            if (res.error) {
                setAppError(String(res.error));
                toast.error(`${dictionary['update'].check_failed}: ${res.error}`);
                return;
            }
            if (res.data) {
                setAppInfo(res.data);
                toast.success(dictionary['update'].new_version_found.replace("{0}", res.data.version));
            } else {
                setAppInfo(null);
                toast.success(dictionary['update'].up_to_date);
            }
        } finally {
            setAppBusy(false);
        }
    };

    const downloadAppUpdate = async () => {
        setAppBusy(true);
        setAppProgress(0);
        try {
            const res = await api.appUpdateDownload(appInfo ?? undefined);
            if (res.error) {
                toast.error(`${dictionary['update'].update_failed}: ${res.error}`);
            }
        } finally {
            setAppBusy(false);
        }
    };

    const installAppUpdate = async () => {
        const res = await api.appUpdateInstall();
        if (res.error) {
            toast.error(`${dictionary['update'].update_failed}: ${res.error}`);
        }
    };

    const formatNotes = (info: { notes: string; date: string }) =>
        [info.date ? `${dictionary['update'].date}: ${info.date}` : null, info.notes].filter(Boolean).join("\n");

    return <div className="h-[calc(100vh_-_var(--app-titlebar-h))] space-y-6 overflow-y-auto p-1">
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{dictionary['update'].title}</h1>
        </div>

        {/* 程序更新（更新通道同时决定界面热更新跟随的清单，置顶优先选择） */}
        <div className="space-y-3">
            <h2 className="font-semibold mt-4">{dictionary['update'].app_section}</h2>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{dictionary['update'].app_hint}</p>
            <div className="flex items-center space-x-2">
                <div className="w-40 shrink-0">
                    <Label>{dictionary['update'].app_channel}</Label>
                    <p className="text-xs text-muted-foreground">{dictionary['update'].channel_hint}</p>
                </div>
                <Select value={config.appChannel ?? "stable"}
                    onValueChange={(e) => saveConfig({ ...config, appChannel: e })}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="stable">{dictionary['update'].channel_stable}</SelectItem>
                        <SelectItem value="preview">{dictionary['update'].channel_preview}</SelectItem>
                        <SelectItem value="off">{dictionary['update'].channel_off}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="app-auto-download" className="w-40">{dictionary['update'].app_auto_download}</Label>
                <Switch id="app-auto-download" checked={config.appAutoDownload ?? false}
                    onCheckedChange={(e) => saveConfig({ ...config, appAutoDownload: e })} />
            </div>
            <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                    {uiStatus ? dictionary['update'].current_version.replace("{0}", uiStatus.appVersion) : null}
                </p>
                <Button size="sm" disabled={appBusy || config.appChannel === "off"} onClick={checkAppUpdate}>
                    <SearchIcon className="h-4 w-4 mr-1" />
                    {dictionary['update'].app_check}
                </Button>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="app-url" className="w-40 shrink-0">{dictionary['update'].app_url}</Label>
                <Input id="app-url" className="flex-1" placeholder="https://"
                    value={config.appUrl ?? ""}
                    onChange={(e) => setConfig({ ...config, appUrl: e.target.value })}
                    onBlur={() => api.setConfig("Update", config)} />
            </div>
            {appProgress !== null && (
                <div className="flex items-center space-x-3">
                    <Progress value={appProgress} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-16">{dictionary['update'].downloading.replace("{0}", Math.round(appProgress))}</span>
                </div>
            )}
            {appDownloaded ? (
                <div className="rounded-md border border-primary/50 bg-primary/5 p-3 space-y-2">
                    <p className="text-sm font-medium">{dictionary['update'].downloaded_ready.replace("{0}", appDownloaded)}</p>
                    <p className="text-xs text-muted-foreground">{dictionary['update'].installing_hint}</p>
                    <div className="flex items-center space-x-2">
                        <Button size="sm" onClick={installAppUpdate}>
                            <DownloadIcon className="h-4 w-4 mr-1" />
                            {dictionary['update'].install_now}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAppDownloaded(null)}>
                            {dictionary['update'].not_now}
                        </Button>
                    </div>
                </div>
            ) : appInfo ? (
                <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm font-medium">{dictionary['update'].new_version_found.replace("{0}", appInfo.version)}</p>
                    {formatNotes(appInfo) && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{formatNotes(appInfo)}</p>}
                    <Button size="sm" disabled={appBusy} onClick={downloadAppUpdate}>
                        <DownloadIcon className="h-4 w-4 mr-1" />
                        {dictionary['update'].download}
                    </Button>
                </div>
            ) : null}
            {appError && <p className="text-xs text-destructive">{appError}</p>}
        </div>

        {/* 界面热更新 */}
        <div className="space-y-3">
            <h2 className="font-semibold mt-4">{dictionary['update'].ui_section}</h2>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{dictionary['update'].ui_hint}</p>
            <div className="flex items-center space-x-2">
                <Label htmlFor="ui-auto" className="w-40">{dictionary['update'].ui_auto}</Label>
                <Switch id="ui-auto" checked={config.uiAuto ?? false}
                    onCheckedChange={(e) => saveConfig({ ...config, uiAuto: e })} />
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="ui-url" className="w-40 shrink-0">{dictionary['update'].ui_url}</Label>
                <Input id="ui-url" className="flex-1" placeholder={dictionary['update'].ui_url_hint}
                    value={config.uiUrl ?? ""}
                    onChange={(e) => setConfig({ ...config, uiUrl: e.target.value })}
                    onBlur={() => api.setConfig("Update", config)} />
            </div>
            {uiStatus?.urlFollowsChannel && uiStatus.resolvedUrl && (
                <p className="text-xs text-muted-foreground break-all pl-44">
                    {dictionary['update'].ui_url_follow.replace("{0}", uiStatus.resolvedUrl)}
                </p>
            )}
            <p className="text-xs text-muted-foreground">
                {uiStatus
                    ? (() => {
                        const activeText = uiStatus.uiActive && uiStatus.installedVersion
                            ? dictionary['update'].ui_status_active
                                .replace("{0}", uiStatus.installedVersion)
                                .replace("{1}", uiStatus.installedAt ?? "")
                            : dictionary['update'].ui_status_builtin;
                        return config.uiAuto
                            ? activeText
                            : dictionary['update'].ui_status_disabled.replace("{0}", activeText);
                    })()
                    : <Skeleton className="h-4 w-64" />}
            </p>
            <div className="flex items-center space-x-2">
                <Label className="w-40 shrink-0">{dictionary['update'].ui_select_version}</Label>
                <Select value={uiStatus?.uiActive && uiStatus.installedVersion ? uiStatus.installedVersion : "builtin"}
                    onValueChange={(v) => selectUiVersion(v)}>
                    <SelectTrigger className="w-[240px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="builtin">{dictionary['update'].ui_builtin_label}</SelectItem>
                        {uiVersions.map((v) => (
                            <SelectItem key={v.version} value={v.version}>
                                {"v" + v.version + (v.active ? " ✓" : "")}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {uiProgress !== null && (
                <div className="flex items-center space-x-3">
                    <Progress value={uiProgress} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-16">{dictionary['update'].downloading.replace("{0}", Math.round(uiProgress))}</span>
                </div>
            )}
            {uiFound && (
                <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm font-medium">{dictionary['update'].new_version_found.replace("{0}", uiFound.version)}</p>
                    {formatNotes(uiFound) && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{formatNotes(uiFound)}</p>}
                    <Button size="sm" disabled={uiBusy} onClick={applyUiUpdate}>
                        <DownloadIcon className="h-4 w-4 mr-1" />
                        {dictionary['update'].ui_apply}
                    </Button>
                </div>
            )}
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled={uiBusy} onClick={checkUiUpdate}>
                    <SearchIcon className="h-4 w-4 mr-1" />
                    {dictionary['update'].ui_check}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRestoreOpen(true)}>
                    <RotateCcwIcon className="h-4 w-4 mr-1" />
                    {dictionary['update'].ui_restore}
                </Button>
            </div>
        </div>

        {/* 还原确认 */}
        <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dictionary['update'].ui_restore_title}</DialogTitle>
                    <DialogDescription>{dictionary['update'].ui_restore_desc}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRestoreOpen(false)}>{dictionary['local'].cancel}</Button>
                    <Button onClick={restoreBuiltin}>{dictionary['update'].ui_restore}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>;
};

export default Page;
