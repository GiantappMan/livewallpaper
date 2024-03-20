"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"

const Page = () => {
    const [loading, setLoading] = useState(true);
    const [iframeSrc, setIframeSrc] = useState(process.env.NEXT_PUBLIC_HUB_Address);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('target');
        if (target) {
            setIframeSrc(target);
        }
        else {
            setIframeSrc(process.env.NEXT_PUBLIC_HUB_Address);
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
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-3/5" />
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
