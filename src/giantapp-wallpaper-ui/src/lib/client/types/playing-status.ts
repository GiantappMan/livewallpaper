import { Wallpaper } from "./wallpaper";

export default class PlayingStatus {
    public wallpapers: Wallpaper[] = [];
    public audioSourceIndex: number = -1;
    public volume: number = 0;
}