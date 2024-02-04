"use client";

import api from "@/lib/client/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"
import LinkClient from "@/components/link-client"
import {
    LayoutGrid,
    Github,
    DollarSign
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

    return <div className="h-screen flex flex-col items-start space-y-6 m-6">
        <h1 className="text-2xl">巨应壁纸{version}</h1>
        <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-semibold mt-4">反馈&源码</h1>
            （提醒：当前为测试版：bug较多，反馈时，请尽量写下复现操作步骤，不要单一的发泄情绪）
            <LinkClient
                className="underline-offset-4 hover:underline" href="https://support.qq.com/products/315103" target="_blank">
                问题和建议
            </LinkClient>
            <LinkClient
                className="underline-offset-4 hover:underline" href="https://github.com/DaZiYuan/livewallpaper" target="_blank">
                Github
            </LinkClient>
            <LinkClient
                className="underline-offset-4 hover:underline" href="https://gitee.com/DaZiYuan/livewallpaper" target="_blank">
                Gitee
            </LinkClient>
        </div>
        <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-semibold mt-4">鼓励一下</h1>
            <Button variant="outline" asChild>
                <LinkClient
                    className=" underline-offset-4 flex items-center" href="ms-windows-store://pdp/?productid=9MWTG433JV6B" target="_blank">
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    五星好评
                </LinkClient>
            </Button>
            <Button variant="outline" asChild>
                <LinkClient
                    className="underline-offset-4 flex items-center" href="https://github.com/DaZiYuan/livewallpaper" target="_blank">
                    <Github className="h-4 w-4 mr-1" />
                    点个星星
                </LinkClient>
            </Button>
            <Button variant="outline" asChild>
                <LinkClient
                    className="underline-offset-4 flex items-center" href="https://afdian.net/a/giantapp" target="_blank">
                    <DollarSign className="h-4 w-4 mr-1" />
                    捐赠/会员
                </LinkClient>
            </Button>
        </div>
        <div className="flex items-center space-x-2 text-lg">
            <p>
                <LinkClient className="underline-offset-4 hover:underline" href="https://www.mscoder.cn" target="_blank">巨应君</LinkClient> ❤ 出品
            </p>
        </div>
    </div>
}
export default Page;
