import { Wallpaper, WallpaperMeta } from './wallpaper';


export enum PlayMode {
    //顺序播放
    Order,
    //随机播放
    Random,
    //定时切换
    Timer
}

export type PlaylistSetting = {
    mode: PlayMode;
    playIndex: number;
    screenIndexes: number[];
}

export type PlaylistMeta = WallpaperMeta & {
    // Add additional properties here
};

export type Playlist = {
    meta?: PlaylistMeta;
    setting?: PlaylistSetting;
    wallpapers: Wallpaper[];
};