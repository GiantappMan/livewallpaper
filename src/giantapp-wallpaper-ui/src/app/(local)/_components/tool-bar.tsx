import { Button } from "@/components/ui/button";
import { Playlist } from "@/lib/client/types/playlist";
import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper";
import { useCallback, useEffect, useState } from "react";
import { Screen } from "@/lib/client/types/screen";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import api from "@/lib/client/api";
import {
    Reply,
} from "lucide-react"

interface ToolBarProps extends React.HTMLAttributes<HTMLElement> {
    playingPlaylist: Playlist[]
    screens: Screen[]
}

type PlaylistWrapper = {
    current: Wallpaper;
    playlist?: Playlist;
    screen: Screen;
}

export function ToolBar({ playingPlaylist, screens }: ToolBarProps) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistWrapper | null>(null);
    const [playlists, setPlaylists] = useState<PlaylistWrapper[]>([]);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0);
    const [singlePlaylistMode, setSinglePlaylistMode] = useState<boolean>(true);
    const [showPlaylistButton, setShowPlaylistButton] = useState<boolean>(false);

    useEffect(() => {
        setSinglePlaylistMode(playlists.length === 1);
    }, [playlists]);

    useEffect(() => {
        let tmpPlaylists: PlaylistWrapper[] = [];
        playingPlaylist?.forEach(item => {
            if (item.setting?.playIndex !== undefined) {
                var currentWallpaper = item.wallpapers[item.setting?.playIndex];
                var exist = tmpPlaylists.some(x => x.current.fileUrl === currentWallpaper.fileUrl);
                if (!exist)
                    tmpPlaylists.push({
                        current: currentWallpaper,
                        playlist: item,
                        screen: screens[item.setting.screenIndexes[0]],
                    });
            }
        });
        setPlaylists(tmpPlaylists);
    }, [playingPlaylist, screens]);

    useEffect(() => {
        //选中播放列表已移除
        var exist = playlists?.some(x => x.playlist?.wallpapers.some(y => y.fileUrl === selectedPlaylist?.current.fileUrl));
        if (!exist)
            setSelectedPlaylist(null);

        //设置isPaused
        var isPaused = playlists.some(x => x.playlist?.setting.isPaused);
        if (selectedPlaylist)
            isPaused = selectedPlaylist.playlist?.setting.isPaused || false;
        setIsPaused(isPaused);

        var volume = Math.max(...playlists.map(item => item.playlist?.setting.volume || 0));
        if (selectedPlaylist)
            volume = selectedPlaylist.playlist?.setting.volume || 0;
        setVolume(volume);

        var showPlaylistButton = playlists.some(x => x.playlist && x.playlist.wallpapers.length > 1);
        if (selectedPlaylist)
            showPlaylistButton = !!selectedPlaylist.playlist && selectedPlaylist.playlist.wallpapers.length > 1;
        setShowPlaylistButton(showPlaylistButton);
    }, [playlists, selectedPlaylist]);

    const handlePlayClick = useCallback(() => {
        var index = screens.findIndex(x => x.deviceName === selectedPlaylist?.screen.deviceName);
        api.resumeWallpaper(index);
        //更新playlist对应屏幕的ispaused
        var tmpPlaylists = [...playlists];
        //没有选中，就影响所有playlist
        tmpPlaylists.forEach(element => {
            if (selectedPlaylist && element.screen.deviceName !== selectedPlaylist.screen.deviceName)
                return;
            if (element.playlist && element.playlist.setting) {
                element.playlist.setting.isPaused = false;
            }
        });
        setPlaylists(tmpPlaylists);
    }, [playlists, screens, selectedPlaylist]);

    const handlePauseClick = useCallback(() => {
        var index = screens.findIndex(x => x.deviceName === selectedPlaylist?.screen.deviceName);
        api.pauseWallpaper(index);
        //更新playlist对应屏幕的ispaused
        var tmpPlaylists = [...playlists];
        //没有选中，就影响所有playlist
        tmpPlaylists.forEach(element => {
            if (selectedPlaylist && element.screen.deviceName !== selectedPlaylist.screen.deviceName)
                return;
            if (element.playlist && element.playlist.setting) {
                element.playlist.setting.isPaused = true;
            }
        });
        setPlaylists(tmpPlaylists);
    }, [playlists, screens, selectedPlaylist]);

    const handleVolumeChange = useCallback((value: number[]) => {
        var tmpPlaylists = [...playlists];
        //从tmpPlaylists找目标列表，如果有选中的用选中的，如果没有选中的选有音量的，如果没有音量，选第一个视频壁纸
        debugger
        var target = tmpPlaylists.find(x => x.playlist && x.playlist.setting.volume > 0);
        if (selectedPlaylist)
            target = tmpPlaylists.find(x => x.screen.deviceName === selectedPlaylist.screen.deviceName);
        if (!target)
            target = tmpPlaylists.find(x => x.playlist && x.playlist.wallpapers.some(y => y.meta?.type === WallpaperType.Video));
        if (!target)
            return;

        tmpPlaylists.forEach((element, index) => {
            if (!element.playlist)
                return;

            //选中的屏幕，或者没有选中就影响有声音的屏幕
            if (target === element) {
                api.setVolume(value[0], index)
                setVolume(value[0]);
                element.playlist.setting.volume = value[0];
            }
            else
                element.playlist.setting.volume = 0;
        });
    }, [playlists, selectedPlaylist]);

    return <div className="fixed inset-x-0 ml-18 bottom-0 bg-background h-20 border-t border-primary-300 dark:border-primary-600 flex items-center px-4 space-x-4">
        <div className="flex flex-wrap flex-initial w-1/4 overflow-hidden h-full">
            {playlists.map((item, index) => {
                const isSelected = selectedPlaylist?.current === item.current;
                return <div key={index} className="flex items-center p-1">
                    {
                        isSelected && <Button className="self-start -ml-4" variant="link" size="icon" onClick={() => setSelectedPlaylist(null)} title="返回列表">
                            <Reply className="h-4 w-4" />
                            <span className="sr-only">返回列表</span>
                        </Button>
                    }
                    {
                        (singlePlaylistMode || (!selectedPlaylist || isSelected)) && <picture onClick={() => isSelected ? setSelectedPlaylist(null) : setSelectedPlaylist(singlePlaylistMode ? null : item)} className={cn([{ "cursor-pointer": !singlePlaylistMode }, "mr-2"])}>
                            <img
                                alt="Cover"
                                title={item.current.meta?.title}
                                className={cn(["rounded-lg object-scale-cover aspect-square", { "hover:border-2 hover:border-primary": !singlePlaylistMode }
                                ])}
                                height={50}
                                src={item.current.coverUrl || "/wp-placeholder.webp"}
                                width={50}
                            />
                        </picture>
                    }
                    {
                        (singlePlaylistMode || isSelected) && <div className="flex flex-col text-sm truncate">
                            <div className="font-semibold">{item?.current.meta?.title}</div>
                            <div >{item?.current.meta?.description}</div>
                        </div>
                    }
                </div>
            })}
        </div>

        <div className="flex flex-col flex-1 w-1/2 items-center justify-between">
            <div className="space-x-4">
                {
                    showPlaylistButton && <Button variant="ghost" className="hover:text-primary" title="上一个壁纸">
                        <svg
                            className="h-5 w-5 "
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
                            <polygon points="11 19 2 12 11 5 11 19" />
                            <polygon points="22 19 13 12 22 5 22 19" />
                        </svg>
                    </Button>
                }
                {
                    isPaused && <Button variant="ghost" className="hover:text-primary" title="播放" onClick={handlePlayClick}>
                        <svg
                            className="h-5 w-5 "
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
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </Button>
                }
                {
                    !isPaused && <Button variant="ghost" className="hover:text-primary" title="暂停" onClick={handlePauseClick}>
                        <svg
                            className="h-5 w-5 "
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
                            <rect height="20" rx="2" ry="2" width="6" x="4" y="2" />
                            <rect height="20" rx="2" ry="2" width="6" x="14" y="2" />
                        </svg>
                    </Button>
                }
                {
                    showPlaylistButton && <Button variant="ghost" className="hover:text-primary" title="下一个壁纸">
                        <svg
                            className=" h-5 w-5 "
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
                            <polygon points="13 19 22 12 13 5 13 19" />
                            <polygon points="2 19 11 12 2 5 2 19" />
                        </svg>
                    </Button>
                }
            </div>
            {(selectedPlaylist || singlePlaylistMode) && <div className="flex items-center justify-between text-xs w-full">
                {/* <div className="text-primary-600 dark:text-primary-400">00:00</div>
                <div className="w-full h-1 mx-4 bg-primary/60 rounded" />
                <div className="text-primary-600 dark:text-primary-400">04:30</div> */}
            </div>}
        </div>

        <div className="flex flex-initial w-1/4 items-center justify-end">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="hover:text-primary px-3" title="音量">
                        <svg
                            className=" h-6 w-6 "
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
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        </svg>
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
                    <Slider value={[volume]} max={100} min={0} step={1} onValueChange={handleVolumeChange} />
                </PopoverContent>
            </Popover>
            {
                (selectedPlaylist || singlePlaylistMode) && showPlaylistButton
                && <>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" className="hover:text-primary px-3" title="播放列表">
                                <svg
                                    className=" h-6 w-6"
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
                                    <line x1="8" x2="21" y1="6" y2="6" />
                                    <line x1="8" x2="21" y1="12" y2="12" />
                                    <line x1="8" x2="21" y1="18" y2="18" />
                                    <line x1="3" x2="3.01" y1="6" y2="6" />
                                    <line x1="3" x2="3.01" y1="12" y2="12" />
                                    <line x1="3" x2="3.01" y1="18" y2="18" />
                                </svg>
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>播放列表</SheetTitle>
                                <SheetDescription>
                                    This action cannot be undone. This will permanently delete your account
                                    and remove your data from our servers.
                                </SheetDescription>
                            </SheetHeader>
                        </SheetContent>
                    </Sheet>
                </>
            }
        </div>
    </div >
}
