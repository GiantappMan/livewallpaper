"use client";

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/hooks/use-mounted";
import api from "@/lib/client/api";
import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper";
import { Screen } from "@/lib/client/types/screen";
import { useCallback, useEffect, useState } from "react";
import { ToolBar } from "./_components/tool-bar";
import { toast } from "sonner"
import { PlayMode, Playlist, PlaylistMeta, PlaylistType } from "@/lib/client/types/playlist";
import Link from "next/link";
import { WallpaperDialog } from "./_components/wallpaper-dialog";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SettingDialog } from "./_components/setting-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

const Page = () => {
    const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>();
    const [screens, setScreens] = useState<Screen[] | null>();
    const [playingPlaylist, setPlayingPlaylist] = useState<Playlist[] | null>();
    const [openCreateWallpaperDialog, setOpenCreateWallpaperDialog] = useState<boolean>(false);
    const [openSettingDialog, setOpenSettingDialog] = useState<boolean>(false);

    //当前编辑的壁纸对象
    const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const mounted = useMounted()
    const refresh = async () => {
        setRefreshing(true);
        try {
            const res = await api.getWallpapers();
            if (res.error) {
                toast.error("获取壁纸列表失败")
                return;
            }

            const screens = await api.getScreens();
            if (screens.error) {
                toast.error("获取屏幕列表失败");
                return;
            }

            if (!screens.data)
                return

            const _playingPlaylist = await api.getPlayingPlaylist();
            if (_playingPlaylist.error) {
                toast.error("获取正在播放的壁纸失败")
                console.log(_playingPlaylist.error)
                return;
            }

            //给coverUrl增加随即参数防止缓存
            res.data?.forEach((wallpaper) => {
                if (wallpaper.coverUrl) {
                    wallpaper.coverUrl += `?t=${Date.now()}`;
                }
            })
            setWallpapers(res.data);
            setScreens(screens.data);
            setPlayingPlaylist(_playingPlaylist.data);
        } catch (e) {
            console.log(e)
            toast.error("获取壁纸列表失败")
        }
        finally {
            setRefreshing(false);
        }
    }

    const showWallpaper = async (wallpaper: Wallpaper, screen: Screen | null) => {
        let screenIndex = screens?.findIndex((s) => s.deviceName === screen?.deviceName);
        const allScreenIndexes = screens?.map((_, index) => index);
        if (!allScreenIndexes)
            return;

        let screenIndexes = [];
        if (screenIndex === undefined || screenIndex < 0)
            screenIndexes = allScreenIndexes;
        else
            screenIndexes = [screenIndex];

        const playlist: Playlist = {
            wallpapers: [wallpaper],
            setting: {
                playIndex: 0,
                mode: PlayMode.Order,
                screenIndexes,
                // volume: 0,
                isPaused: false
            },
            meta: {
                type: PlaylistType.Playlist,
            } as PlaylistMeta
        }
        const res = await api.showWallpaper(playlist);
        if (res.error) {
            alert(res.error);
            return;
        }
        refresh();
    }

    useEffect(() => {
        refresh();
    }, []);

    let dragCounter = 0;
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        console.log("drag over");
        e.preventDefault();
    }, []);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        dragCounter++;
        console.log("drag enter");
        createWallpaper()
        e.preventDefault();
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        dragCounter--;
        if (dragCounter === 0) {
            // setOpenCreateWallpaperDialog(false);
            console.log("drag leave");
        }
        e.preventDefault();
    };

    const deleteWallpaper = async (wallpaper: Wallpaper) => {
        const res = await api.deleteWallpaper(wallpaper);
        if (!res.data) {
            toast.error("删除壁纸失败，请重试");
            return;
        }
        refresh();
    }

    const handleEditWallpaper = async (wallpaper: Wallpaper) => {
        setCurrentWallpaper(wallpaper);
        setOpenCreateWallpaperDialog(true);
    }

    const settingWallpaper = async (wallpaper: Wallpaper) => {
        setCurrentWallpaper(wallpaper);
        setOpenSettingDialog(true);
    }

    const explorerWallpaper = async (wallpaper: Wallpaper) => {
        if (!wallpaper.filePath)
            return;

        const res = await api.explore(wallpaper.filePath);
        if (res.error) {
            toast.error("打开壁纸文件夹失败");
            return;
        }
    }

    const createWallpaper = () => {
        setCurrentWallpaper(null);
        setOpenCreateWallpaperDialog(true);
    }

    return <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}>
        <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[100vh] pb-20 h-ful">
            {
                (wallpapers || Array.from({ length: 12 })).map((wallpaper, index) => {
                    if (!mounted)
                        return <Skeleton key={index} className="h-[218px] w-full" />
                    if (!wallpaper?.fileUrl)
                        return <></>
                    return (
                        <div key={index} className="relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105">
                            <div className="relative cursor-pointer"
                                onClick={() => {
                                    showWallpaper(wallpaper, null);
                                }}
                                title="点击使所有屏幕生效">

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

                                <ContextMenu modal={false}>
                                    <ContextMenuTrigger>
                                        {/* 遮罩 */}
                                        <div className="flex flex-col justify-between">
                                            <div className="absolute inset-0 bg-background/80 flex flex-col justify-between opacity-0 hover:opacity-100 hover:scale-105 transition-opacity duration-500">
                                                <div className="flex flex-wrap w-full justify-center">
                                                    {
                                                        screens && screens?.length > 1 && [...screens]?.map((screen, index) => {
                                                            return (
                                                                <div key={index} className="flex items-center justify-center">
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            showWallpaper(wallpaper, screen);
                                                                            e.stopPropagation();
                                                                        }}
                                                                        aria-label={`点击使屏幕 ${screen.deviceName} 生效`}
                                                                        className="flex items-center justify-center hover:text-primary lg:px-3 px-1"
                                                                        title={`点击使屏幕 ${screen.deviceName} 生效`}
                                                                        variant="ghost"
                                                                    >
                                                                        <svg
                                                                            className="h-5 w-5"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth="2"
                                                                            viewBox="0 0 24 24"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                        >
                                                                            <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
                                                                            <path d="M8 21h8" />
                                                                            <path d="M12 17v4" />
                                                                            <path d="m17 8 5-5" />
                                                                            <path d="M17 3h5v5" />
                                                                        </svg>
                                                                    </Button>
                                                                </div>
                                                            )
                                                        })
                                                    }
                                                </div>
                                                <div className="flex justify-between px-2">
                                                    <Button
                                                        aria-label="设置"
                                                        className="px-3 flex items-center justify-center hover:text-primary"
                                                        title="设置"
                                                        variant="ghost"
                                                        onClick={(e) => { settingWallpaper(wallpaper); e.stopPropagation(); }}
                                                    >
                                                        <svg
                                                            className="h-5 w-5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            viewBox="0 0 24 24"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </Button>
                                                    <div className="flex">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    aria-label="删除"
                                                                    className="lg:px-3 px-1 flex items-center justify-center hover:text-primary"
                                                                    title="删除"
                                                                    variant="ghost"
                                                                >
                                                                    <svg
                                                                        className="h-5 w-5"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth="2"
                                                                        viewBox="0 0 24 24"
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                    >
                                                                        <path d="M3 6h18" />
                                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                    </svg>
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>删除确认</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        将彻底删除文件，并且无法恢复，确认删除？
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={(e) => {
                                                                        e.stopPropagation();
                                                                    }}>
                                                                        取消
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction onClick={(e) => {
                                                                        deleteWallpaper(wallpaper);
                                                                        e.stopPropagation();
                                                                    }}>
                                                                        删除
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        <Button
                                                            onClick={(e) => { handleEditWallpaper(wallpaper); e.stopPropagation(); }}
                                                            aria-label="编辑" className="lg:px-3 px-1 flex items-center justify-center hover:text-primary" title="编辑" variant="ghost">
                                                            <svg
                                                                className="h-5 w-5"
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
                                                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                                <path d="m15 5 4 4" />
                                                            </svg>
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => { explorerWallpaper(wallpaper); e.stopPropagation(); }}
                                                            aria-label="打开文件夹"
                                                            className="lg:px-3 px-1 flex items-center justify-center hover:text-primary"
                                                            title="打开文件夹"
                                                            variant="ghost"
                                                        >
                                                            <svg
                                                                className=" h-5 w-5"
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
                                                                <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
                                                            </svg>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem onClick={(e) => {
                                            createWallpaper()
                                            e.stopPropagation();
                                        }}>创建壁纸</ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </div>

                            <div className="px-6 py-4">
                                <div className="font-bold text-sm mb-2 lg:text-xl">{wallpaper?.meta?.title}</div>
                                {/* <p className="text-gray-700 text-base">{wallpaper?.meta?.description}</p> */}
                            </div>
                        </div>
                    )
                })
            }
            {/* 创建按钮 */}
            <div className={cn(["relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105",
                {
                    //隐藏
                    "hidden": !mounted || !wallpapers || wallpapers.length === 0,
                }])}>
                <div
                    className="w-full aspect-[3/2]"
                >
                    <Button
                        aria-label="创建壁纸"
                        className="flex w-full h-full hover:text-primary"
                        title="创建壁纸"
                        variant="ghost"
                        onClick={() => createWallpaper()}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                    </Button>
                </div>
            </div>
            {
                wallpapers && wallpapers.length > 0 && playingPlaylist && screens && <ToolBar playingPlaylist={playingPlaylist} screens={screens} onChangeVolume={
                    () => refresh() //刷新音量配置
                } />
            }
        </div >
        {
            mounted && !refreshing && (!wallpapers || wallpapers.length === 0) &&
            <div className="flex items-center justify-center min-h-screen -mt-20">
                <div className="flex flex-col items-center justify-center">
                    <h2 className="text-xl font-semibold mb-2">没有找到壁纸</h2>
                    <p className="text-gray-500 mb-4">你可以创建一个壁纸或者修改壁纸扫描目录。</p>
                    <div className="flex space-x-4">
                        <Button variant="outline" onClick={() => createWallpaper()} >创建壁纸</Button>
                        <Button variant="outline">
                            <Link href="/settings/wallpaper">
                                修改目录
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        }

        <WallpaperDialog
            open={openCreateWallpaperDialog}
            wallpaper={currentWallpaper}
            onChange={(e) => setOpenCreateWallpaperDialog(e)}
            createSuccess={() => {
                setOpenCreateWallpaperDialog(false)
                refresh();
            }} />
        {currentWallpaper && <SettingDialog
            open={openSettingDialog}
            wallpaper={currentWallpaper}
            onChange={(e) => setOpenSettingDialog(e)}
            saveSuccess={() => {
                setOpenSettingDialog(false)
                refresh();
            }} />
        }
    </div>
};

export default Page;
