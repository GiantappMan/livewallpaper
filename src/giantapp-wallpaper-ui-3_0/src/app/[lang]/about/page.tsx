"use client";

import api from "@/lib/client/api";
import { useEffect, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button"
import LinkClient from "@/components/link-client"
import { UpdateSettings } from "@/components/update-settings";
import {
    FolderOpen,
    LayoutGrid,
    MessageCircleWarning,
    Star
} from "lucide-react";
import Link from "next/link";
import { langDictAtom } from "@/atoms/lang";
import { useAtomValue } from "jotai";

const Author = ({ dictionary }: { dictionary: any; }) => {
    const parts = dictionary['about'].produced_by.split("{0}");

    return (
        <span>
            {parts[0]}
            <LinkClient className="underline-offset-4 hover:underline" href="https://www.mscoder.cn" target="_blank"><span className="font-bold underline">{dictionary['about'].author}</span></LinkClient>
            {parts[1]}
        </span>
    );
}

//外链按钮统一样式
const LinkButton = ({ href, children }: { href: string; children: ReactNode; }) => (
    <Button variant="outline" size="sm" asChild>
        <LinkClient className="flex items-center gap-1.5 underline-offset-4" href={href} target="_blank">
            {children}
        </LinkClient>
    </Button>
);

const AboutPage = () => {
    const [version, setVersion] = useState<string | null>(null);
    const dictionary = useAtomValue(langDictAtom);

    //获取version
    useEffect(() => {
        api.getVersion().then((res) => {
            if (!res.error && res.data) setVersion(res.data);
        });
    }, []);

    return <div className="h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 p-6">
            {/* 头部：品牌卡（渐变底）+ 版本徽章 */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-primary/[0.07] to-transparent">
                <div className="flex items-center gap-5 p-6">
                    <img src="/logo.png" alt="" className="h-16 w-16 shrink-0 rounded-xl ring-1 ring-border" />
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {dictionary['about'].product_name.replace("{0}", (version ?? "").split(".")[0]).trim()}
                        </h1>
                        {version && (
                            <span dir="ltr" className="rounded-full border bg-muted/40 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                                {`v${version}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 软件更新 */}
            <UpdateSettings />

            {/* 反馈&源码 */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{dictionary['about'].feedback_and_source_code}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <LinkButton href="https://support.qq.com/products/315103">
                        <MessageCircleWarning className="h-4 w-4" />
                        {dictionary['about'].problems_and_suggestions}
                    </LinkButton>
                    <LinkButton href="https://github.com/GiantappMan/livewallpaper">Github</LinkButton>
                    <LinkButton href="https://gitee.com/GiantappMan/livewallpaper">Gitee</LinkButton>
                    <Button variant="ghost" size="sm" asChild>
                        <Link
                            onClick={(e) => {
                                api.openLogFolder();
                                e.preventDefault();
                            }}
                            className="flex items-center gap-1.5 text-muted-foreground underline-offset-4" href="#" title={dictionary['about'].open_log_folder}>
                            <FolderOpen className="h-4 w-4" />
                            {dictionary['about'].open_log_folder}
                        </Link>
                    </Button>
                </div>
            </section>

            {/* 鼓励一下 */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{dictionary['about'].encourage}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            onClick={(e) => {
                                api.openStoreReview();
                                e.preventDefault();
                            }}
                            className="flex items-center gap-1.5 underline-offset-4" href="#" target="_blank">
                            <LayoutGrid className="h-4 w-4" />
                            {dictionary['about'].rate_us}
                        </Link>
                    </Button>
                    <LinkButton href="https://github.com/GiantappMan/livewallpaper">
                        {/*lucide 1.x 移除品牌图标 Github，改用 Star */}
                        <Star className="h-4 w-4" />
                        {dictionary['about'].give_star}
                    </LinkButton>
                </div>
            </section>

            <p className="text-sm text-muted-foreground">
                <Author dictionary={dictionary} />
            </p>
        </div>
    </div>
}
export default AboutPage;
