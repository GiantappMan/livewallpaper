"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ArrowDownTrayIcon,
    FolderOpenIcon,
    InboxIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";
import api from "@/lib/client/api";
import type { DownloadItem, DownloadRecord } from "@/lib/client/types/download";
import { useDownloadStatus } from "@/hooks/use-download-status";
import { useMounted } from "@/hooks/use-mounted";

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0)
        return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }
    return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(time: string): string {
    try {
        return new Date(time).toLocaleString();
    } catch {
        return time;
    }
}

type ItemState = "downloading" | "completed" | "canceled" | "failed";

function getItemState(item: DownloadItem): ItemState {
    if (item.isDownloading)
        return "downloading";
    if (item.isDownloadCompleted)
        return "completed";
    if (item.isCanceled)
        return "canceled";
    return "failed";
}

const DownloadsPage = () => {
    const dictionary = useAtomValue(langDictAtom);
    const dict = dictionary["downloads"];
    const mounted = useMounted();
    const { items, activeItems, loading, refresh } = useDownloadStatus(500);
    const [history, setHistory] = useState<DownloadRecord[] | null>(null);
    //记录上一次进行中的任务数，数量减少说明有任务结束，刷新历史
    const prevActiveCountRef = useRef(0);

    const loadHistory = useCallback(async () => {
        const res = await api.getDownloadHistory();
        if (!res.error && res.data)
            setHistory(res.data);
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        const prev = prevActiveCountRef.current;
        prevActiveCountRef.current = activeItems.length;
        if (activeItems.length < prev) {
            loadHistory();
        }
    }, [activeItems.length, loadHistory]);

    const cancelDownload = async (item: DownloadItem) => {
        await api.cancelDownloadWallpaper(item.id);
        refresh();
    };

    const clearHistory = async () => {
        const res = await api.clearDownloadHistory();
        if (res.error) {
            toast.error(dict.clear_failed);
            return;
        }
        setHistory([]);
        refresh();
        toast.success(dict.clear_success);
    };

    const exploreRecord = async (record: DownloadRecord) => {
        const res = await api.explore(record.filePath);
        if (res.error)
            toast.error(dictionary["local"].failed_to_open_wallpaper_folder);
    };

    if (!mounted || loading)
        return <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
        </div>;

    //正在下载 + 本次会话已结束的任务
    const sessionItems = [...activeItems, ...items.filter((item) => !item.isDownloading)];
    const stateText: Record<ItemState, string> = {
        downloading: dict.downloading,
        completed: dict.completed,
        canceled: dict.canceled,
        failed: dict.failed,
    };

    return <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{dict.title}</h1>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={(!history || history.length === 0) && sessionItems.length === 0}>
                        <TrashIcon className="h-4 w-4 mr-1" />
                        {dict.clear_history}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.clear_history}</AlertDialogTitle>
                        <AlertDialogDescription>{dict.clear_history_confirm}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{dictionary["local"].cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={clearHistory}>{dict.clear_history}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

        {/* 正在下载 */}
        <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{dict.active}</h2>
            {sessionItems.length === 0 ?
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-muted-foreground">
                    <InboxIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">{dict.no_active_downloads}</span>
                </div>
                : sessionItems.map((item) => {
                    const state = getItemState(item);
                    return <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <ArrowDownTrayIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="truncate font-medium" title={item.desc || item.id}>{item.desc || item.id}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {state === "downloading" ?
                                        `${item.percent}% · ${formatBytes(item.receivedBytes)}/${formatBytes(item.totalBytes)}`
                                        : stateText[state]}
                                </span>
                            </div>
                            {state === "downloading" && <Progress value={item.percent} className="h-1.5" />}
                        </div>
                        {state === "downloading" &&
                            <Button variant="ghost" size="icon" title={dictionary["local"].cancel} onClick={() => cancelDownload(item)}>
                                <XMarkIcon className="h-5 w-5" />
                            </Button>}
                    </div>;
                })}
        </section>

        {/* 已下载 */}
        <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{dict.history}</h2>
            {(!history || history.length === 0) ?
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-muted-foreground">
                    <InboxIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">{dict.no_history}</span>
                </div>
                : history.map((record) => (
                    <div key={`${record.id}-${record.time}`} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium" title={record.title || record.fileName}>
                                {record.title || record.fileName}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {record.fileName} · {formatBytes(record.totalBytes)} · {formatDate(record.time)}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" title={dictionary["local"].open_folder} onClick={() => exploreRecord(record)}>
                            <FolderOpenIcon className="h-5 w-5" />
                        </Button>
                    </div>
                ))}
        </section>
    </div>;
};

export default DownloadsPage;
