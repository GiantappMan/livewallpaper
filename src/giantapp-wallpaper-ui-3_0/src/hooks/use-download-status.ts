"use client";

import api from "@/lib/client/api";
import type { DownloadItem } from "@/lib/client/types/download";
import { useCallback, useEffect, useRef, useState } from "react";

//下载任务状态：轮询 + 监听宿主 DownloadStatusChangedEvent 事件
export function useDownloadStatus(pollMs = 1000) {
    const [items, setItems] = useState<DownloadItem[]>([]);
    const [loading, setLoading] = useState(true);
    //事件触发非常频繁，节流后再刷新
    const lastRefreshRef = useRef(0);

    const refresh = useCallback(async () => {
        const res = await api.getDownloadStatus();
        if (!res.error && res.data) {
            setItems(res.data.items || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const throttledRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshRef.current < 200)
                return;
            lastRefreshRef.current = now;
            refresh();
        };

        refresh();
        api.onDownloadStatusChanged(throttledRefresh);
        const timer = setInterval(refresh, pollMs);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pollMs]);

    const activeItems = items.filter((item) => item.isDownloading);
    return { items, activeItems, loading, refresh };
}
