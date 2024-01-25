import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/lib/client/api"
import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper"
import { useEffect, useState } from "react"

interface Props {
    selectedWallpapers: Wallpaper[]
    open: boolean
    onChangeOpen: (open: boolean) => void
    saveSuccess?: () => void
}

export function SelectWallpaperDialog(props: Props) {
    const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>();
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const refresh = async () => {
        setRefreshing(true);
        try {
            const res = await api.getWallpapers();
            if (res.error) {
                return;
            }

            //给coverUrl增加随即参数防止缓存
            res.data?.forEach((wallpaper) => {
                if (wallpaper.coverUrl) {
                    wallpaper.coverUrl += `?t=${Date.now()}`;
                }
            })
            setWallpapers(res.data);
        } catch (e) {
            console.log(e)
        }
        finally {
            setRefreshing(false);
        }
    }
    useEffect(() => {
        refresh();
    }, []);
    return <Dialog open={props.open} onOpenChange={(e) => {
        props.onChangeOpen(e);
    }} >
        <DialogContent className={"lg:max-w-screen-lg"}>
            <DialogHeader>
                <DialogTitle>选择壁纸</DialogTitle>
                <DialogDescription></DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
                <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
                    {
                        (wallpapers || Array.from({ length: 12 })).map((wallpaper, index) => {
                            if (refreshing)
                                return <Skeleton key={index} className="h-[218px] w-full" />
                            if (!wallpaper?.fileUrl)
                                return <div key={index}></div>
                            return (
                                <div key={index} className="relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105">
                                    <div className="relative cursor-pointer"
                                        title="点击选择">

                                        {/* 图片 */}
                                        {(wallpaper?.meta.type === WallpaperType.Img || wallpaper?.meta.type === WallpaperType.AnimatedImg) && <picture>
                                            <img
                                                alt={wallpaper?.meta.title}
                                                className="w-full"
                                                height="200"
                                                src={wallpaper?.coverUrl || wallpaper?.fileUrl || "/wp-placeholder.webp"}
                                                style={{
                                                    aspectRatio: "300/200",
                                                    objectFit: "cover",
                                                }}
                                                width="300"
                                            />
                                        </picture>
                                        }
                                        {/* 视频 */}
                                        {wallpaper?.meta.type === WallpaperType.Video && <picture>
                                            <img
                                                alt={wallpaper?.meta.title}
                                                className="w-full"
                                                height="200"
                                                src={wallpaper?.coverUrl || "/wp-placeholder.webp"}
                                                style={{
                                                    aspectRatio: "300/200",
                                                    objectFit: "cover",
                                                }}
                                                width="300"
                                            />
                                        </picture>
                                        }
                                    </div>

                                    <div className="px-6 py-4">
                                        <div className="text-sm">{wallpaper?.meta?.title}</div>
                                        {/* <p className="text-gray-700 text-base">{wallpaper?.meta?.description}</p> */}
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button type="submit">确定</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}