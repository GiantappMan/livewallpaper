"use client";

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/hooks/use-mounted";
import api from "@/lib/client/api";
import { Wallpaper, WallpaperType, getWallpaperTypeString, defaultSetting } from "@/lib/client/types";
import { Screen } from "@/lib/client/types";
import { useCallback, useEffect, useState } from "react";
import { ToolBar } from "./_components/tool-bar/index";
import { toast } from "sonner"
import Link from "@/components/link";
import { WallpaperDialog } from "./_components/wallpaper-dialog";
import { cn } from "@/lib/utils";
import { SettingDialog } from "./_components/setting-dialog";
import { WallpaperCardCover } from "./_components/wallpaper-card-cover";
import CreateWallpaperButton from "./_components/create-wallpaper-button";
import { WallpaperTypeIcon } from "@/components/wallpaper-type-icon";
import { useAtom, useAtomValue } from "jotai";
import { playingStatusAtom } from "@/atoms/player";
import { langAtom, langDictAtom } from "@/atoms/lang";

const LocalPage = () => {
  const dictionary = useAtomValue(langDictAtom);
  const lang = useAtomValue(langAtom);
  const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>();
  const [playingStatus, setPlayingStatus] = useAtom(playingStatusAtom);
  const [openCreateWallpaperDialog, setOpenCreateWallpaperDialog] = useState<boolean>(false);
  const [openSettingDialog, setOpenSettingDialog] = useState<boolean>(false);

  //当前编辑的壁纸对象
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const mounted = useMounted()

  const refreshPlayingStatus = useCallback(async () => {
    const _playingStatus = await api.getPlayingStatus();
    if (_playingStatus.error) {
      toast.error(dictionary["local"].failed_to_get_current_wallpaper)
      console.log(_playingStatus.error)
      return;
    }
    setPlayingStatus(_playingStatus.data);
  }, [dictionary, setPlayingStatus]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.getWallpapers();
      if (res.error) {
        toast.error(dictionary["local"].failed_to_get_wallpaper_list)
        return;
      }

      await refreshPlayingStatus();

      //给coverUrl增加随即参数防止缓存
      res.data?.forEach((wallpaper) => {
        if (wallpaper.coverUrl) {
          wallpaper.coverUrl += `?t=${Date.now()}`;
        }
      })

      setWallpapers(res.data);
      // setScreens(screens.data);
      // setPlayingStatus(_playingStatus.data);
    } catch (e) {
      console.log(e)
      toast.error(dictionary["local"].failed_to_get_wallpaper_list)
    }
    finally {
      setRefreshing(false);
    }
  }, [dictionary, refreshPlayingStatus]);

  const showWallpaper = useCallback(async (wallpaper: Wallpaper, screen: Screen | null) => {
    let screenIndex = playingStatus?.screens?.findIndex((s) => s.deviceName === screen?.deviceName);
    const allScreenIndexes = playingStatus?.screens?.map((_, index) => index);
    if (!allScreenIndexes)
      return;

    let screenIndexes = [];
    if (screenIndex === undefined || screenIndex < 0)
      screenIndexes = allScreenIndexes;
    else
      screenIndexes = [screenIndex];

    wallpaper.runningInfo.screenIndexes = screenIndexes;
    const res = await api.showWallpaper(wallpaper);
    if (res.error) {
      toast.error(String(res.error?.message || res.error).slice(0, 120));
      return;
    }

    refreshPlayingStatus();
  }, [playingStatus?.screens, refreshPlayingStatus]);

  useEffect(() => {
    //等待300ms，防止加载太快不好看
    setTimeout(() => {
      refresh();
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let dragCounter = 0;
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    console.log("drag over");
    e.preventDefault();
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    dragCounter++;
    console.log("drag enter");
    createWallpaper()
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    dragCounter--;
    if (dragCounter === 0) {
      // setOpenCreateWallpaperDialog(false);
      console.log("drag leave");
    }
    e.preventDefault();
  };

  const deleteWallpaper = async (wallpaper: Wallpaper) => {
    const res = await api.deleteWallpaper(wallpaper);
    if (!res.data) {
      toast.error(dictionary["local"].delete_failed);
      return;
    }
    let newWallpapers = wallpapers?.filter((item) => item.filePath !== wallpaper.filePath);
    setWallpapers(newWallpapers);
    await refreshPlayingStatus();
  }

  const handleEditWallpaper = async (wallpaper: Wallpaper) => {
    setCurrentWallpaper(wallpaper);
    setOpenCreateWallpaperDialog(true);
  }

  const settingWallpaper = async (wallpaper: Wallpaper) => {
    setCurrentWallpaper(wallpaper);
    setOpenSettingDialog(true);
  }

  const explorerWallpaper = async (wallpaper: Wallpaper) => {
    if (!wallpaper.filePath)
      return;

    const res = await api.explore(wallpaper.filePath);
    if (res.error) {
      toast.error(dictionary["local"].failed_to_open_wallpaper_folder);
      return;
    }
  }

  const createWallpaper = () => {
    setCurrentWallpaper(null);
    setOpenCreateWallpaperDialog(true);
  }

  const createPlaylist = () => {
    var wallpaper: Wallpaper = {
      meta: { type: WallpaperType.Playlist, wallpapers: [], playIndex: 0 },
      setting: defaultSetting(),
      runningInfo: { screenIndexes: [] },
    };
    setCurrentWallpaper(wallpaper);
    setOpenCreateWallpaperDialog(true);
  }

  if (!mounted || refreshing || !wallpapers)
    return <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[calc(100vh_-_var(--app-titlebar-h))] pb-20 h-ful">
      {
        Array.from({ length: 12 }).map((_, i) => {
          return <div className="flex flex-col space-y-3" key={i}>
            <Skeleton className="h-[180px] rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        })
      }
    </div>

  return <div
    onDragEnter={handleDragEnter}
    onDragLeave={handleDragLeave}
    onDragOver={handleDragOver}>
    <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto max-h-[calc(100vh_-_var(--app-titlebar-h))] pb-20 h-ful">
      {
        wallpapers.map((wallpaper, index) => {
          if (!wallpaper?.fileUrl)
            return <div key={index}></div>
          return (
            <div key={index} className="relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105">
              <WallpaperCardCover
                wallpaper={wallpaper}
                dictionary={dictionary}
                playingStatus={playingStatus}
                onShow={showWallpaper}
                onSetting={settingWallpaper}
                onDelete={deleteWallpaper}
                onEdit={handleEditWallpaper}
                onExplore={explorerWallpaper}
                onCreate={createWallpaper}
                onCreatePlaylist={createPlaylist}
              />

              <div className="px-6 pl-0 py-4">
                <div className="flex font-bold text-sm mb-2 lg:text-xl items-center" title={getWallpaperTypeString(dictionary, wallpaper.meta.type)}>
                  <WallpaperTypeIcon type={wallpaper.meta.type} />
                  {wallpaper?.meta?.title}
                </div>
                {/* <p className="text-gray-700 text-base">{wallpaper?.meta?.description}</p> */}
              </div>
            </div>
          )
        })
      }
      {/* 创建按钮 */}
      <div className={cn(["relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105",
        {
          //隐藏
          "hidden": !mounted || !wallpapers || wallpapers.length === 0,
        }])}>
        <div
          className="w-full aspect-[3/2]">
          <CreateWallpaperButton
            createWallpaper={createWallpaper} createList={createPlaylist} />
        </div>
      </div>
      {
        wallpapers &&
        wallpapers.length > 0 &&
        playingStatus?.wallpapers &&
        playingStatus?.wallpapers.length > 0 &&
        <ToolBar
        // onChangePlayingStatus={(e) => {
        //   console.log("playing status change", e)
        //   if (e)
        //     setPlayingStatus(e);
        //   else
        //     refreshPlayingStatus();
        // }}
        />
      }
    </div >
    {
      mounted && !refreshing && (!wallpapers || wallpapers.length === 0) &&
      <div className="flex items-center justify-center min-h-[calc(100vh_-_var(--app-titlebar-h))] -mt-20">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-2">{dictionary["local"].no_wallpaper_found}</h2>
          <p className="text-gray-500 mb-4">{dictionary["local"].you_can_create_wallpaper}</p>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => createWallpaper()} >
              {dictionary["local"].create_wallpaper}
            </Button>
            <Button variant="outline">
              <Link href="/settings/wallpaper">
                {dictionary["local"].modify_folder}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    }

    <WallpaperDialog
      open={openCreateWallpaperDialog}
      wallpaper={currentWallpaper}
      onChange={(e) => setOpenCreateWallpaperDialog(e)}
      createSuccess={() => {
        setOpenCreateWallpaperDialog(false)
        refresh();
      }}
      updateSuccess={(e) => {
        setOpenCreateWallpaperDialog(false)
        //只更新修改的wallpaper
        let newWallpapers = wallpapers?.map((item) => {
          if (item.filePath === e.filePath) {
            //修改cover缓存
            e.coverUrl = e.coverUrl + `?t=${Date.now()}`;
            return e;
          }
          return item;
        });
        setWallpapers(newWallpapers);
      }}
    />
    {
      currentWallpaper && <SettingDialog
        open={openSettingDialog}
        wallpaper={currentWallpaper}
        onChange={(e) => setOpenSettingDialog(e)}
        saveSuccess={(e) => {
          setOpenSettingDialog(false)
          //只更新修改的wallpaper
          let newWallpapers = wallpapers?.map((item) => {
            if (item.filePath === e.filePath) {
              return e;
            }
            return item;
          });
          setWallpapers(newWallpapers);
        }} />
    }
  </div >
};

export default LocalPage;
