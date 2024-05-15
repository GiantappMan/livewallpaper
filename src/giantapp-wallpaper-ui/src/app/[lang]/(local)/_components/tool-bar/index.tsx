import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper"
import { useCallback, useEffect } from "react";
import { Reply } from "lucide-react"
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PlaybackProgress from "./playback-progress";
import PlaylistSheet from "./playlist-sheet";
import api from "@/lib/client/api";
import AudioIndexBtn from "./audio-index-btn";
import AudioVolumeBtn from "./audio-volume-btn";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { canPauseAtom, getScreenIndex, isPausedAtom, isPlaylistAtom, playingStatusAtom, playingWallpapersAtom, selectedWallpaperAtom } from "@/atoms/player";
import { langDictAtom } from "@/atoms/lang";
import { toast } from "sonner";

interface ToolBarProps extends React.HTMLAttributes<HTMLElement> {
    // playingStatus: PlayingStatus
    // onChangePlayingStatus: (e?: PlayingStatus) => void
}
export function ToolBar({ /*playingStatus, onChangePlayingStatus*/ }: ToolBarProps) {
    const dictionary = useAtomValue(langDictAtom);
    const canPause = useAtomValue(canPauseAtom);
    const [playingWallpapers, setPlayingWallpapers] = useAtom(playingWallpapersAtom);
    const singlePlaylistMode = playingWallpapers.length == 1;
    const [selectedWallpaper, setSelectedWallpaper] = useAtom(selectedWallpaperAtom);
    const showPlaylistButton = useAtomValue(isPlaylistAtom);
    const isPaused = useAtomValue(isPausedAtom);
    const setPlayingStatus = useSetAtom(playingStatusAtom);

    const refreshPlayingStatus = useCallback(async () => {
        const _playingStatus = await api.getPlayingStatus();
        if (_playingStatus.error) {
            toast.error(dictionary["local"].failed_to_get_current_wallpaper)
            console.log(_playingStatus.error)
            return;
        }
        setPlayingStatus(_playingStatus.data);
    }, [dictionary, setPlayingStatus]);

    //监控wallpapers，如果只有一个，默认选中
    useEffect(() => {
        if (playingWallpapers.length == 1)
            setSelectedWallpaper(playingWallpapers[0]);
        else {
            //如果被选中的不存在了则清空
            var exist = playingWallpapers.find(x => x.fileUrl == selectedWallpaper?.fileUrl);
            if (selectedWallpaper && !exist)
                setSelectedWallpaper(null);
            if (exist)
                setSelectedWallpaper(exist);
        }
    }, [playingWallpapers, selectedWallpaper, setSelectedWallpaper]);

    const handleStopClick = useCallback(() => {
        //获取要关闭的屏幕
        api.stopWallpaper(getScreenIndex(selectedWallpaper));

        //更新playlist
        if (selectedWallpaper) {
            var index = playingWallpapers.indexOf(selectedWallpaper);
            if (index > -1) {
                var newWallpapers = [...playingWallpapers];
                newWallpapers.splice(index, 1);
                setPlayingWallpapers(newWallpapers);
            }
        }
        else {
            setPlayingWallpapers([]);
        }
    }, [playingWallpapers, selectedWallpaper, setPlayingWallpapers]);

    const handlePlayClick = useCallback(() => {
        const screeIndex = getScreenIndex(selectedWallpaper);
        api.resumeWallpaper(screeIndex);
        const wallpapers = playingWallpapers.map(x => {
            var playingWallpaper = Wallpaper.findPlayingWallpaper(x);
            if (screeIndex < 0 || playingWallpaper.runningInfo.screenIndexes[0] === screeIndex) {
                playingWallpaper.runningInfo.isPaused = false;
            }
            return x;
        });
        setPlayingWallpapers(wallpapers);
    }, [playingWallpapers, selectedWallpaper, setPlayingWallpapers]);

    const handlePauseClick = useCallback(() => {
        const screeIndex = getScreenIndex(selectedWallpaper);
        api.pauseWallpaper(screeIndex);
        const wallpapers = playingWallpapers.map(x => {
            var playingWallpaper = Wallpaper.findPlayingWallpaper(x);
            if (screeIndex < 0 || playingWallpaper.runningInfo.screenIndexes[0] === screeIndex) {
                playingWallpaper.runningInfo.isPaused = true;
            }
            return x;
        })
        setPlayingWallpapers(wallpapers);
    }, [playingWallpapers, selectedWallpaper, setPlayingWallpapers]);

    //播放列表中的下一个壁纸
    const playNextWallpaper = useCallback(async () => {
        if (selectedWallpaper)
            await api.playNextInPlaylist(selectedWallpaper);
        await refreshPlayingStatus();
    }, [refreshPlayingStatus, selectedWallpaper]);

    const playPreviousWallpaper = useCallback(async () => {
        if (selectedWallpaper)
            await api.playPrevInPlaylist(selectedWallpaper);
        await refreshPlayingStatus();
    }, [refreshPlayingStatus, selectedWallpaper]);

    return <div className="fixed inset-x-0 ml-18 bottom-0 bg-background h-20 border-t border-primary-300 dark:border-primary-600 flex items-center px-4 space-x-4">
        <div className="flex flex-wrap flex-initial w-1/4 overflow-hidden h-full">
            {playingWallpapers.map((item, index) => {
                const isSelected = selectedWallpaper == item;
                const showBackBtn = isSelected && playingWallpapers.length > 1;
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
                            src={`${item.coverUrl}?t = ${Date.now()} ` || "/wp-placeholder.webp"}
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

        <div className="flex flex-col flex-1 w-1/2">
            <div className="flex space-x-4 items-center justify-between">
                {
                    // 上一条
                    showPlaylistButton ? <Button onClick={playPreviousWallpaper} variant="ghost" className="hover:text-primary" title={dictionary['local'].previous_wallpaper}>
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
                    </Button> : <div></div>
                }
                <div>
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
                        canPause && isPaused && <Button variant="ghost" className="hover:text-primary" title={dictionary['local'].play} onClick={handlePlayClick}>
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
                        canPause && !isPaused && <Button variant="ghost" className="hover:text-primary" title={dictionary['local'].pause} onClick={handlePauseClick}>
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
                </div>
                {
                    // 下一条
                    showPlaylistButton ? <Button onClick={playNextWallpaper} variant="ghost" className="hover:text-primary" title={dictionary['local'].next_wallpaper}>
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
                    </Button> : <div></div>
                }
            </div>

            {/* 视频和播放列表显示进度 */}
            {(selectedWallpaper && (selectedWallpaper?.meta.type == WallpaperType.Video || selectedWallpaper?.meta.type == WallpaperType.Playlist) ||
                singlePlaylistMode && (playingWallpapers[0].meta.type == WallpaperType.Video || playingWallpapers[0].meta.type == WallpaperType.Playlist))
                && <PlaybackProgress screenIndex={getScreenIndex(selectedWallpaper)} />}
        </div>

        <div className="flex flex-initial w-1/4 items-center justify-end">
            {getScreenIndex(selectedWallpaper) >= 0 ?
                <>
                    {
                        canPause && <AudioVolumeBtn />
                    }
                </>
                :
                <AudioIndexBtn />
            }
            {/* {
                //播放列表按钮
                showPlaylistButton && <PlaylistSheet selectedWallpaper={selectedWallpaper} />
            } */}
        </div>
    </div>
}
