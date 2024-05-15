import PlayingStatus from "@/lib/client/types/playing-status";
import { Wallpaper } from "@/lib/client/types/wallpaper";
import { atom } from "jotai";

//播放状态
export const playingStatusAtom = atom<PlayingStatus | null>(null);

//选中的壁纸
export const selectedWallpaperAtom = atom<Wallpaper | null>(null);