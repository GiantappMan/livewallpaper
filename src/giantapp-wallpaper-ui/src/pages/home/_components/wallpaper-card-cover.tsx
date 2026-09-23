"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Screen, Wallpaper, findPlayingWallpaper, getFileType } from "@/lib/client/types";
import { cn } from "@/lib/utils";

/** 获取可悬停预览的视频地址（视频壁纸或播放列表当前项） */
function getPreviewVideoUrl(wallpaper: Wallpaper): string | undefined {
  const target = findPlayingWallpaper(wallpaper);
  return getFileType(target.fileUrl) === "video" ? target.fileUrl : undefined;
}

/** 悬停时在封面区域静音循环播放，失败或未起播时回退静态封面 */
const HoverPreviewVideo = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    //muted 属性由 React 以 property 方式设置，个别内核下 autoPlay 不起播，显式兜底
    videoRef.current?.play().catch(() => { });
  }, []);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      onPlaying={() => setPlaying(true)}
      onError={() => setFailed(true)}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
        playing ? "opacity-100" : "opacity-0"
      )}
    />
  );
};

export const WallpaperCardCover = ({
  wallpaper,
  dictionary,
  playingStatus,
  onShow,
  onSetting,
  onDelete,
  onEdit,
  onExplore,
  onCreate,
  onCreatePlaylist,
}: {
  wallpaper: Wallpaper;
  dictionary: any;
  playingStatus: { screens: Screen[] } | null;
  onShow: (wallpaper: Wallpaper, screen: Screen | null) => void;
  onSetting: (wallpaper: Wallpaper) => void;
  onDelete: (wallpaper: Wallpaper) => void;
  onEdit: (wallpaper: Wallpaper) => void;
  onExplore: (wallpaper: Wallpaper) => void;
  onCreate: () => void;
  onCreatePlaylist: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  //删除确认框打开时阻止点击封面应用壁纸
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const previewUrl = getPreviewVideoUrl(wallpaper);

  return (
    <div className="relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!deleteDialogOpen) {
          onShow(wallpaper, null);
        }
      }}
      title={dictionary["local"].apply_to_all_screens}>
      <picture>
        <img
          alt={wallpaper?.meta.title}
          className="w-full"
          height="200"
          src={wallpaper?.coverUrl || wallpaper?.fileUrl || "/wp-placeholder.webp"}
          style={{
            aspectRatio: "300/200",
            objectFit: "cover",
          }}
          width="300"
        />
      </picture>
      <ContextMenu modal={false}>
        <ContextMenuTrigger>
          {/* 遮罩 */}
          <div className="flex flex-col justify-between">
            <div className="absolute inset-0 bg-background/80 flex flex-col justify-between opacity-0 hover:opacity-100 hover:scale-105 transition-opacity duration-500">
              {/* 悬停预览：置于遮罩背景之上、操作按钮之下 */}
              {hovered && previewUrl && <HoverPreviewVideo src={previewUrl} />}
              <div className="relative flex flex-wrap w-full justify-center">
                {
                  playingStatus?.screens && playingStatus?.screens?.length > 1 && [...playingStatus?.screens]?.map((screen, index) => {
                    return (
                      <div key={index} className="flex items-center justify-center">
                        <Button
                          onClick={(e) => {
                            onShow(wallpaper, screen);
                            e.stopPropagation();
                          }}
                          className="flex items-center justify-center hover:text-primary lg:px-3 px-1"
                          title={dictionary["local"].apply_screen_effect.replace('{0}', `${screen.deviceName}`)}
                          variant="ghost"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                            <path d="m17 8 5-5" />
                            <path d="M17 3h5v5" />
                          </svg>
                        </Button>
                      </div>
                    )
                  })
                }
              </div>
              <div className="relative flex justify-between px-2">
                <Button
                  className="px-3 flex items-center justify-center hover:text-primary"
                  title={dictionary["local"].setting}
                  variant="ghost"
                  onClick={(e) => { onSetting(wallpaper); e.stopPropagation(); }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Button>
                <div className="flex">
                  <AlertDialog onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        onClick={(e) => e.stopPropagation()}
                        className="lg:px-3 px-1 flex items-center justify-center hover:text-primary"
                        title={dictionary["local"].delete}
                        variant="ghost"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{dictionary["local"].delete_confirm}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {dictionary["local"].confirm_delete}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => {
                          e.stopPropagation();
                        }}>
                          {dictionary["local"].cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => {
                          onDelete(wallpaper);
                          e.stopPropagation();
                        }}>
                          {dictionary["local"].delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    onClick={(e) => { onEdit(wallpaper); e.stopPropagation(); }}
                    className="lg:px-3 px-1 flex items-center justify-center hover:text-primary"
                    title={dictionary["local"].edit}
                    variant="ghost">
                    <svg
                      className="h-5 w-5"
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
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </Button>
                  <Button
                    onClick={(e) => { onExplore(wallpaper); e.stopPropagation(); }}
                    className="lg:px-3 px-1 flex items-center justify-center hover:text-primary"
                    title={dictionary["local"].open_folder}
                    variant="ghost"
                  >
                    <svg
                      className=" h-5 w-5"
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
                      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={(e) => {
            onCreate();
            e.stopPropagation();
          }}>
            {dictionary["local"].create_wallpaper}
          </ContextMenuItem>
          <ContextMenuItem onClick={(e) => {
            onCreatePlaylist();
            e.stopPropagation();
          }}>
            {dictionary["local"].create_playlist}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};
