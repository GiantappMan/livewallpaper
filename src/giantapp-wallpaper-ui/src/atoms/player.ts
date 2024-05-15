import PlayingStatus from "@/lib/client/types/playing-status";
import { Wallpaper, WallpaperType } from "@/lib/client/types/wallpaper";
import { atom } from "jotai";

//播放状态
export const playingStatusAtom = atom<PlayingStatus | null>(null);

//播放的壁纸
export const playingWallpapersAtom = atom((get) => {
    const playingStatus = get(playingStatusAtom);
    return playingStatus?.wallpapers || [];
},
    (_get, set, wallpapers: Wallpaper[]) => {
        set(playingStatusAtom, (prev) => {
            if (!prev) {
                return null;
            }
            return {
                ...prev,
                wallpapers,
            };
        });
    }
)

//屏幕信息
export const screensAtom = atom((get) => {
    const playingStatus = get(playingStatusAtom);
    return playingStatus?.screens || [];
});

//选中的屏幕索引
export const selectedScreenIndexAtom = atom(-1);

//音量
export const volumeAtom = atom((get) => {
    const playingStatus = get(playingStatusAtom);
    return playingStatus?.volume || 0;
},
    (_get, set, volume: number) => {
        set(playingStatusAtom, (prev) => {
            if (!prev) {
                return null;
            }
            return {
                ...prev,
                volume,
            };
        }
        );
    }
);

//音源
export const audioScreenIndexAtom = atom((get) => {
    const playingStatus = get(playingStatusAtom);
    return playingStatus?.audioScreenIndex === undefined ? -1 : playingStatus?.audioScreenIndex;
},
    (_get, set, audioScreenIndex: number) => {
        set(playingStatusAtom, (prev) => {
            if (!prev) {
                return null;
            }
            return {
                ...prev,
                audioScreenIndex,
            };
        }
        );
    }
);

//选中的壁纸
export const selectedWallpaperAtom = atom<Wallpaper | null>(null);

function supportPause(type: WallpaperType | undefined) {
    return !type || type == WallpaperType.Video || type == WallpaperType.Playlist;
}

//当前是否支持暂停
export const canPauseAtom = atom((get) => {
    const playingWallpapers = get(playingWallpapersAtom);
    const selectedWallpaper = get(selectedWallpaperAtom);
    if (selectedWallpaper && playingWallpapers.length > 0) {
        return supportPause(selectedWallpaper.meta.type);
    }

    //检查playingWallpapers中是否有支持的
    for (const wallpaper of playingWallpapers) {
        if (supportPause(wallpaper.meta.type)) {
            return true;
        }
    }

    return false;
});