"use client";

import api from "@/lib/client/api";
import { AppUpdateEvent } from "@/lib/client/types";
import { langDictAtom } from "@/atoms/lang";
import { getDefaultStore } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * 程序更新全局提示：后台自动下载完成后弹出持久 toast，
 * 用户点击「安装并重启」立即安装；点关闭可稍后在
 * 设置 → 软件更新 里继续安装（已下载状态保留在更新页）。
 */
export function AppUpdatePrompt() {
    useEffect(() => {
        const onEvent = (event: AppUpdateEvent) => {
            if (event.state !== "downloaded") return;
            const upd = getDefaultStore().get(langDictAtom)?.["update"];
            if (!upd) return;
            toast(upd.downloaded_ready.replace("{0}", event.version), {
                duration: Infinity,
                action: {
                    label: upd.install_now,
                    onClick: () => {
                        api.appUpdateInstall();
                    },
                },
            });
        };
        // 订阅在组件生命周期内常驻（unlistener 由 api 内部托管）
        api.onAppUpdateEvent(onEvent);
    }, []);

    return null;
}
