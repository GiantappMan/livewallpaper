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
            <div className="flex w-[68px] overflow-y-auto overflow-x-clip">
                <div className="flex flex-1 w-full flex-col items-center">
                    <div className="w-full flex-1 space-y-1 px-1">
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
                    <div className="w-full px-1 mb-1 space-y-1">
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
