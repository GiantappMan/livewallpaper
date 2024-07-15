import { Wallpaper } from "./wallpaper";
import { Screen } from "./screen";

export default class PlayingStatus {
    public screens: Screen[] = [];
    public wallpapers: Wallpaper[] = [];
    public audioScreenIndex: number = -1;
    public volume: number = 0;
}