"use client";

import api from "@/lib/client/api";
import { useEffect, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
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
        <div className="mx-auto max-w-2xl space-y-8 p-6">
            {/* 产品名与版本 */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {dictionary['about'].product_name.replace("{0}", version ?? "")}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {version ? `${dictionary['settings'].current_version} ${version}` : "\u00A0"}
                </p>
            </div>

            {/* 软件更新 */}
            <UpdateSettings />

            <Separator />

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

            <Separator />

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
