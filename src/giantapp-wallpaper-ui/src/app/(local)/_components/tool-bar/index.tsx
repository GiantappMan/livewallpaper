import { Wallpaper } from "@/lib/client/types/wallpaper"
import { Screen } from "@/lib/client/types/screen";
import { useCallback, useState } from "react";
import { Reply } from "lucide-react"
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import PlaybackProgress from "./playback-progress";
import { Slider } from "@/components/ui/slider"
import PlaylistSheet from "./playlist-sheet";
import { useDebouncedCallback } from 'use-debounce';
import api from "@/lib/client/api";

interface ToolBarProps extends React.HTMLAttributes<HTMLElement> {
    wallpapers: Wallpaper[]
    screens: Screen[]
    onChangeVolume: () => void
    onChangeWallpapers?: (wallpaper?: Wallpaper[]) => void
}
export function ToolBar({ wallpapers, screens, onChangeVolume, onChangeWallpapers }: ToolBarProps) {
    debugger
    const singlePlaylistMode = wallpapers.length == 1;
    const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null); //当前选中的壁纸
    const [showPlaylistButton, setShowPlaylistButton] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0);
    const [selectedScreenIndex, setSelectedScreenIndex] = useState<number>(0); //当前选中的屏幕索引

    //监控wallpapers，如果只有一个，默认选中
    if (wallpapers.length == 1 && !selectedWallpaper) {
        setSelectedWallpaper(wallpapers[0]);
    }

    const handleStopClick = useCallback(() => {
    }, []);

    const handlePlayClick = useCallback(() => {
    }, []);

    const handlePauseClick = useCallback(() => {
    }, []);

    const handleVolumeChange = useCallback(async (value: number[]) => {
        debugger
        const volume = value[0];
        //选中的，或者第一个有音量的壁纸
        var target = selectedWallpaper || wallpapers.find(x => Wallpaper.findPlayingWallpaper(x).setting.volume > 0);
        if (!target)
            return;

        setVolume(volume);
        await api.setVolume(volume, target.setting.screenIndexes[0]);
        onChangeVolume?.();
    }, [onChangeVolume, selectedWallpaper, wallpapers]);

    const handleVolumeChangeDebounced = useDebouncedCallback((value) => {
        handleVolumeChange(value);
    }, 300
    );

    return <div className="fixed inset-x-0 ml-18 bottom-0 bg-background h-20 border-t border-primary-300 dark:border-primary-600 flex items-center px-4 space-x-4">
        <div className="flex flex-wrap flex-initial w-1/4 overflow-hidden h-full">
            {wallpapers.map((item, index) => {
                const isSelected = selectedWallpaper == item;
                const showBackBtn = isSelected && wallpapers.length > 1;
                return <div key={index} className="flex items-center p-0 m-0" >
                    {
                        isSelected && <div className="self-start mt-3 mr-1 cursor-pointer" onClick={() => setSelectedWallpaper(null)} title="返回列表">
                            <Reply className="h-4 w-4" />
                            <span className="sr-only">返回列表</span>
                        </div>
                    }
                    <picture onClick={() => isSelected ? setSelectedWallpaper(null) : setSelectedWallpaper(singlePlaylistMode ? null : item)} className={cn([{ "cursor-pointer": !singlePlaylistMode }, "mr-2"])}>
                        <img
                            alt="Cover"
                            title={item.meta.title}
                            className={cn(["rounded-lg object-scale-cover aspect-square", { "hover:border-2 hover:border-primary": !singlePlaylistMode }
                            ])}
                            height={50}
                            src={item.coverUrl || "/wp-placeholder.webp"}
                            width={50}
                        />
                    </picture>
                    {
                        // (singlePlaylistMode || isSelected) &&
                        <div className="flex flex-col text-sm truncate">
                            <div className="font-semibold">{item.meta.title}</div>
                            <div >{item.meta.description}</div>
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
            {(selectedWallpaper || singlePlaylistMode) && <PlaybackProgress screenIndex={selectedScreenIndex} />}

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
                (selectedWallpaper?.setting.isPlaylist)
                && <PlaylistSheet selectedWallpaper={selectedWallpaper} />
            }
        </div>
    </div>
}
