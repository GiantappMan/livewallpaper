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
import { getGlobal } from "@/i18n-config";

export default function SideMenu({ lang }: { lang: string }) {
    const dictionary = getGlobal();
    const [sidebarTopNavigation] = useState([
        {
            name: dictionary['common'].local,
            href: `/${lang}`,
            urls: [`/${lang}`, `/${lang}.html`],
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
            href: `/${lang}/hub`,
            urls: [`/${lang}/hub`, `/${lang}/hub.html`],
            icon: Squares2X2Icon,
            selectedIcon: solidSquares2X2Icon,
            current: false,
        },
    ]);

    const [sidebarBottomNavigation] = useState([
        {
            name: dictionary['common'].settings,
            href: `/${lang}/settings`,
            urls: [`/${lang}/settings`, `/${lang}/settings.html`],
            icon: CogIcon,
            selectedIcon: solidCogIcon,
            current: false,
        },
        {
            name: dictionary['common'].about,
            href: `/${lang}/about`,
            urls: [`/${lang}/about`, `/${lang}/about.html`],
            icon: questionMarkCircleIcon,
            selectedIcon: questionMarkCircleIcon,
            current: false,
        },
    ]);
    const pathname = usePathname();
    //更新current
    sidebarTopNavigation.forEach((item) => {
        item.current = item.urls.includes(pathname)
        console.log("test", item.urls, pathname, item.current);
    });

    sidebarBottomNavigation.forEach((item) => {
        item.current = pathname === item.href
        if (item.href === `/${lang}/settings`) {
            item.current = pathname.startsWith(`/${lang}/settings`) || item.urls.includes(pathname)
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