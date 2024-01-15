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
import { useDebouncedCallback } from 'use-debounce';
import { VideoSlider } from "./video-slider";

interface ToolBarProps extends React.HTMLAttributes<HTMLElement> {
    playingPlaylist: Playlist[]
    screens: Screen[]
    onChangeVolume: () => void
}

type PlaylistWrapper = {
    current: Wallpaper | null;
    playlist?: Playlist;
    screen: Screen;
}
//把秒转换成00:00格式
function formatTime(seconds: number) {
    var min = Math.floor(seconds / 60);
    var sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
}

const PlaybackProgress = ({ screenIndex }: { screenIndex?: number }) => {
    const [time, setTime] = useState('00:00');
    const [totalTime, setTotalTime] = useState('00:00');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            if ((document as any).shell_hidden)
                return;
            try {
                const res = await api.getWallpaperTime(screenIndex);
                console.log("getWallpaperTime:", res);
                if (res.data) {
                    setTime(formatTime(res.data.position));
                    setTotalTime(formatTime(res.data.duration));
                    setProgress(res.data.position / res.data.duration * 100);
                }
                else {
                    setTime('00:00');
                    setTotalTime('00:00');
                }
            } catch (error) {
                console.error('Failed to fetch time:', error);
            }
        }
        fetch();//先立即执行一次
        const timer = setInterval(fetch, 1000);
        return () => clearInterval(timer); // cleanup on component unmount
    }, [screenIndex]);

    return <div className="flex items-center justify-between text-xs w-full select-none">
        <div className="text-primary-600 dark:text-primary-400">{time}</div>
        {/* <div className="w-full h-1 mx-4 bg-primary/60 rounded" /> */}
        <VideoSlider value={[progress]} className="w-full h-1 mx-4 rounded" />
        <div className="text-primary-600 dark:text-primary-400">{totalTime}</div>
    </div>
}

