/** 外部链接统一走系统浏览器打开。 */
import * as React from "react";

import Link from "@/components/link";
import api from "@/lib/client/api";

export default function LinkClient(props: React.ComponentProps<typeof Link>) {
    return (
        <Link
            {...props}
            onClick={(e) => {
                api.openUrl(e.currentTarget.href);
                e.preventDefault();
            }}
        />
    );
}