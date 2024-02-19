
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { i18n, type Locale } from "@/i18n-config";

export default function Page() {
    const router = useRouter()
    useEffect(() => {
        //获取当前语言
        const lang = window.navigator.language
        console.log(lang)
        //i18n.locales 里面找嘴接近的lang
        const locale = i18n.locales.find((locale) => lang.startsWith(locale))
        //如果找到了就跳转到对应语言
        if (locale) {
            router.push(`/${locale}`)
            return
        }
        //如果没找到就跳转到默认语言
        router.push(`/${i18n.defaultLocale}`)
    });

    return (
        <>跳转中</>
    )
}