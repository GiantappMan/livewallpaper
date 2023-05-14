"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
interface NavItem {
  name: string;
  href: string;
  current: boolean;
}

const SettingsPage = ({ children }: { children: React.ReactNode }) => {
  const [subNavigation, setSubNavigation] = useState<NavItem[]>([
    {
      name: "常规",
      href: "/settings/general",
      current: false,
    },
    {
      name: "壁纸",
      href: "/settings/wallpaper",
      current: false,
    },
  ]);

  const pathname = usePathname();
  useEffect(() => {
    const updateActive = () => {
      setSubNavigation((prev) =>
        prev.map((item) => ({
          ...item,
          current: pathname === item.href,
        }))
      );
    };
    updateActive();
  }, [pathname]);

  return (
    <div className="flex w-full h-full flex-row overflow-hidden">
      <nav
        aria-label="Sections"
        className="w-96 flex-shrink-0 border-r border-black flex flex-col"
      >
        <div className="flex h-16 flex-shrink-0 items-center border-b border-black px-6">
          <p className="text-lg font-medium text-gray-200">设置</p>
        </div>
        <div className="h-full  flex-1 overflow-y-auto">
          {subNavigation.map((item) => (
            <Link
              key={item.name}
              prefetch={false}
              href={item.href}
              className={`${
                item.current
                  ? "bg-blue-600 bg-opacity-50"
                  : "hover:bg-blue-50 hover:bg-opacity-50"
              } flex p-6 border-b border-black`}
              aria-current={item.current ? "page" : undefined}
            >
              <div className="ml-3 text-sm">
                <p className="font-medium text-gray-300">{item.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div>{children}</div>
      </div>
    </div>
  );
};

export default SettingsPage;
