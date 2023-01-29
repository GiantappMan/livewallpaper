import { invoke } from '@tauri-apps/api/tauri'
import { GetStaticProps, InferGetStaticPropsType } from 'next'
import { useEffect, useState } from 'react'
type Wallpaper = {
    path: string
}
export default function Local() {
    const [wallpaper, setWallpaper] = useState<Wallpaper[]>([])
    const [isLoading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        invoke("get_wallpapers").then((wallpapers) => {
            console.log(wallpapers);
            setWallpaper(wallpapers as Wallpaper[])
            setLoading(false)
        })
    }, [])

    if (isLoading) return <p>Loading...</p>
    if (!wallpaper) return <p>No profile data</p>

    return (
        <div>
            <h1>Local</h1>
            {/* 遍历wallpaper */}
            {wallpaper.map((item, index) => {
                return (
                    <button key={index}>
                        {item.path}
                    </button>
                )
            })}
        </div>
    );
}