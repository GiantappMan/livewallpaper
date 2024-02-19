"use client";

import { useState } from "react";
import NavMenuItem from "./nav-menu-item";
import { CogIcon, HomeIcon, Squares2X2Icon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import {
    CogIcon as solidCogIcon,
    HomeIcon as solidHomeIcon,
    Squares2X2Icon as solidSquares2X2Icon,
    QuestionMarkCircleIcon as questionMarkCircleIcon
} from "@heroicons/react/24/solid";
import { usePathname } from "next/navigation";

export default function SideMenu() {
    const [sidebarTopNavigation] = useState([
        {
            name: "本地",
            href: "/",
            urls: ["/", "/index.html"],
            icon: HomeIcon,
            selectedIcon: solidHomeIcon,
            current: false,
        },
        // {
        //   name: "旧社区",
        //   href: "/community-old",
        //   icon: Squares2X2Icon,
        //   selectedIcon: solidSquares2X2Icon,
        //   current: false,
        // },
        {
            name: "社区",
            href: "/community",
            urls: ["/community", "/community.html"],
            icon: Squares2X2Icon,
            selectedIcon: solidSquares2X2Icon,
            current: false,
        },
    ]);

    const [sidebarBottomNavigation] = useState([
        {
            name: "设置",
            href: "/settings/",
            urls: ["/settings", "/settings.html"],
            icon: CogIcon,
            selectedIcon: solidCogIcon,
            current: false,
        },
        {
            name: "关于",
            href: "/about",
            urls: ["/about", "/about.html"],
            icon: questionMarkCircleIcon,
            selectedIcon: questionMarkCircleIcon,
            current: false,
        },
    ]);
    const pathname = usePathname();
    //更新current
    sidebarTopNavigation.forEach((item) => {
        item.current = item.urls.includes(pathname)
    });

    sidebarBottomNavigation.forEach((item) => {
        item.current = pathname === item.href
        if (item.href === "/settings/") {
            item.current = pathname.startsWith("/settings") || item.urls.includes(pathname)
        }
    });

    return (
        <>
            <div className="flex w-[68px] overflow-y-auto">
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
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}