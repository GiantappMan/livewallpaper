"use client";
import './styles/globals.css'
import "./styles/themes.css"
import { Inter as FontSans } from "next/font/google"
import { cn } from '@/lib/utils'
import { CogIcon, HomeIcon, Squares2X2Icon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import {
  CogIcon as solidCogIcon,
  HomeIcon as solidHomeIcon,
  Squares2X2Icon as solidSquares2X2Icon,
  QuestionMarkCircleIcon as questionMarkCircleIcon
} from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavMenu from '@/components/nav-menu';
import { ThemeProvider } from '@/components/theme-providers';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { ThemeWrapper } from '@/components/theme-wrapper';
import { ConfigAppearance } from '@/lib/client/types/config';
import api from "@/lib/client/api";
import { defaultConfig, useConfig } from '@/hooks/use-config';
import { Toaster } from "@/components/ui/sonner"
export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  const [_, setConfig] = useConfig()
  //读取主题设置
  const fetchConfig = async () => {
    const { data } = await api.getConfig<ConfigAppearance>("Appearance");
    setConfig(data || defaultConfig);
    return data;
  };

  useEffect(() => {
    fetchConfig();

    api.onRefreshPage(() => {
      console.log("refresh page");
      window.location.reload();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeWrapper>
            <div className="flex h-screen bg-background">
              <div className="flex w-[68px] overflow-y-auto">
                <div className="flex flex-1 w-full flex-col items-center">
                  <div className="w-full flex-1 space-y-1 px-1">
                    {sidebarTopNavigation.map((item) => (
                      <NavMenu
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
                      <NavMenu
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

              {/* Content area */}
              <div className="flex flex-1 flex-col overflow-hidden border text-card-foreground shadow ml-1 rounded-l-lg rounded-bl-none">
                <main>
                  {children}
                </main>
                <Toaster closeButton={true} position="top-center" />
              </div>
            </div>
          </ThemeWrapper>
        </ThemeProvider>
        <ThemeSwitcher />
      </body>
    </html>
  )
}
