import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/lib/client/api"
import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper"
import { useCallback, useEffect, useState } from "react"

interface Props {
    selectedWallpapers: Wallpaper[]
    open: boolean
    onChangeOpen: (open: boolean) => void
    onSaveSuccess?: (wallpapers: Wallpaper[]) => void
}

export function SelectWallpaperDialog(props: Props) {
    const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>();
    const [selectedWallpapers, setSelectedWallpapers] = useState<Wallpaper[]>([]);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [allChecked, setAllChecked] = useState<boolean>(false);

    //监控并更新allChecked
    useEffect(() => {
        setAllChecked(selectedWallpapers.length === wallpapers?.length);
    }, [selectedWallpapers, wallpapers])

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
    // Add a new function to handle wallpaper selection and deselection
    const toggleWallpaperSelection = useCallback((wallpaper: Wallpaper) => {
        const isSelected = selectedWallpapers.some(selected => selected.meta.id === wallpaper.meta.id);
        if (isSelected) {
            setSelectedWallpapers(selectedWallpapers.filter(selected => selected.meta.id !== wallpaper.meta.id));
        } else {
            setSelectedWallpapers([...selectedWallpapers, wallpaper]);
        }
    }, [selectedWallpapers])

    // Add a function to save selected wallpapers
    const saveSelectedWallpapers = useCallback(() => {
        if (props.onSaveSuccess) {
            props.onSaveSuccess(selectedWallpapers);
        }
        props.onChangeOpen(false); // Close the dialog after saving
        setSelectedWallpapers([]); // Clear selected wallpapers
    }, [props, selectedWallpapers])

    //Add a function to toggle check all
    const toggleCheckAll = useCallback(() => {
        if (selectedWallpapers.length === wallpapers?.length) {
            setSelectedWallpapers([]);
        } else {
            setSelectedWallpapers(wallpapers || []);
        }
    }, [selectedWallpapers, wallpapers])

    useEffect(() => {
        refresh();
    }, []);
    return <Dialog open={props.open} onOpenChange={(e) => {
        props.onChangeOpen(e);
    }} >
        <DialogContent className={"lg:max-w-screen-lg"}>
            <DialogHeader>
                <DialogTitle>选择壁纸</DialogTitle>
                <DialogDescription>点击选中壁纸</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
                <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
                    {
                        (wallpapers || Array.from({ length: 12 })).map((wallpaper, index) => {
                            const isSelected = wallpaper && selectedWallpapers.some(selected => selected.meta.id === wallpaper.meta.id);

                            if (refreshing)
                                return <Skeleton key={index} className="h-[218px] w-full" />
                            if (!wallpaper?.fileUrl)
                                return <div key={index}></div>
                            return (
                                <div key={index}
                                    title={wallpaper?.meta.title}
                                    className={`relative group rounded overflow-hidden shadow-lg transform transition duration-300 hover:scale-105 ${isSelected ? 'ring  ring-primary' : ''}`}
                                    onClick={() => toggleWallpaperSelection(wallpaper)}>
                                    <div className="relative cursor-pointer">

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

                                    <div className="px-2 py-1">
                                        <div className="text-sm overflow-hidden overflow-ellipsis whitespace-nowrap">{wallpaper?.meta?.title}</div>
                                        {/* <p className="text-gray-700 text-base">{wallpaper?.meta?.description}</p> */}
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </ScrollArea>
            <DialogFooter>
                <div className="flex w-full justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="chk_All" checked={allChecked} onCheckedChange={toggleCheckAll} />
                        <label
                            htmlFor="chk_All"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            全选
                        </label>
                    </div>
                    <Button type="submit" onClick={saveSelectedWallpapers}>确定</Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}