"use client";

import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import {
    ArrowDownTrayIcon,
    FolderOpenIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { langDictAtom } from "@/atoms/lang";
import api from "@/lib/client/api";
import type { DownloadHistoryItem, DownloadItem, DownloadStatus } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const Page = () => {
    const dictionary = useAtomValue(langDictAtom);
    const t = dictionary["downloads"] ?? {};
    const [downloading, setDownloading] = useState<DownloadItem[]>([]);
    const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
    const [clearOpen, setClearOpen] = useState(false);

    const refreshHistory = useCallback(async () => {
        const res = await api.getDownloadHistory();
        if (!res.error && res.data) setHistory(res.data);
    }, []);

    useEffect(() => {
        // 事件为增量推送（有时只携带单条任务），按 id 合并
        const onStatus = (items: DownloadItem[]) => {
            setDownloading((prev) => {
                const map = new Map(prev.map((it) => [it.id, it]));
                for (const it of items) {
                    if (it.isDownloading && !it.IsCanceled) map.set(it.id, it);
                    else map.delete(it.id);
                }
                return Array.from(map.values());
            });
            // 有任务结束 -> 历史记录可能新增
            if (items.some((it) => !it.isDownloading)) refreshHistory();
        };

        (async () => {
            const res = await api.getDownloadStatus();
            if (!res.error && res.data) onStatus(res.data.items);
            refreshHistory();
        })();

        const un = listen<DownloadStatus>("download-status-changed", (e) =>
            onStatus(e.payload?.items ?? [])
        );
        return () => {
            un.then((f) => f());
        };
    }, [refreshHistory]);

    const cancelDownload = useCallback(async (id: string) => {
        await api.cancelDownloadWallpaper(id);
    }, []);

    const clearAll = useCallback(async () => {
        const res = await api.clearDownloadHistory();
        if (res.error) {
            toast.error(t.failed_to_clear ?? String(res.error));
            return;
        }
        setHistory([]);
        toast.success(t.cleared);
    }, [t]);

    const removeOne = useCallback(async (id: string) => {
        const res = await api.removeDownloadHistoryItem(id);
        if (res.error) {
            toast.error(t.failed_to_clear ?? String(res.error));
            return;
        }
        setHistory((prev) => prev.filter((it) => it.id !== id));
    }, [t]);

    const hasDownloading = downloading.length > 0;

    return (
        <div className="h-[calc(100vh_-_var(--app-titlebar-h))] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-6">
                <h1 className="text-2xl font-semibold">{t.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>

                {/* 正在下载 */}
                <section className="mt-7">
                    <h2 className="text-base font-semibold">
                        {t.downloading}
                        {hasDownloading && ` (${downloading.length})`}
                    </h2>
                    {hasDownloading ? (
                        <div className="mt-3 space-y-2">
                            {downloading.map((it) => (
                                <div
                                    key={it.id}
                                    className="flex items-center gap-4 rounded-lg border bg-card/40 px-4 py-3"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <ArrowDownTrayIcon className="h-5 w-5 text-muted-foreground animate-pulse" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="truncate text-sm font-medium">
                                                {it.desc || it.id}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {Math.round(it.percent)}%
                                            </span>
                                        </div>
                                        <Progress value={it.percent} className="mt-2 h-1" />
                                        <div className="mt-1.5 text-xs text-muted-foreground">
                                            {formatBytes(it.receivedBytes)}
                                            {it.totalBytes > 0 && ` / ${formatBytes(it.totalBytes)}`}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => cancelDownload(it.id)}
                                    >
                                        {t.cancel}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-3 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            {t.empty_downloading}
                        </div>
                    )}
                </section>

                {/* 已下载记录 */}
                <section className="mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">
                            {t.history}
                            {history.length > 0 && ` (${history.length})`}
                        </h2>
                        {history.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
                                <TrashIcon className="mr-1.5 h-4 w-4" />
                                {t.clear_history}
                            </Button>
                        )}
                    </div>
                    {history.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {history.map((it) => (
                                <div
                                    key={it.id}
                                    className="flex items-center gap-4 rounded-lg border bg-card/40 px-4 py-3"
                                >
                                    <img
                                        src={it.coverUrl || "/wp-placeholder.webp"}
                                        className="h-12 w-12 shrink-0 rounded-lg bg-muted object-cover"
                                        alt=""
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">
                                            {it.title || it.id}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span>{formatBytes(it.totalBytes)}</span>
                                            {it.completedAt > 0 && (
                                                <>
                                                    <span>·</span>
                                                    <span>{new Date(it.completedAt).toLocaleString()}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => api.explore(it.filePath)}
                                    >
                                        <FolderOpenIcon className="mr-1.5 h-4 w-4" />
                                        {dictionary["local"]?.open_folder}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground"
                                        title={dictionary["local"]?.delete}
                                        onClick={() => removeOne(it.id)}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-3 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            {t.empty_history}
                        </div>
                    )}
                </section>
            </div>

            {/* 清空确认 */}
            <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.clear_history}</AlertDialogTitle>
                        <AlertDialogDescription>{t.clear_confirm}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{dictionary["local"]?.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={clearAll}>
                            {dictionary["local"]?.confirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Page;