export function ToolBar({ playingPlaylist, screens, onChangeVolume }: ToolBarProps) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistWrapper | null>(null);
    const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null); //当前选中的壁纸
    const [playlists, setPlaylists] = useState<PlaylistWrapper[]>([]);
    const [playingWallpapers, setPlayingWallpapers] = useState<Wallpaper[]>([]); //当前正在播放的壁纸，可能是多个屏幕的
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0);
    const [singlePlaylistMode, setSinglePlaylistMode] = useState<boolean>(true);
    const [showPlaylistButton, setShowPlaylistButton] = useState<boolean>(false);

    useEffect(() => {
        setSinglePlaylistMode(playlists.filter(x => !!x.current).length === 1);
    }, [playlists]);

    //外部参数变化，更新内部playlist
    useEffect(() => {
        let tmpPlaylists: PlaylistWrapper[] = [];
        playingPlaylist?.forEach(item => {
            if (item.setting?.playIndex !== undefined) {
                var currentWallpaper = item.wallpapers[item.setting?.playIndex];
                var exist = tmpPlaylists.some(x => x.current?.fileUrl === currentWallpaper.fileUrl);
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

    //内部playlist变化，更新状态
    useEffect(() => {
        //选中播放列表已移除
        var exist = playlists?.some(x => x.playlist?.wallpapers.some(y => y.fileUrl === selectedPlaylist?.current?.fileUrl));
        if (!exist)
            setSelectedPlaylist(null);

        //设置isPaused
        var isPaused = playlists.some(x => x.playlist?.setting.isPaused);
        if (selectedPlaylist)
            isPaused = selectedPlaylist.playlist?.setting.isPaused || false;
        setIsPaused(isPaused);

        //设置isPlaying
        var isPlaying = playlists.some(x => !!x.current);
        if (selectedPlaylist)
            isPlaying = !!selectedPlaylist.current;
        setIsPlaying(isPlaying);

        //设置playingWallpapers
        var playingWallpapers: Wallpaper[] = [];
        playlists.forEach(x => {
            if (x.current)
                playingWallpapers.push(x.current);
        });
        setPlayingWallpapers(playingWallpapers);

        var showPlaylistButton = playlists.some(x => x.playlist && x.playlist.wallpapers.length > 1);
        if (selectedPlaylist)
            showPlaylistButton = !!selectedPlaylist.playlist && selectedPlaylist.playlist.wallpapers.length > 1;
        setShowPlaylistButton(showPlaylistButton);
    }, [playlists, selectedPlaylist]);

    //监控playingWallpapers变化
    useEffect(() => {
        var volume = Math.max(...playingWallpapers.map(item => item.setting.volume || 0));
        if (selectedPlaylist) {
            var selectedWallpaper = playingWallpapers.find(x => x.fileUrl === selectedPlaylist.current?.fileUrl);
            volume = selectedWallpaper?.setting.volume || 0;
        }
        setVolume(volume);
    }, [playingWallpapers, selectedPlaylist]);

    //监控selectedPlaylist变化
    useEffect(() => {
        setSelectedWallpaper(selectedPlaylist?.current || null);
    }, [selectedPlaylist]);

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

    const handleStopClick = useCallback(() => {
        var index = screens.findIndex(x => x.deviceName === selectedPlaylist?.screen.deviceName);
        api.stopWallpaper(index);
        //更新playlist对应屏幕的ispaused
        var tmpPlaylists = [...playlists];
        //没有选中，就影响所有playlist
        tmpPlaylists.forEach(element => {
            if (selectedPlaylist && element.screen.deviceName !== selectedPlaylist.screen.deviceName)
                return;
            element.current = null;
        });
        setPlaylists(tmpPlaylists);
    }, [playlists, screens, selectedPlaylist]);

    const handleVolumeChange = useCallback((value: number[]) => {
        var tmpLists = [...playingWallpapers];
        //从playingWallpapers找，如果有选中的用选中的，如果没有选中的选有音量的，如果没有音量，选第一个视频壁纸
        var target = selectedWallpaper
            || tmpLists.find(x => x.setting && x.setting.volume > 0)
            || tmpLists.find(x => x.meta.type === WallpaperType.Video);

        if (!target)
            return;

        tmpLists.forEach(async (element) => {
            if (!element)
                return;

            if (target === element) {
                setVolume(value[0]);
                //壁纸所属playlist
                var currentPlaylist = playlists.find(x => x.playlist?.wallpapers.some(y => y.fileUrl === element.fileUrl));
                await api.setVolume(value[0], currentPlaylist?.playlist?.setting?.screenIndexes[0])
                onChangeVolume?.();
                // element.setting.volume = value[0];
            }
            // else
            //     element.setting.volume = 0;
        });
    }, [onChangeVolume, playingWallpapers, playlists, selectedWallpaper]);

    const handleVolumeChangeDebounced = useDebouncedCallback((value) => {
        handleVolumeChange(value);
    }, 300
    );

    if (!isPlaying)
        return <></>

    return <div className="fixed inset-x-0 ml-18 bottom-0 bg-background h-20 border-t border-primary-300 dark:border-primary-600 flex items-center px-4 space-x-4">
        <div className="flex flex-wrap flex-initial w-1/4 overflow-hidden h-full">
            {playlists.filter(x => x.current).map((item, index) => {
                const isSelected = selectedPlaylist?.current?.fileUrl === item.current?.fileUrl;
                const show = (singlePlaylistMode || (!selectedPlaylist || !!isSelected))
                return show && <div key={index} className="flex items-center p-0 m-0" >
                    {
                        isSelected && <div className="self-start mt-3 mr-1 cursor-pointer" onClick={() => setSelectedPlaylist(null)} title="返回列表">
                            <Reply className="h-4 w-4" />
                            <span className="sr-only">返回列表</span>
                        </div>
                    }
                    <picture onClick={() => isSelected ? setSelectedPlaylist(null) : setSelectedPlaylist(singlePlaylistMode ? null : item)} className={cn([{ "cursor-pointer": !singlePlaylistMode }, "mr-2"])}>
                        <img
                            alt="Cover"
                            title={item.current?.meta?.title}
                            className={cn(["rounded-lg object-scale-cover aspect-square", { "hover:border-2 hover:border-primary": !singlePlaylistMode }
                            ])}
                            height={50}
                            src={item.current?.coverUrl || "/wp-placeholder.webp"}
                            width={50}
                        />
                    </picture>
                    {
                        (singlePlaylistMode || isSelected) && <div className="flex flex-col text-sm truncate">
                            <div className="font-semibold">{item?.current?.meta?.title}</div>
                            <div >{item?.current?.meta?.description}</div>
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
                {/* 停止按钮 */}
                {isPlaying && <Button variant="ghost" className="hover:text-primary" title="停止" onClick={handleStopClick}>
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
                        <rect height="20" rx="2" ry="2" width="20" x="2" y="2" />
                    </svg>
                </Button>
                }
                {
                    isPlaying && isPaused && <Button variant="ghost" className="hover:text-primary" title="播放" onClick={handlePlayClick}>
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
                    isPlaying && !isPaused && <Button variant="ghost" className="hover:text-primary" title="暂停" onClick={handlePauseClick}>
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
            {/* {(selectedPlaylist || singlePlaylistMode) && <div className="flex items-center justify-between text-xs w-full">
                <div className="text-primary-600 dark:text-primary-400">00:00</div>
                <div className="w-full h-1 mx-4 bg-primary/60 rounded" />
                <div className="text-primary-600 dark:text-primary-400">04:30</div>
            </div>} */}
            {(selectedPlaylist || singlePlaylistMode) && <PlaybackProgress screenIndex={selectedPlaylist?.playlist?.setting.screenIndexes[0]} />}

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
                    <Slider defaultValue={[volume]} max={100} min={0} step={1} onValueChange={handleVolumeChangeDebounced} />
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
    </div>
}
