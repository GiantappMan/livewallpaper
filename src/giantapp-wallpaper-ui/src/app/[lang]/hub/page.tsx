"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getGlobal } from "@/i18n-config";
import { useEffect, useState } from "react";

const Page = () => {
    const [iframeSrc, setIframeSrc] = useState("http://localhost:3001/zh/hub");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('target');
        if (target) {
            setIframeSrc(target);
        }
        else {
            setIframeSrc("http://localhost:3001/zh/hub");
        }
    }, []);

    // return <iframe className="w-full min-h-[100vh]" src="https://wallpaper.giantapp.cn/zh/hub"></iframe>;
    return <iframe className="w-full min-h-[100vh]" src={iframeSrc}></iframe>;
};

export default Page;
