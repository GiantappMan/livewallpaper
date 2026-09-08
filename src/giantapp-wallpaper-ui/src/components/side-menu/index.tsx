"use client";

import { useState } from "react";
import NavMenuItem from "./nav-menu-item";
import {
    ArrowDownTrayIcon,
    CogIcon,
    HomeIcon,
    Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
    ArrowDownTrayIcon as solidArrowDownTrayIcon,
    CogIcon as solidCogIcon,
    HomeIcon as solidHomeIcon,
    QuestionMarkCircleIcon as questionMarkCircleIcon,
    Squares2X2Icon as solidSquares2X2Icon,
} from "@heroicons/react/24/solid";
import { useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";
import { activeDownloadIdsAtom } from "@/atoms/downloads";

export default function SideMenu() {
    const dictionary = useAtomValue(langDictAtom);
    const activeDownloadCount = useAtomValue(activeDownloadIdsAtom).length;
    const [sidebarTopNavigation] = useState([
        {
            name: dictionary['common'].local,
            href: `/`,
            urls: [`/`],
            icon: HomeIcon,
            selectedIcon: solidHomeIcon,
            current: false,
        },
        // {
        //   name: "旧社区",
        //   href: "/hub-old",
        //   icon: Squares2X2Icon,
        //   selectedIcon: solidSquares2X2Icon,
        //   current: false,
        // },
        {
            name: dictionary['common'].hub,
            href: `/hub`,
            urls: [`/hub`],
            icon: Squares2X2Icon,
            selectedIcon: solidSquares2X2Icon,
            current: false,
        },
    ]);

    const [sidebarBottomNavigation] = useState([
        {
            name: dictionary['downloads']?.nav ?? "Downloads",
            href: `/downloads`,
            urls: [`/downloads`],
            icon: ArrowDownTrayIcon,
            selectedIcon: solidArrowDownTrayIcon,
            current: false,
        },
        {
            name: dictionary['common'].settings,
            href: `/settings`,
            urls: [`/settings`],
            icon: CogIcon,
            selectedIcon: solidCogIcon,
            current: false,
        },
        {
            name: dictionary['common'].about,
            href: `/about`,
            urls: [`/about`],
            icon: questionMarkCircleIcon,
            selectedIcon: questionMarkCircleIcon,
            current: false,
        },
    ]);
    const location = useLocation();
    const pathname = location.pathname;
    //更新current
    sidebarTopNavigation.forEach((item) => {
        item.current = item.urls.includes(pathname)
        // console.log("test", item.urls, pathname, item.current);
    });

    sidebarBottomNavigation.forEach((item) => {
        item.current = pathname === item.href
        if (item.href === `/settings`) {
            item.current = pathname.startsWith(`/settings`) || item.urls.includes(pathname)
        }
    });

    return (
        <>
            {/* 侧边栏随窗口高度整体缩放：尺寸基准对齐 Windows Store 侧边栏实测值
                （默认 680px 高时：栏宽 76 / 条目 64x58 / 图标笔画 21 / 文字 12） */}
            <div className="flex w-[clamp(60px,11.2vh,76px)] overflow-y-auto overflow-x-clip">
                <div className="flex flex-1 w-full flex-col items-center">
                    <div className="w-full flex-1 space-y-[clamp(2px,0.45vh,3px)] px-1.5">
                        {sidebarTopNavigation.map((item) => (
                            <NavMenuItem
                                key={item.name}
                                href={item.href}
                                name={item.name}
                                icon={item.icon}
                                selectedIcon={item.selectedIcon}
                                current={item.current}
                                badge={item.href === `/downloads` ? activeDownloadCount : undefined}
                            />
                        ))}
                    </div>
                    <div className="w-full px-1.5 mb-[clamp(2px,0.45vh,3px)] space-y-[clamp(2px,0.45vh,3px)]">
                        {sidebarBottomNavigation.map((item) => (
                            <NavMenuItem
                                key={item.name}
                                href={item.href}
                                name={item.name}
                                icon={item.icon}
                                selected-icon={item.selectedIcon}
                                current={item.current}
                                badge={item.href === `/downloads` ? activeDownloadCount : undefined}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
