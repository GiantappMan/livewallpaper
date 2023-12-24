"use client";

import api from "@/lib/client/api";
import { useEffect, useState } from "react";

const Page = () => {
    const [version, setVersion] = useState<string | null>();

    //获取version
    useEffect(() => {
        if (version) return;
        api.getVersion().then((version) => {
            setVersion(version.data);
        });
    }, [version]);

    return <div>
        巨应壁纸{version}
    </div>
}
export default Page;
