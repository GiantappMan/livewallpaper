import { Wallpaper, WallpaperMeta } from "@/lib/client/types/wallpaper"
import { useCallback, useEffect, useState } from "react";
import { Reply } from "lucide-react"
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PlaybackProgress from "./playback-progress";
import PlaylistSheet from "./playlist-sheet";
import api from "@/lib/client/api";
import AudioIndexBtn from "./audio-index-btn";
import PlayingStatus from "@/lib/client/types/playing-status";
import AudioVolumeBtn from "./audio-volume-btn";
import { getGlobal } from '@/i18n-config';

interface ToolBarProps extends React.HTMLAttributes<HTMLElement> {
    playingStatus: PlayingStatus
    onChangePlayingStatus: (e: PlayingStatus) => void
}
export function ToolBar({ playingStatus, onChangePlayingStatus }: ToolBarProps) {
    const dictionary = getGlobal();
    const singlePlaylistMode = playingStatus.wallpapers.length == 1;
    const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null); //当前选中的壁纸
    const [showPlaylistButton, setShowPlaylistButton] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [selectedScreenIndex, setSelectedScreenIndex] = useState<number>(-1); //当前选中的屏幕索引

    //监控wallpapers，如果只有一个，默认选中
    useEffect(() => {
        if (playingStatus.wallpapers.length == 1)
            setSelectedWallpaper(playingStatus.wallpapers[0]);
        else {
            //如果被选中的不存在了则清空
            if (selectedWallpaper && !playingStatus.wallpapers.includes(selectedWallpaper))
                setSelectedWallpaper(null);
        }

        var isPaused = playingStatus.wallpapers.every(x => Wallpaper.findPlayingWallpaper(x).runningInfo.isPaused);
        if (selectedWallpaper) {
            isPaused = Wallpaper.findPlayingWallpaper(selectedWallpaper).runningInfo.isPaused || false;
        }
        setIsPaused(isPaused);
    }, [playingStatus.wallpapers, selectedWallpaper]);

    //监控selectedWallpaper变化
    useEffect(() => {
        //更新选中屏幕
        if (selectedWallpaper) {
            var index = selectedWallpaper.runningInfo.screenIndexes[0];
            if (index === undefined)
                index = -1;
            setSelectedScreenIndex(index);
        }
        else
            setSelectedScreenIndex(-1);
    }, [selectedWallpaper]);

    const handleStopClick = useCallback(() => {
        //获取要关闭的屏幕
        api.stopWallpaper(selectedScreenIndex);

        //更新playlist
        if (selectedWallpaper) {
            var index = playingStatus.wallpapers.indexOf(selectedWallpaper);
            if (index > -1) {
                var newWallpapers = [...playingStatus.wallpapers];
                newWallpapers.splice(index, 1);
                onChangePlayingStatus?.({
                    ...playingStatus,
                    wallpapers: newWallpapers,
                });
            }
        }
        else {
            onChangePlayingStatus?.(
                {
                    ...playingStatus,
                    wallpapers: [],
                }
            );
        }
    }, [onChangePlayingStatus, playingStatus, selectedScreenIndex, selectedWallpaper]);

    const handlePlayClick = useCallback(() => {
        api.resumeWallpaper(selectedScreenIndex);
        onChangePlayingStatus?.({
            ...playingStatus,
            wallpapers: playingStatus.wallpapers.map(x => {
                var playingWallpaper = Wallpaper.findPlayingWallpaper(x);
                if (selectedScreenIndex < 0 || playingWallpaper.runningInfo.screenIndexes[0] === selectedScreenIndex) {
                    playingWallpaper.runningInfo.isPaused = false;
                }
                return x;
            })
        });
    }, [onChangePlayingStatus, playingStatus, selectedScreenIndex]);

    const handlePauseClick = useCallback(() => {
        api.pauseWallpaper(selectedScreenIndex);
        onChangePlayingStatus?.({
            ...playingStatus,
            wallpapers: playingStatus.wallpapers.map(x => {
                var playingWallpaper = Wallpaper.findPlayingWallpaper(x);
                if (selectedScreenIndex < 0 || playingWallpaper.runningInfo.screenIndexes[0] === selectedScreenIndex) {
                    playingWallpaper.runningInfo.isPaused = true;
                }
                return x;
            })
        });
    }, [onChangePlayingStatus, playingStatus, selectedScreenIndex]);

    return <div className="fixed inset-x-0 ml-18 bottom-0 bg-background h-20 border-t border-primary-300 dark:border-primary-600 flex items-center px-4 space-x-4">
        <div className="flex flex-wrap flex-initial w-1/4 overflow-hidden h-full">
            {playingStatus.wallpapers.map((item, index) => {
                const isSelected = selectedWallpaper == item;
                const showBackBtn = isSelected && playingStatus.wallpapers.length > 1;
                const showWallpaperItem = isSelected || !selectedWallpaper//只显示选中的，如果没选中就都显示
                return showWallpaperItem && <div key={index} className="flex items-center p-0 m-0" >
                    {
                        showBackBtn && <div className="self-start mt-3 mr-1 cursor-pointer" onClick={() => setSelectedWallpaper(null)} title={dictionary['local'].return_to_list}>
                            <Reply className="h-4 w-4" />
                            <span className="sr-only">{dictionary['local'].return_to_list}</span>
                        </div>
                    }
                    <picture onClick={() => isSelected ? setSelectedWallpaper(null) : setSelectedWallpaper(singlePlaylistMode ? null : item)} className={cn([{ "cursor-pointer": !singlePlaylistMode }, "mr-2"])}>
                        <img
                            alt="Cover"
                            title={item.meta.title}
                            className={cn(["rounded-lg object-scale-cover aspect-square", { "hover:border-2 hover:border-primary": !singlePlaylistMode }
                            ])}
                            height={50}
                            src={`${item.coverUrl}?t=${Date.now()}` || "/wp-placeholder.webp"}
                            width={50}
                        />
                    </picture>
                    {
                        isSelected && <div className="flex flex-col text-sm truncate">
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
                    showPlaylistButton && <Button variant="ghost" className="hover:text-primary" title={dictionary['local'].previous_wallpaper}>
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
                {<Button variant="ghost" className="hover:text-primary" title={dictionary['local'].stop} onClick={handleStopClick}>
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
                    isPaused && <Button variant="ghost" className="hover:text-primary" title={dictionary['local'].play} onClick={handlePlayClick}>
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
                    !isPaused && <Button variant="ghost" className="hover:text-primary" title={dictionary['local'].pause} onClick={handlePauseClick}>
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
                    showPlaylistButton && <Button variant="ghost" className="hover:text-primary" title={dictionary['local'].next_wallpaper}>
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
            {selectedScreenIndex >= 0 ?
                <AudioVolumeBtn screenIndex={selectedScreenIndex} playingStatus={playingStatus} playingStatusChange={onChangePlayingStatus} />
                :
                <AudioIndexBtn playingStatus={playingStatus} playingStatusChange={onChangePlayingStatus} />
            }
            {
                showPlaylistButton && <PlaylistSheet selectedWallpaper={selectedWallpaper} />
            }
        </div>
    </div>
}
