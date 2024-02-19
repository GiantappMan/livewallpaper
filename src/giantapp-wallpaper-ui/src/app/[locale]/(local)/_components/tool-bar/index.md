import { Button } from "@/components/ui/button";
import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper";
import { useCallback, useEffect, useState } from "react";
import { Screen } from "@/lib/client/types/screen";
import { cn } from "@/lib/utils";
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
import PlaybackProgress from "./playback-progress";
import PlaylistSheet from "./playlist-sheet";

interface ToolBarProps extends React.HTMLAttributes<HTMLElement> {
    wallpapers: Wallpaper[]
    screens: Screen[]
    onChangeVolume: () => void
    onChangeWallpapers?: (wallpaper?: Wallpaper[]) => void
}

export function ToolBar({ wallpapers, screens, onChangeVolume, onChangeWallpapers }: ToolBarProps) {
    const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null); //当前选中的壁纸
    const [selectedScreenIndex, setSelectedScreenIndex] = useState<number | undefined>(); //当前选中的屏幕index
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0);
    const [singlePlaylistMode, setSinglePlaylistMode] = useState<boolean>(true);
    const [showPlaylistButton, setShowPlaylistButton] = useState<boolean>(false);

    //更新selectedScreenIndex
    useEffect(() => {
        if (selectedWallpaper && wallpapers.length > 1)
            setSelectedScreenIndex(selectedWallpaper.setting.screenIndexes[0]);
        else
            setSelectedScreenIndex(undefined);
    }, [selectedWallpaper, wallpapers.length]);

    //内部playlist变化，更新状态
    useEffect(() => {
        setSinglePlaylistMode(wallpapers.length === 1);
        //选中播放列表已移除
        var exist = wallpapers?.some(x => Wallpaper.isSame(x, selectedWallpaper));
        if (!exist)
            setSelectedWallpaper(null);
        // //如果只有一个默认选中
        // if (playlists.length === 1)
        //     setSelectedPlaylist(playlists[0]);

        //设置isPaused
        var isPaused = wallpapers.some(x => x.setting.isPaused);
        if (selectedWallpaper)
            isPaused = selectedWallpaper.setting.isPaused || false;
        setIsPaused(isPaused);

        //设置isPlaying
        var isPlaying = wallpapers.length > 0;
        setIsPlaying(isPlaying);

        var showPlaylistButton = wallpapers.some(x => x.setting.isPlaylist);
        if (selectedWallpaper)
            showPlaylistButton = !!selectedWallpaper.setting.isPlaylist;
        setShowPlaylistButton(showPlaylistButton);
    }, [wallpapers, selectedWallpaper]);

    //监控playingWallpapers变化
    useEffect(() => {
        var volume = Math.max(...wallpapers.map(item => item.setting.volume || 0));
        if (selectedWallpaper) {
            var selectedWallpaper = wallpapers.find(x => x.fileUrl === selectedScreenIndex.wallpaper?.fileUrl);
            volume = selectedWallpaper?.setting.volume || 0;
        }
        setVolume(volume);
    }, [playingWallpapers, selectedPlaylist]);

    //监控selectedPlaylist变化
    useEffect(() => {
        setSelectedWallpaper(selectedPlaylist?.wallpaper || null);
    }, [selectedPlaylist]);

    const handlePlayClick = useCallback(() => {
        var index = screens.findIndex(x => x.deviceName === selectedPlaylist?.screen.deviceName);
        api.resumeWallpaper(index);
        //更新playlist对应屏幕的ispaused
        var tmpPlaylists = [...wallpaperWrappers];
        //没有选中，就影响所有playlist
        tmpPlaylists.forEach(element => {
            if (selectedPlaylist && element.screen.deviceName !== selectedPlaylist.screen.deviceName)
                return;
            if (element.playlist && element.playlist.setting) {
                element.playlist.setting.isPaused = false;
            }
        });
        setWallpaperWrappers(tmpPlaylists);
    }, [wallpaperWrappers, screens, selectedPlaylist]);

    const handlePauseClick = useCallback(() => {
        var index = screens.findIndex(x => x.deviceName === selectedPlaylist?.screen.deviceName);
        api.pauseWallpaper(index);
        //更新playlist对应屏幕的ispaused
        var tmpPlaylists = [...wallpaperWrappers];
        //没有选中，就影响所有playlist
        tmpPlaylists.forEach(element => {
            if (selectedPlaylist && element.screen.deviceName !== selectedPlaylist.screen.deviceName)
                return;
            if (element.playlist && element.playlist.setting) {
                element.playlist.setting.isPaused = true;
            }
        });
        setWallpaperWrappers(tmpPlaylists);
    }, [wallpaperWrappers, screens, selectedPlaylist]);

    const handleStopClick = useCallback(() => {
        var index = screens.findIndex(x => x.deviceName === selectedPlaylist?.screen.deviceName);
        api.stopWallpaper(index);
        //更新playlist对应屏幕的ispaused
        var tmpPlaylists = [...wallpaperWrappers];
        //没有选中，就影响所有playlist
        tmpPlaylists.forEach(element => {
            if (selectedPlaylist && element.screen.deviceName !== selectedPlaylist.screen.deviceName)
                return;
            element.wallpaper = null;
        });
        setWallpaperWrappers(tmpPlaylists);
    }, [wallpaperWrappers, screens, selectedPlaylist]);

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
                var currentPlaylist = wallpaperWrappers.find(x => x.playlist?.wallpapers.some(y => y.fileUrl === element.fileUrl));
                await api.setVolume(value[0], currentPlaylist?.playlist?.setting?.screenIndexes[0])
                onChangeVolume?.();
            }
        });
    }, [onChangeVolume, playingWallpapers, wallpaperWrappers, selectedWallpaper]);

    const handleVolumeChangeDebounced = useDebouncedCallback((value) => {
        handleVolumeChange(value);
    }, 300
    );

    if (!isPlaying)
        return <></>

    return <div className="fixed inset-x-0 ml-18 bottom-0 bg-background h-20 border-t border-primary-300 dark:border-primary-600 flex items-center px-4 space-x-4">
        <div className="flex flex-wrap flex-initial w-1/4 overflow-hidden h-full">
            {wallpaperWrappers.filter(x => x.wallpaper).map((item, index) => {
                const isSelected = !singlePlaylistMode && selectedPlaylist?.wallpaper?.fileUrl === item.wallpaper?.fileUrl;
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
                            title={item.wallpaper?.meta?.title}
                            className={cn(["rounded-lg object-scale-cover aspect-square", { "hover:border-2 hover:border-primary": !singlePlaylistMode }
                            ])}
                            height={50}
                            src={item.wallpaper?.coverUrl || "/wp-placeholder.webp"}
                            width={50}
                        />
                    </picture>
                    {
                        (singlePlaylistMode || isSelected) && <div className="flex flex-col text-sm truncate">
                            <div className="font-semibold">{item?.wallpaper?.meta?.title}</div>
                            <div >{item?.wallpaper?.meta?.description}</div>
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
            {(selectedPlaylist || singlePlaylistMode) && <PlaybackProgress screenIndex={selectedScreenIndex} />}

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
                (selectedPlaylist?.playlist || singlePlaylistMode)
                && <PlaylistSheet selectedWallpaper={selectedPlaylist?.playlist} />
            }
        </div>
    </div>
}
