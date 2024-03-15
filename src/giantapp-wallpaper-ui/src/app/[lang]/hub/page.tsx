"use client";

import { useEffect, useState } from "react";

const Page = () => {
    const [iframeSrc, setIframeSrc] = useState("https://www.giantapp.cc/hub");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('target');
        if (target) {
            setIframeSrc(target);
        }
        else {
            setIframeSrc("https://www.giantapp.cc/hub");
            // setIframeSrc("http://localhost:3001/zh/hub");
        }
    }, []);

    return <iframe allowFullScreen={true} className="w-full min-h-[100vh]" src={iframeSrc}></iframe>;
};

export default Page;
