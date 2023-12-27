// 扩展Next.js Link组件，通过默认浏览器打开

import Link from "next/link";
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