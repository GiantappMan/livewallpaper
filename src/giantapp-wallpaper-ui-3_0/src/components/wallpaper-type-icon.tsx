import { WallpaperType } from "@/lib/client/types/wallpaper";
import { FileImageIcon, FileVideoIcon, ListVideoIcon } from "lucide-react"
export const WallpaperTypeIcon = ({ type }: { type?: WallpaperType }) => {
    const className = "w-5 h-5 opacity-70 mr-2 bg-transparent";
    switch (type) {
        case WallpaperType.Img:
            return <FileImageIcon className={className} />;
        case WallpaperType.Video:
            return <FileVideoIcon className={className} />;
        case WallpaperType.Playlist:
            return <ListVideoIcon className={className} />;
        default:
            return null; // 或者返回一个默认图标
    }
};
