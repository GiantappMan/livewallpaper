"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getGlobal } from "@/i18n-config";

const Page = () => {
    const dictionary = getGlobal();
    return <iframe className="w-full min-h-[100vh]" src="https://wallpaper.giantapp.cn/zh/hub"></iframe>;

};

export default Page;
