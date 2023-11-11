"use client";

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/hooks/use-mounted";
import api from "@/lib/client/api";
import { Wallpaper } from "@/lib/client/types/wallpaper";
import { Screen } from "@/lib/client/types/screen";
import { useEffect, useState } from "react";
const Page = () => {
    const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>();
    const [screens, setScreens] = useState<Screen[] | null>();
    const mounted = useMounted()
    const refresh = async () => {
        const res = await api.getWallpapers();
        if (res.error) {
            alert(res.error);
            return;
        }
        setWallpapers(res.data);

        const screens = await api.getScreens();
        if (screens.error) {
            alert(screens.error);
            return;
        }

        if (!screens.data)
            return
        //根据bounds x坐标排序,按逗号分隔，x坐标是第一个
        let tmp = screens.data.sort((a, b) => {
            const aX = a.bounds.split(",")[0];
            const bX = b.bounds.split(",")[0];
            return parseInt(aX) - parseInt(bX);
        });

        setScreens(tmp);
        console.log(screens.data, tmp);
    }

    useEffect(() => {
        refresh();
    }, []);

    return <div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto max-h-[100vh]">
        <>
            {
                (wallpapers || Array.from({ length: 12 })).map((wallpaper, index) => {
                    if (!mounted)
                        return <Skeleton key={index} className="h-[218px] w-full" />
                    return (
                        <div key={index} className="relative group rounded overflow-hidden shadow-lg transform transition duration-500 hover:scale-105"
                        >
                            <div className="relative cursor-pointer"
                                title="使所有屏幕生效">
                                <picture>
                                    <img
                                        alt="Wallpaper 1"
                                        className="w-full"
                                        height="200"
                                        src={wallpaper?.coverPath || "/wp-placeholder.webp"}
                                        style={{
                                            aspectRatio: "300/200",
                                            objectFit: "cover",
                                        }}
                                        width="300"
                                    />
                                </picture>
                                <div className="flex flex-col justify-between">
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        <div className="flex justify-center mt-2 ">
                                            {
                                                screens && screens?.length > 1 && screens?.map((screen, index) => {
                                                    return (
                                                        <div key={index} className="flex items-center justify-center">
                                                            <Button
                                                                aria-label="Screen Icon 1"
                                                                className="m-2 flex items-center justify-center"
                                                                title={`屏幕 ${screen.deviceName} 生效`}
                                                                variant="outline"
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
                                        <div className="flex justify-between px-2 pb-2 space-x-2">
                                            <Button
                                                aria-label="Settings"
                                                className="m-2 flex items-center justify-center"
                                                title="Settings"
                                                variant="outline"
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
                                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </Button>
                                            <div className="flex ">
                                                <Button
                                                    aria-label="Delete"
                                                    className="m-2 flex items-center justify-center"
                                                    title="Delete"
                                                    variant="outline"
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
                                                        <path d="M3 6h18" />
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                    </svg>
                                                </Button>
                                                <Button aria-label="Edit" className="m-2 flex items-center justify-center" title="Edit" variant="outline">
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
                                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                        <path d="m15 5 4 4" />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    aria-label="Open Folder"
                                                    className="m-2 flex items-center justify-center"
                                                    title="Open Folder"
                                                    variant="outline"
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
                            </div>
                            <div className="px-6 py-4">
                                <div className="font-bold text-xl mb-2">{wallpaper?.meta?.title}</div>
                                <p className="text-gray-700 text-base">{wallpaper?.meta?.description}</p>
                            </div>
                        </div>
                    )
                })
            }
        </>
    </div >;
};

export default Page;
