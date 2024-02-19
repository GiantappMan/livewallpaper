
'use client'

import { useRouter } from 'next/navigation'

export default function Page() {
    const router = useRouter()
    //获取当前语言
    const lang = "en";
    //跳转
    router.push(`/${lang}`)
    return (
        <>跳转中</>
    )
}