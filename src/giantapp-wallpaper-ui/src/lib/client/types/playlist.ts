import { Wallpaper, WallpaperMeta } from './wallpaper';

export enum PlayMode {
    //顺序播放
    Order,
    //随机播放
    Random,
    //定时切换
    Timer
}

/**
 * @deprecated
 */
export type PlaylistSetting = {
    mode: PlayMode;
    playIndex: number;
    screenIndexes: number[];
    isPaused: boolean;
    // volume: number;
}

export enum PlaylistType {
    Playlist,
    Group
}

/**
 * @deprecated
 */
export type PlaylistMeta = WallpaperMeta & {
    type: PlaylistType;
};

/**
 * @deprecated
 */
export type Playlist = {
    meta: PlaylistMeta;
    setting: PlaylistSetting;
    wallpapers: Wallpaper[];
};