"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

const Page = () => {
    return <div onMouseEnter={() => console.log('Mouse entered')} className="p-6">
        <div className="pl-4">
            仍在开发中<br />
            可以先用巨应2下载壁纸<br />
            2和3壁纸目录都设成一样即可<br />
        </div>
        <Button variant="outline">
            <Link target="_blank" href="https://afdian.net/item/608aae78d46b11eda1035254001e7c00">
                巨应2的会员，后期可以免费升级到巨应3
            </Link>
        </Button>
    </div>;
};

export default Page;
