"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function SidebarNav({ className, lang, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  const items = [
    {
      name: "常规",
      href: `/${lang}/settings`,
      icon: (
        <svg
          className=" h-4 w-4"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3"
          />
        </svg>
      ),
    },
    {
      name: "壁纸",
      href: `/${lang}/settings/wallpaper`,
      icon: (
        <svg
          className=" h-4 w-4"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="9" r="2" />
          <path d="m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      ),
    },
    {
      name: "外观",
      href: `/${lang}/settings/appearance`,
      icon: (
        <svg
          className=" h-4 w-4"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z" />
          <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
          <path d="M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" />
        </svg>
      ),
    },
  ]
  return (
    <aside className="flex flex-col gap-4 px-4 py-6 text-sm font-medium">
      {items.map((item) => (
        <Link
          key={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${pathname === item.href
            ? "text-zinc-900 bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          href={item.href}
        >
          {item.icon}
          {item.name}
        </Link>
      ))}
    </aside>
  )
}