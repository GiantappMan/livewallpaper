"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"

const Page = () => {
    const [loading, setLoading] = useState(true);
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

    return (
        <div className="w-full min-h-[100vh]">
            {loading &&
                <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[100vh] pb-20 h-ful">
                    {
                        Array.from({ length: 12 }).map((_, i) => (
                            <div className="flex flex-col space-y-3" key={i}>
                                <Skeleton className="h-[180px]  rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                </div>}

            <iframe
                allowFullScreen={true}
                className={`w-full min-h-[100vh] ${loading ? 'hidden' : 'block'}`}
                src={iframeSrc}
                onLoad={() => setLoading(false)}
            />
        </div>
    );
};

export default Page;
