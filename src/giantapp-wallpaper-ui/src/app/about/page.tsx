"use client";

import api from "@/lib/client/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"
import LinkClient from "@/components/link-client"
import {
    LayoutGrid,
    Github,
} from "lucide-react"
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


    return <div className="h-screen flex flex-col items-start space-y-6 m-6">
        <h1 className="text-2xl text-primary">巨应壁纸{version}</h1>
        <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-semibold mt-4">反馈&源码</h1>
            <LinkClient
                className="text-primary underline-offset-4 hover:underline" href="https://support.qq.com/products/315103" target="_blank">
                问题和建议
            </LinkClient>
            <LinkClient
                className="text-primary underline-offset-4 hover:underline" href="https://github.com/DaZiYuan/livewallpaper" target="_blank">
                Github
            </LinkClient>
            <LinkClient
                className="text-primary underline-offset-4 hover:underline" href="https://gitee.com/DaZiYuan/livewallpaper" target="_blank">
                Gitee
            </LinkClient>
        </div>
        <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-semibold mt-4">鼓励一下</h1>
            <Button variant="outline" asChild>
                <LinkClient
                    className="text-primary underline-offset-4 flex items-center" href="ms-windows-store://pdp/?productid=9MWTG433JV6B" target="_blank">
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    五星好评
                </LinkClient>
            </Button>
            <Button variant="outline" asChild>
                <LinkClient
                    className="text-primary underline-offset-4 flex items-center" href="https://github.com/DaZiYuan/livewallpaper" target="_blank">
                    <Github className="h-4 w-4 mr-1" />
                    点个星星
                </LinkClient>
            </Button>
            <Button variant="outline" asChild>
                <LinkClient
                    className="text-primary underline-offset-4 flex items-center" href="https://afdian.net/a/giantapp" target="_blank">
                    <Github className="h-4 w-4 mr-1" />
                    捐赠/会员
                </LinkClient>
            </Button>
        </div>
        <div className="flex items-center space-x-2 text-lg text-primary">
            <p>
                <LinkClient className="underline-offset-4 hover:underline" href="https://www.mscoder.cn" target="_blank">巨应君</LinkClient> ❤ 出品
            </p>
        </div>
    </div>
}
export default Page;
