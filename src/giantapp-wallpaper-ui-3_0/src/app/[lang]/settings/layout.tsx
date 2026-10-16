"use client"

import { use } from "react";
import { Locale } from "@/i18n-config";
import { SidebarNav } from "./_components/sidebar-nav"

interface SettingsLayoutProps {
    children: React.ReactNode;
    //next 15 起 params 为 Promise，客户端组件用 React.use() 解包；校验器约束 lang 为 string，运行时必为 Locale
    params: Promise<{ lang: string }>;
}

export default function SettingsLayout(
    {
        children,
        params,
    }: SettingsLayoutProps) {
    const lang = use(params).lang as Locale;
    return (
        <>
            <div className="grid h-screen min-h-screen w-full overflow-hidden grid-cols-[280px_1fr]">
                <div className="border-r">
                    <SidebarNav lang={lang} />
                </div>
                <div className="flex flex-col overflow-auto">
                    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                        <div className="flex flex-1 flex-col space-y-4 md:space-y-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    )
}