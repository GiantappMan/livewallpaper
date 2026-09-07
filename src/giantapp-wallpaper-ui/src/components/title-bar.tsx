"use client";

import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";
import { cn } from "@/lib/utils";
import api from "@/lib/client/api";

// 自绘标题栏：替代系统原生标题栏（窗口已在 Rust 侧关闭 decorations）
// 整条为拖拽区（deep），按钮为可点击元素会自动阻断拖拽；双击空白处切换最大化
export function TitleBar() {
    const dictionary = useAtomValue(langDictAtom);
    const [maximized, setMaximized] = useState(false);
    const [version, setVersion] = useState<string | null>(null);

    useEffect(() => {
        api.getVersion()
            .then((res) => {
                if (!res.error) setVersion(res.data ?? null);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        const win = getCurrentWindow();
        let unlisten: (() => void) | undefined;
        let disposed = false;

        const update = () => {
            win.isMaximized()
                .then((v) => {
                    if (!disposed) setMaximized(v);
                })
                .catch(() => { });
        };

        win.listen("tauri://resize", update).then((fn) => {
            if (disposed) {
                fn();
                return;
            }
            unlisten = fn;
            update();
        });

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, []);

    // 关闭沿用 Rust 侧 CloseRequested 行为：隐藏到托盘
    const appWindow = getCurrentWindow();
    const productName = dictionary["about"].product_name.replace("{0}", "").trim();

    return (
        <header
            data-tauri-drag-region="deep"
            className="flex h-12 shrink-0 select-none items-center justify-between bg-background pl-4"
        >
            <div className="flex items-center gap-2 text-[13px] font-medium text-foreground/90">
                <img src="/logo.png" alt="" className="h-5 w-5" draggable={false} />
                <span className="flex items-baseline gap-1.5 leading-none">
                    {productName}
                    {version && (
                        <span className="text-[11px] font-normal text-muted-foreground">v{version}</span>
                    )}
                </span>
            </div>
            {/* 原生 caption 按钮几何：46x32、贴顶放置；标题栏加高后剩余部分仍是拖拽区 */}
            <div className="flex h-8 self-start">
                <CaptionButton label="Minimize" onClick={() => appWindow.minimize()}>
                    <Minus className="h-4 w-4" strokeWidth={1.5} />
                </CaptionButton>
                <CaptionButton label={maximized ? "Restore" : "Maximize"} onClick={() => appWindow.toggleMaximize()}>
                    {maximized
                        ? <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                        : <Square className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </CaptionButton>
                <CaptionButton danger label="Close" onClick={() => appWindow.close()}>
                    <X className="h-4 w-4" strokeWidth={1.5} />
                </CaptionButton>
            </div>
        </header>
    );
}

function CaptionButton({
    children,
    onClick,
    label,
    danger,
}: {
    children: React.ReactNode;
    onClick: () => void;
    label: string;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={cn(
                "flex h-full w-[46px] items-center justify-center text-foreground/90 transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                danger && "hover:bg-red-500 hover:text-white"
            )}
        >
            {children}
        </button>
    );
}
