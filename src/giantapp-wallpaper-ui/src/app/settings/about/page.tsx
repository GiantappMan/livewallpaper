"use client";

import api from "@/lib/client/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"
import LinkClient from "@/components/link-client"

const Page = () => {
    const [version, setVersion] = useState<string | null>();

    //获取version
    useEffect(() => {
        if (version) return;
        api.getVersion().then((version) => {
            setVersion(version.data);
        });
    }, [version]);

    //处理打开网页
    const handleOpenLink = (url: string) => {
        api.openUrl(url);
    };


    return <div className="h-screen flex flex-col items-start space-y-6">
        <div className="space-y-2">
            <h1 className="text-3xl font-semibold">关于</h1>
            <p className="text-lg text-primary">巨应壁纸{version}</p>
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold mt-4">源码</h2>
            <div className="flex flex-col space-y-2">
                <LinkClient
                    className="text-primary underline-offset-4 hover:underline" href="https://github.com/DaZiYuan/livewallpaper" target="_blank">
                    Github
                </LinkClient>
                <LinkClient
                    className="text-primary underline-offset-4 hover:underline" href="https://gitee.com/DaZiYuan/livewallpaper" target="_blank">
                    Gitee
                </LinkClient>
            </div>
        </div>
        <div className="flex items-center space-x-2 text-lg text-primary ">
            <p>
                <LinkClient className="underline-offset-4 hover:underline" href="https://www.mscoder.cn" target="_blank">巨应君</LinkClient> ❤ 出品
            </p>
        </div>
    </div>
}
export default Page;
